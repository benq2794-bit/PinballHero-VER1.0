const GROWTH_CONFIG = GAME_DATA.progression.characterGrowth;
const GROWTH_PATHS = GROWTH_CONFIG.paths;
const GROWTH_ELEMENTS = GAME_DATA.elements.definitions;
// 圓台素材以屬性分檔，立繪背後的底盤顏色就跟著角色屬性走。
const GROWTH_DAIS_EL = ['fire', 'water', 'thunder', 'wind', 'light', 'dark'];
let growthFor = null;
let growthViewSignature = '';
let growthHoldRepeat = null;
let growthPointerActionAt = 0;
let growthOperationBusy = false;
let growthPendingAction = null;
const growthInt = (n, min, max) => Math.max(min, Math.min(max, Math.floor(Number(n) || 0)));
const GROWTH_BASE_CAP = GROWTH_CONFIG.baseCap;
const GROWTH_MAX_CAP = GROWTH_CONFIG.maxCap;
const GROWTH_CAP_STEP = GROWTH_CONFIG.capStep;
// 上限成長 4 階：每階需要的最高 RANK（推過的最高樓層）與突破素材數量
const GROWTH_BREAK_RANKS = GROWTH_CONFIG.breakthroughRanks;
function growthExpNeed(level) { const n = Math.max(0, level - 1); return GROWTH_CONFIG.exp.base + GROWTH_CONFIG.exp.linear * n + GROWTH_CONFIG.exp.quadratic * n * n; }
function growthStatGain(ch, key) { return GROWTH_CONFIG.levelGains[key] * (CHAR_TABLE[ch && ch.id]?.powerScale || 1); }
function growthGainText(value) { return Number.isInteger(value) ? String(value) : Number(value).toFixed(1); }
function growthRank() { return Math.max(1, Math.floor(Number(rankLv) || 1)); }
function breakthroughStage(ch) { return growthInt(ch && ch.breakthrough, 0, GROWTH_BREAK_RANKS.length); }
function growthUsesBreakthroughStone(ch) { return CHAR_TABLE[ch && ch.id]?.rarity === 5; }
function growthBreakActionName(ch) { return growthUsesBreakthroughStone(ch) ? '上限突破' : '上限解放'; }
function growthBreakMaterialName(ch) { return growthUsesBreakthroughStone(ch) ? '限定突破石' : '角色碎片'; }
function growthBreakMaterialCount(ch) { return growthUsesBreakthroughStone(ch) ? (breakthroughStones?.fourStar || 0) : (ch?.shards || 0); }
function growthBreakShortName(ch) { return growthUsesBreakthroughStone(ch) ? '突破' : '解放'; }
// 星數依各角色使用的上限成長名稱顯示；未解放時整列不出現。
function earnedStarsMarkup(stage) { return '<span class="growth-star earned" aria-hidden="true">★</span>'.repeat(stage); }
function breakthroughStarsMarkup(ch) {
    const stage = breakthroughStage(ch);
    if (!stage) return '';
    const action = growthBreakActionName(ch);
    return `<div class="growth-stars compact" aria-label="${action} ${stage} 星" title="${action} ${stage}／${GROWTH_BREAK_RANKS.length} 星">${earnedStarsMarkup(stage)}</div>`;
}
// 立繪頭頂的星級：置中浮在角色上方。
function growthHeadStarsMarkup(ch) {
    const stage = breakthroughStage(ch);
    if (!stage) return '';
    return `<div class="growth-head-stars" aria-label="${growthBreakActionName(ch)} ${stage} 星">${earnedStarsMarkup(stage)}</div>`;
}
function growthCap(ch) { return Math.max(ch.lvl > GROWTH_MAX_CAP ? ch.lvl : 0, Math.min(GROWTH_MAX_CAP, GROWTH_BASE_CAP + breakthroughStage(ch) * GROWTH_CAP_STEP)); }
function talentRank(ch, key) { return growthInt(ch && ch.talents && ch.talents[key], 0, 999999); }
// 天賦點由等級與角色上限成長累積；不再設總點數或單條天賦階級上限。
function talentBudget(ch) { return Math.max(ch.growthLedger?.talentBudgetFloor || 0, GROWTH_CONFIG.talent.basePoints + Math.floor(ch.lvl / GROWTH_CONFIG.talent.pointsPerLevels) + breakthroughStage(ch)); }
function talentUsed(ch) { return Object.keys(GROWTH_PATHS).reduce((n, k) => n + talentRank(ch, k), 0); }
function growthFourStarReleaseCost(ch) {
    return CHAR_TABLE[ch && ch.id]?.rarity === 4
        ? (GROWTH_CONFIG.fourStarRelease || [])[breakthroughStage(ch)] || null
        : null;
}
function growthFiveStarBreakthroughCost(ch) {
    if (!growthUsesBreakthroughStone(ch)) return null;
    const table = CHAR_TABLE[ch.id]?.summonCategory === 'limited'
        ? GROWTH_CONFIG.limitedFiveStarBreakthrough
        : GROWTH_CONFIG.permanentFiveStarBreakthrough;
    return table?.[breakthroughStage(ch)] || null;
}
function growthBreakCost(ch) { return growthFourStarReleaseCost(ch) || growthFiveStarBreakthroughCost(ch); }
function towerMaterialName(key) {
    return ({ jelly: '果凍碎塊', blockScrap: '方塊邊角料', monsterCrystal: '魔物結晶', expeditionMedal: '境界遠征勳章', dragonWing: '赤焰龍的翅膀', shellfishTail: '蒼溟貝的尾巴', garudaBeak: '金鷺鷲的鳥喙', thunderCore: '玄雷機的核心', baphometHorn: '巴風特的逆流角飾' })[key] || key;
}
function towerMaterialCount(key) { return Math.max(0, Number(towerMaterials?.[key]) || 0); }
function growthBreakCostText(ch) {
    const cost = growthBreakCost(ch);
    if (!cost) return '';
    return Object.entries(cost).map(([key, amount]) => {
        if (key === 'shards') return `角色碎片 ×${amount}`;
        if (key === 'breakthroughStone') return `限定突破石 ×${amount}`;
        if (key === 'rainbow') return `虹彩石 ×${amount.toLocaleString('zh-TW')}`;
        if (key === 'gold') return `金幣 ×${amount.toLocaleString('zh-TW')}`;
        return `${towerMaterialName(key)} ×${amount}`;
    }).join('　');
}
function growthBreakAffordable(ch) {
    const cost = growthBreakCost(ch);
    if (!cost) return false;
    return Object.entries(cost).every(([key, amount]) => {
        if (key === 'shards') return (ch.shards || 0) >= amount;
        if (key === 'breakthroughStone') return (breakthroughStones?.fourStar || 0) >= amount;
        if (key === 'rainbow') return shardTotal >= amount;
        if (key === 'gold') return gold >= amount;
        return towerMaterialCount(key) >= amount;
    });
}

function normalizeCharacterGrowth(ch) {
    ch.lvl = growthInt(ch.lvl, 1, 999999);
    if (ch.rarityScaleVersion !== 2) {
        const character = CHAR_TABLE[ch.id];
        const scale = character?.powerScale || 1;
        // v1 存檔已套用舊倍率（常駐 1.20、限定 1.40）；轉成新倍率時只補倍率差，避免重複放大。
        const previousScale = ch.rarityScaleVersion === 1
            ? (character?.rarity === 5 ? (character.summonCategory === 'limited' ? 1.40 : 1.20) : 1)
            : 1;
        const adjustment = scale / previousScale;
        ch.baseAtk = Math.round((Number(ch.baseAtk) || character?.atk || 1) * adjustment);
        ch.maxHp = Math.round((Number(ch.maxHp) || character?.hp || 1) * adjustment);
        ch.hp = Math.round((Number(ch.hp) || ch.maxHp) * adjustment);
        ch.rarityScaleVersion = 2;
    }
    const oldNeed = Math.max(1, Number(ch.nextExp) || 100);
    const oldExp = Math.max(0, Number(ch.exp) || 0);
    if (ch.growthVersion === 2) {
        ch.exp = oldExp;
    } else {
        const v1 = ch.growthVersion === 1;
        // 舊制上限：v1＝30 + 突破×10；更早的版本只有等級
        const oldCap = v1
            ? Math.max(ch.lvl > 100 ? ch.lvl : 0, Math.min(100, growthInt(ch.legacyCap, 30, 999999) + growthInt(ch.breakthrough, 0, 7) * 10))
            : Math.max(30, Math.ceil(Math.min(ch.lvl, 100) / 10) * 10);
        // 換算成新制的解放階數，只升不降
        ch.breakthrough = growthInt(Math.ceil(Math.max(0, oldCap - GROWTH_BASE_CAP) / GROWTH_CAP_STEP), 0, GROWTH_BREAK_RANKS.length);
        ch.exp = v1 ? oldExp : Math.floor(Math.min(1, oldExp / oldNeed) * growthExpNeed(ch.lvl));
    }
    ch.legacyCap = GROWTH_BASE_CAP;
    ch.breakthrough = growthInt(ch.breakthrough, 0, GROWTH_BREAK_RANKS.length);
    ch.shards = growthInt(ch.shards, 0, 999999);
    ch.nextExp = growthExpNeed(ch.lvl);
    normalizeGrowthLedger(ch);
    if (ch.lvl >= growthCap(ch)) ch.exp = Math.min(ch.exp, ch.nextExp);
    const oldTalents = ch.talents || {};
    ch.talents = {};
    let remaining = talentBudget(ch);
    for (const key of Object.keys(GROWTH_PATHS)) {
        ch.talents[key] = Math.min(remaining, growthInt(oldTalents[key], 0, 999999));
        remaining -= ch.talents[key];
    }
    ch.growthVersion = 2;
}

function gainGrowthExp(ch, amount) {
    if (!ch || !ch.unlocked) return 0;
    ch.exp += Math.max(0, Number(amount) || 0);
    let levels = 0;
    while (ch.lvl < growthCap(ch) && ch.exp >= ch.nextExp) {
        ch.exp -= ch.nextExp;
        ch.lvl++;
        ch.baseAtk += growthStatGain(ch, 'atk');
        ch.maxHp += growthStatGain(ch, 'hp');
        ch.nextExp = growthExpNeed(ch.lvl);
        if (ch.hp > 0) ch.hp = hpMax(ch);
        levels++;
    }
    // Store one level of XP at the cap; a breakthrough can immediately use it.
    if (ch.lvl >= growthCap(ch)) ch.exp = Math.min(ch.exp, ch.nextExp);
    return levels;
}

function openGrowth(id) {
    stopGrowthContinuous();
    if (!roster[id] || !roster[id].unlocked) return;
    growthFor = id; growthViewSignature = ''; renderPage();
}
function closeGrowth() { stopGrowthContinuous(); growthFor = null; growthViewSignature = ''; renderPage(); }
function stopGrowthContinuous() {
    if (growthHoldRepeat && growthHoldRepeat.timer) clearInterval(growthHoldRepeat.timer);
    growthHoldRepeat = null;
}
function growthCanRepeat(id, kind) {
    const ch = roster[id];
    if (!ch || !ch.unlocked || growthFor !== id || ch.lvl >= growthCap(ch)) return false;
    return kind === 'high' ? highGradeExperienceCrystals > 0 : cultivationMaterials > 0;
}
function repeatGrowthOnce(id, kind, event) {
    if (!growthCanRepeat(id, kind)) { stopGrowthContinuous(); return false; }
    if (kind === 'high') cultivateGrowthCharWithHighCrystal(id, event);
    else cultivateGrowthChar(id, event);
    if (!growthCanRepeat(id, kind)) stopGrowthContinuous();
    return true;
}
function startGrowthContinuous(event, id, kind) {
    if (event.button !== 0) return;
    event.preventDefault();
    growthPointerActionAt = Date.now();
    stopGrowthContinuous();
    if (!growthCanRepeat(id, kind)) return;
    growthHoldRepeat = { id, kind, timer:0 };
    repeatGrowthOnce(id, kind, event);
    if (growthHoldRepeat) growthHoldRepeat.timer = setInterval(() => {
        const active = growthHoldRepeat;
        if (!active || !growthCanRepeat(active.id, active.kind)) { stopGrowthContinuous(); return; }
        repeatGrowthOnce(active.id, active.kind);
    }, 220);
}
function growthClickFallback(event, id, kind) {
    // 滑鼠／觸控已由 pointerdown 執行；detail=0 則是鍵盤觸發，仍保留單次操作。
    if (event.detail > 0 && Date.now() - growthPointerActionAt < 1200) { event.preventDefault(); return; }
    if (kind === 'high') cultivateGrowthCharWithHighCrystal(id, event);
    else cultivateGrowthChar(id, event);
}
if (!window.__growthHoldHandlersInstalled) {
    window.__growthHoldHandlersInstalled = true;
    window.addEventListener('pointerup', stopGrowthContinuous, true);
    window.addEventListener('pointercancel', stopGrowthContinuous, true);
    window.addEventListener('blur', stopGrowthContinuous);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopGrowthContinuous(); });
}
function refreshGrowthAfterPurchase(persist = true) {
    const body = $('pg-body'), scroll = body ? body.scrollTop : 0;
    const sheetScroll = body?.querySelector('.growth-sheet')?.scrollTop || 0;
    growthViewSignature = ''; if (persist) saveGame(); renderPage(); updateUI();
    if (body) body.scrollTop = scroll;
    const sheet = body?.querySelector('.growth-sheet');
    if (sheet) sheet.scrollTop = sheetScroll;
}
function breakthroughChar(id, event) {
    const ch = roster[id];
    if (!ch || !ch.unlocked || growthCap(ch) >= GROWTH_MAX_CAP) return;
    const usesStone = growthUsesBreakthroughStone(ch), action = growthBreakActionName(ch);
    const breakCost = growthBreakCost(ch);
    if (ch.lvl < growthCap(ch)) { hmToast(`角色必須先升到 Lv.${growthCap(ch)} 才能${action}`); return; }
    const shortKey = breakCost && Object.entries(breakCost).find(([key, amount]) => {
        if (key === 'shards') return ch.shards < amount;
        if (key === 'breakthroughStone') return (breakthroughStones?.fourStar || 0) < amount;
        if (key === 'rainbow') return shardTotal < amount;
        if (key === 'gold') return gold < amount;
        return towerMaterialCount(key) < amount;
    })?.[0];
    if (shortKey) {
        const label = shortKey === 'shards' ? '角色碎片' : shortKey === 'breakthroughStone' ? '限定突破石' : shortKey === 'rainbow' ? '虹彩石' : shortKey === 'gold' ? '金幣' : towerMaterialName(shortKey);
        hmToast(`${action}材料不足：${label} ×${breakCost[shortKey].toLocaleString('zh-TW')}`); return;
    }
    const sourceRect = event && event.currentTarget && event.currentTarget.getBoundingClientRect();
    const targetEl = typeof document !== 'undefined' ? document.querySelector('#pg-body .growth-break-target') : null;
    const targetRect = targetEl && targetEl.getBoundingClientRect();
    const oldCap = growthCap(ch);
    Object.entries(breakCost || {}).forEach(([key, amount]) => {
        if (key === 'shards') ch.shards -= amount;
        else if (key === 'breakthroughStone') breakthroughStones.fourStar -= amount;
        else if (key === 'rainbow') shardTotal -= amount;
        else if (key === 'gold') gold -= amount;
        else towerMaterials[key] -= amount;
    });
    ch.breakthrough = breakthroughStage(ch) + 1;
    const levels = gainGrowthExp(ch, 0);
    log(`🌟 <b>${charName(id)}</b> ${action}成功！等級上限 ${growthCap(ch)}（${ch.breakthrough} / ${GROWTH_BREAK_RANKS.length}），角色天賦點 +1${levels ? '，已使用預存經驗升級' : ''}。`);
    refreshGrowthAfterPurchase();
    if (sourceRect && targetRect) playBreakthroughEffect(sourceRect, targetRect, oldCap, growthCap(ch));
}

function cultivateGrowthChar(id, event) { return cultivateGrowthCrystal(id, event, false); }
function cultivateGrowthCharWithHighCrystal(id, event) { return cultivateGrowthCrystal(id, event, true); }
function cultivateGrowthCrystal(id, event, high) {
    const sourceRect = event?.currentTarget?.getBoundingClientRect();
    const targetRect = document.querySelector('#pg-body .growth-break-target')?.getBoundingClientRect();
    return runGrowthTransaction(id, ch => {
        if (ch.lvl >= growthCap(ch) || (high ? highGradeExperienceCrystals : cultivationMaterials) < 1) return null;
        const from = ch.lvl, oldAttack = atkOf(ch), oldHealth = hpMax(ch);
        const base = high ? 1000 : 100;
        const amount = typeof betaExperienceAmount === 'function' ? betaExperienceAmount(base) : base;
        normalizeGrowthLedger(ch).experience += base;
        if (high) highGradeExperienceCrystals--; else cultivationMaterials--;
        const levels = gainGrowthExp(ch, amount);
        return { from, oldAttack, oldHealth, levels, amount };
    }, (ch, result) => {
        const change = result.levels ? `｜攻擊 ${result.oldAttack} → ${atkOf(ch)}｜生命 ${result.oldHealth} → ${hpMax(ch)}` : '';
        log(`${charName(id)} 培養完成，角色經驗 +${result.amount.toLocaleString('zh-TW')}${change}。`);
        if (sourceRect && targetRect) playGrowthEffect(sourceRect, targetRect, {
            colors:high ? ['#fff0ff','#e2b8ff','#a66eff'] : ['#f0ffe8','#b8ff8a','#6cdb62'],
            ringColor:high ? '#d8b5ff' : '#a8ff83', textColor:high ? '#edcaff' : '#caffad',
            title:result.levels ? `培養成功　Lv.${result.from} → ${ch.lvl}` : '培養成功',
            subtitle:change ? change.slice(1) : `角色經驗 +${result.amount.toLocaleString('zh-TW')}`
        });
    });
}

// 解放時用獨立覆蓋 Canvas 演出素材光點吸入角色、命中後的光環與天賦點提示。
function playBreakthroughEffect(sourceRect, targetRect, oldCap, newCap) {
    playGrowthEffect(sourceRect, targetRect, {
        title:`解放成功　Lv.${oldCap} → ${newCap}`, subtitle:'角色天賦點 +1',
        colors:['#fff8d4','#f5cf65','#d9f5ff','#a5e5dd','#ffffff'],
        ringColor:'#fff1b8', textColor:'#ffe28a'
    });
}
function playGrowthEffect(sourceRect, targetRect, theme = {}) {
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    Object.assign(canvas.style, { position:'fixed', inset:'0', width:'100vw', height:'100vh', zIndex:'99999', pointerEvents:'none' });
    canvas.setAttribute('aria-hidden', 'true'); document.body.appendChild(canvas);
    ctx.scale(dpr, dpr);
    const from = { x:sourceRect.left + sourceRect.width / 2, y:sourceRect.top + sourceRect.height / 2 };
    const to = { x:targetRect.left + targetRect.width / 2, y:targetRect.top + targetRect.height / 2 };
    const colors = theme.colors || ['#fff8d4','#f5cf65','#d9f5ff','#a5e5dd','#ffffff'];
    const particles = Array.from({ length:15 }, (_, i) => ({
        delay:i * 19, size:2 + Math.random() * 2.5, color:colors[i % colors.length],
        drift:(Math.random() - .5) * 42, spin:Math.random() * Math.PI * 2
    }));
    const start = performance.now();
    function frame(now) {
        const elapsed = now - start, t = Math.min(1, elapsed / 560);
        ctx.clearRect(0, 0, w, h);
        particles.forEach(p => {
            const pt = Math.max(0, Math.min(1, (elapsed - p.delay) / 500));
            if (pt >= 1) return;
            const ease = pt * pt * (3 - 2 * pt), arc = Math.sin(pt * Math.PI) * p.drift;
            const x = from.x + (to.x - from.x) * ease + arc;
            const y = from.y + (to.y - from.y) * ease - Math.sin(pt * Math.PI) * 34;
            ctx.save(); ctx.globalAlpha = Math.min(1, (elapsed - p.delay) / 80) * (1 - pt * .25);
            ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 10;
            ctx.translate(x, y); ctx.rotate(p.spin + pt * 5);
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.8); ctx.restore();
        });
        if (elapsed > 490) {
            const burst = Math.max(0, Math.min(1, (elapsed - 490) / 390));
            ctx.save(); ctx.globalAlpha = (1 - burst) * .9; ctx.strokeStyle = theme.ringColor || '#fff1b8'; ctx.lineWidth = 3;
            ctx.shadowColor = theme.ringColor || '#fff1b8'; ctx.shadowBlur = 16; ctx.beginPath();
            ctx.arc(to.x, to.y, 8 + burst * 64, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
            ctx.save(); ctx.globalAlpha = 1 - Math.max(0, (elapsed - 560) / 520);
            ctx.textAlign = 'center'; ctx.font = 'bold 18px sans-serif'; ctx.fillStyle = theme.textColor || '#ffe28a';
            ctx.shadowColor = '#000'; ctx.shadowBlur = 4; ctx.fillText(theme.title || '培養成功', to.x, to.y - 36 - burst * 24);
            ctx.font = 'bold 15px sans-serif'; ctx.fillText(theme.subtitle || '', to.x, to.y - 12 - burst * 24); ctx.restore();
        }
        if (elapsed < 1120) requestAnimationFrame(frame); else canvas.remove();
    }
    requestAnimationFrame(frame);
}
function upgradeTalent(id, key) {
    const ch = roster[id];
    if (!ch || !ch.unlocked || !Object.hasOwn(GROWTH_PATHS, key)) return;
    if (talentUsed(ch) >= talentBudget(ch)) { hmToast(`天賦點已用完，升級或${growthBreakActionName(ch)}可增加可用點數`); return; }
    const oldCap = hpMax(ch), ratio = ch.hp / oldCap;
    ch.talents[key] = talentRank(ch, key) + 1;
    ch.hp = Math.max(ch.hp > 0 ? 1 : 0, Math.min(hpMax(ch), Math.floor(hpMax(ch) * ratio)));
    refreshGrowthAfterPurchase();
}
function resetTalents(id) {
    const ch = roster[id];
    if (!ch || !ch.unlocked || !talentUsed(ch)) return;
    const ratio = ch.hp / hpMax(ch), refund = talentUsed(ch);
    ch.talents = { skill: 0, pf: 0, survival: 0 };
    ch.hp = Math.max(ch.hp > 0 ? 1 : 0, Math.min(hpMax(ch), Math.floor(hpMax(ch) * ratio)));
    hmToast(`天賦已重配，返還 ${refund} 點天賦點`);
    refreshGrowthAfterPurchase();
}

function growthSignature(ch) { return [ch.id, ch.lvl, ch.exp, ch.shards, ch.breakthrough, shardTotal, gold, cultivationMaterials, highGradeExperienceCrystals, growthExpReserve, ch.growthLedger?.resets, breakthroughStones?.fourStar, ...Object.keys(towerMaterials || {}).map(k => towerMaterials[k]), growthRank(), ...Object.keys(GROWTH_PATHS).map(k => talentRank(ch, k))].join('|'); }
function syncGrowthView() {
    if (!growthFor || homeTabOn !== 'chars' || !roster[growthFor]) return;
    const page = $('page'), body = $('pg-body');
    if (!body || !page || page.style.display === 'none') return;
    const signature = growthSignature(roster[growthFor]);
    if (signature === growthViewSignature) return;
    if ($('pg-res')) $('pg-res').textContent = shardTotal;
    const scroll = body.scrollTop;
    body.innerHTML = renderGrowthPage(); body.scrollTop = scroll;
}
function renderGrowthPage() {
    const ch = roster[growthFor], d = ch && CHAR_TABLE[ch.id];
    if (!ch || !d || !ch.unlocked) { growthFor = null; return pageChars(); }
    growthViewSignature = growthSignature(ch);
    const cap = growthCap(ch), used = talentUsed(ch), budget = talentBudget(ch);
    const breakStage = breakthroughStage(ch);
    const maxed = cap >= GROWTH_MAX_CAP;
    const capped = ch.lvl >= cap;
    const breakAction = growthBreakActionName(ch), breakMaterial = growthBreakMaterialName(ch), breakMaterialCount = growthBreakMaterialCount(ch), usesBreakStone = growthUsesBreakthroughStone(ch);
    const breakCost = growthBreakCost(ch), breakCostText = growthBreakCostText(ch), breakAffordable = growthBreakAffordable(ch);
    const breakDisabled = maxed || !capped || !breakAffordable;
    const breakHint = maxed ? `已達 ${GROWTH_MAX_CAP}`
        : !capped ? `先升至 Lv.${cap}｜${breakCostText}` : breakCostText;
    const materials = typeof cultivationMaterials === 'number' ? cultivationMaterials : 0;
    const highMaterials = typeof highGradeExperienceCrystals === 'number' ? highGradeExperienceCrystals : 0;
    const normalExp = typeof betaExperienceAmount === 'function' ? betaExperienceAmount(100) : 100;
    const highExp = typeof betaExperienceAmount === 'function' ? betaExperienceAmount(1000) : 1000;
    const resetQuote = growthResetQuote(ch);
    const canUpgrade = count => !!growthUpgradeQuote(ch, count);
    // 圓台與徽章都取自角色自己的屬性，沒有對應素材時退回風屬性的圓台。
    const el = GROWTH_DAIS_EL.includes(d.element) ? d.element : 'wind', elInfo = GROWTH_ELEMENTS[el];
    const skill = talentRank(ch, 'skill'), pf = talentRank(ch, 'pf'), survival = talentRank(ch, 'survival');
    return `<div class="growth-who">
        <button class="mini-btn gray growth-back" onclick="closeGrowth()">‹ 返回角色</button></div>
    <div class="growth-stage">
        <div class="growth-halo"></div>
        <img class="growth-dais" src="asset/ui/growth-dais/${el}.png" alt="${elInfo.label}屬性圓台">
        <div class="growth-ring"></div>
        <div class="growth-break-target">${unitFace(d.unit, d.rarity, 'walk_front', d.name.slice(0, 1))}</div>${growthHeadStarsMarkup(ch)}
        <div class="growth-head-id"><span class="growth-name">${d.name}</span><span class="element-badge ${elInfo.cls}" aria-label="${d.name}是${elInfo.label}屬性" title="${elInfo.label}屬性">${elInfo.label}</span></div></div>
    <div class="growth-sheet">
        <div class="growth-break-row">
            <div class="growth-break-left">${breakthroughStarsMarkup(ch)}</div>
            <div class="growth-break-meta" aria-label="${breakAction} ${breakStage}/${GROWTH_BREAK_RANKS.length} 星">${usesBreakStone ? `${breakMaterial} <i>${breakMaterialCount}</i>` : `角色碎片 <i>${ch.shards}</i>`}｜上限 <i>${maxed ? cap : `${cap}→${Math.min(GROWTH_MAX_CAP, cap + GROWTH_CAP_STEP)}`}</i></div></div>
        <div class="growth-band">
            <div><small>LV</small><b>${ch.lvl}<u>/${cap}</u></b></div>
            <div><small>HP</small><b>${hpMax(ch)}</b></div>
            <div><small>攻擊</small><b>${atkOf(ch)}</b></div>
            <div><small>${growthBreakShortName(ch)}</small><b>${breakStage}<u>/${GROWTH_BREAK_RANKS.length}</u></b></div>
            <div><small>天賦點</small><b>${used}<u>/${budget}</u></b></div></div>
        <div class="growth-exp">
            <div class="growth-exp-head"><b>${capped ? (maxed ? '已達最高等級' : `已達等級上限，請先${breakAction}`) : `經驗 ${Math.floor(ch.exp)} / ${ch.nextExp}`}</b><span>每級 攻擊 +${growthGainText(growthStatGain(ch, 'atk'))}｜生命 +${growthGainText(growthStatGain(ch, 'hp'))}</span></div>
            <div class="growth-track"><i class="growth-fill${capped ? ' full' : ''}" style="width:${Math.min(100, ch.exp / ch.nextExp * 100)}%"></i></div></div>
        <div class="growth-batch-acts">
            <button type="button" class="growth-batch-single" onclick="upgradeGrowthLevels('${ch.id}',1)" ${!canUpgrade(1) ? 'disabled' : ''}>升級</button>
            <button type="button" class="growth-batch-ten" onclick="upgradeGrowthLevels('${ch.id}',10)" ${!canUpgrade(10) ? 'disabled' : ''}>⚡ 升級 ×10</button>
            <button type="button" class="growth-batch-cap" onclick="openGrowthActionDialog('${ch.id}','cap')" ${!canUpgrade('cap') ? 'disabled' : ''}>🚀 一鍵升至上限</button>
        </div><div class="growth-refund-row"><span>返還經驗 <b>${growthExpReserve.toLocaleString('zh-TW')}</b></span><button type="button" onclick="openGrowthActionDialog('${ch.id}','reset')" ${resetQuote.error ? 'disabled' : ''}>🔄 重置等級（${3 - ch.growthLedger.resets}/3）</button></div>
        <p class="growth-reset-notice">${resetQuote.error || '重置返還實際投入的培養經驗與金幣各 80%；剩餘經驗可繼續升級。'}</p>
        <div class="growth-acts">
            <button class="growth-act gold" ${!materials || capped ? 'disabled' : ''} onpointerdown="startGrowthContinuous(event,'${ch.id}','normal')" onclick="growthClickFallback(event,'${ch.id}','normal')" title="按住左鍵連續強化，放開停止"><b>經驗水晶強化</b><small>${capped ? `需先${breakAction}` : `+${normalExp.toLocaleString('zh-TW')} 經驗｜持有 ${materials}｜按住連續強化`}</small></button>
            <button class="growth-act high-crystal" ${!highMaterials || capped ? 'disabled' : ''} onpointerdown="startGrowthContinuous(event,'${ch.id}','high')" onclick="growthClickFallback(event,'${ch.id}','high')" title="按住左鍵連續強化，放開停止"><b>高階水晶強化</b><small>${capped ? `需先${breakAction}` : `+${highExp.toLocaleString('zh-TW')} 經驗｜持有 ${highMaterials}｜按住連續強化`}</small></button>
            <button class="growth-act breakthrough" ${breakDisabled ? 'disabled' : ''} onclick="breakthroughChar('${ch.id}',event)"><b>${breakAction}</b><small>${breakHint}</small></button></div>
        <div class="growth-talents">
            <div class="growth-sec"><div class="growth-sec-title"><b>角色天賦</b><span>${used} / ${budget} 點</span></div>
                <button class="growth-reset" ${used ? '' : 'disabled'} onclick="resetTalents('${ch.id}')">重置 · 返還 ${used} 點</button></div>
            ${Object.entries(GROWTH_PATHS).map(([key, p]) => { const rank = talentRank(ch, key); return `<div class="growth-path"><div><b>${p.icon} ${p.name}<u>${rank}</u></b><div class="sub">${p.desc}</div></div>
                <button class="growth-talent-plus" aria-label="${p.name}天賦加一點" title="消耗 1 點天賦點" ${used >= budget ? 'disabled' : ''} onclick="upgradeTalent('${ch.id}','${key}')">＋</button></div>`; }).join('')}
            <div class="growth-eff" title="天賦點隨等級與${breakAction}增加；PF 效果以隊長天賦為準。">目前：技能傷害 +${skill * 6}%／治療 +${skill * 2}%・PF 效果 +${pf * 8}%・生命 +${survival * 4}%／減傷 ${survival}%</div></div></div>`;
}
function normalizeGrowthLedger(ch) {
    const ledger = ch.growthLedger;
    const valid = ledger?.version === 1 &&
        ['experience', 'gold', 'resets', 'talentBudgetFloor'].every(key => Number.isSafeInteger(ledger[key]) && ledger[key] >= 0) &&
        ledger.resets <= 3 && Number.isFinite(ledger.baseAtk) && ledger.baseAtk > 0 &&
        Number.isFinite(ledger.baseHp) && ledger.baseHp > 0;
    if (valid) {
        ledger.complete = ledger.complete === true;
        return ledger;
    }
    ch.growthLedger = { version:1, complete:false, experience:0, gold:0, resets:0,
        baseAtk:ch.baseAtk, baseHp:ch.maxHp, talentBudgetFloor:0 };
    return ch.growthLedger;
}

function growthResourceKey(character, wallet) {
    return JSON.stringify({
        lvl:character.lvl, exp:character.exp, breakthrough:character.breakthrough,
        baseAtk:character.baseAtk, maxHp:character.maxHp, talents:character.talents,
        ledger:character.growthLedger, reserve:wallet.growthExpReserve || 0,
        normal:wallet.cultivationMaterials || 0, high:wallet.highGradeExperienceCrystals || 0, gold:wallet.gold || 0
    });
}

function growthCurrentWallet() {
    return { growthExpReserve, cultivationMaterials, highGradeExperienceCrystals, gold };
}

function growthResetQuote(ch) {
    const ledger = normalizeGrowthLedger(ch);
    if (!ledger.complete) return { error:'舊存檔缺少完整培養消耗紀錄，暫時無法安全返還資源。' };
    if (ledger.resets >= 3) return { error:'此角色已用完 3 次等級重置。' };
    if (ch.lvl === 1 && !ch.exp && !ledger.experience && !ledger.gold) return { error:'角色目前尚無可重置的等級或培養投入。' };
    const experience = Number(BigInt(ledger.experience) * 4n / 5n);
    const money = Number(BigInt(ledger.gold) * 4n / 5n);
    if (!Number.isSafeInteger(growthExpReserve + experience) || gold + money > 9999999999)
        return { error:'返還後的持有資源將超過可儲存範圍，請先使用部分資源。' };
    return { experience, gold:money, remaining:3 - ledger.resets };
}

function growthUpgradeQuote(ch, count) {
    if (!ch?.unlocked || ch.lvl >= growthCap(ch)) return null;
    const target = count === 'cap' ? growthCap(ch) : Math.min(growthCap(ch), ch.lvl + count);
    let needed = -ch.exp;
    for (let level = ch.lvl; level < target; level++) needed += growthExpNeed(level);
    needed = Math.max(0, needed);
    const multiplier = typeof betaExperienceAmount === 'function' ? betaExperienceAmount(1) : 1;
    const spent = Math.ceil(needed / multiplier);
    const reserve = Math.min(growthExpReserve, spent);
    const remainder = spent - reserve;
    const high = Math.max(0, Math.ceil((remainder - cultivationMaterials * 100) / 1000));
    const normal = Math.max(0, Math.ceil((remainder - high * 1000) / 100));
    if (normal > cultivationMaterials || high > highGradeExperienceCrystals) return null;
    return { target, needed, multiplier, spent, reserve, normal, high,
        change:reserve + normal * 100 + high * 1000 - spent };
}

async function runGrowthTransaction(id, change, onSuccess) {
    if (growthOperationBusy || typeof GATE_MODE !== 'undefined' && GATE_MODE) return false;
    growthOperationBusy = true;
    const execute = () => {
        const ch = roster[id];
        if (!ch?.unlocked) return false;
        const saved = saveStore.read();
        if (!saved.ok && saved.note) {
            hmToast('目前無法讀取存檔，請先確認存檔狀態再操作培養。');
            return false;
        }
        if (saved.ok && saved.data.roster?.[id] &&
            growthResourceKey(saved.data.roster[id], saved.data) !== growthResourceKey(ch, growthCurrentWallet())) {
            hmToast('培養資料已在其他頁面更新，請重新載入後再操作。');
            return false;
        }
        const previous = structuredClone({ ch, wallet:growthCurrentWallet() });
        let result;
        try {
            result = change(ch);
            if (!result) return false;
            if (!saveGame()) throw new Error('儲存失敗，本次扣款或返還已還原。');
        } catch (error) {
            Object.keys(ch).forEach(key => delete ch[key]);
            Object.assign(ch, previous.ch);
            ({ growthExpReserve, cultivationMaterials, highGradeExperienceCrystals, gold } = previous.wallet);
            hmToast(error.message);
            refreshGrowthAfterPurchase(false);
            return false;
        }
        if (onSuccess) onSuccess(ch, result);
        refreshGrowthAfterPurchase(false);
        return true;
    };
    try {
        if (typeof navigator !== 'undefined' && navigator.locks)
            return await navigator.locks.request('pinball-character-growth', execute);
        return execute();
    } finally {
        growthOperationBusy = false;
    }
}

function upgradeGrowthLevels(id, count = 1, expected = null) {
    stopGrowthContinuous();
    if (![1, 10, 'cap'].includes(count)) return;
    return runGrowthTransaction(id, ch => {
        if (expected && growthResourceKey(ch, growthCurrentWallet()) !== expected) throw new Error('資源或角色狀態已改變，請重新確認。');
        const quote = growthUpgradeQuote(ch, count);
        if (!quote) return null;
        const ledger = normalizeGrowthLedger(ch);
        const from = ch.lvl;
        cultivationMaterials -= quote.normal;
        highGradeExperienceCrystals -= quote.high;
        growthExpReserve = growthExpReserve - quote.reserve + quote.change;
        ledger.experience += quote.spent;
        gainGrowthExp(ch, quote.spent * quote.multiplier);
        return { from, quote };
    }, (ch, { from }) => {
        hmToast(`${charName(id)}　Lv.${from} → Lv.${ch.lvl}`);
        log(`培養升級：${charName(id)} Lv.${from} → Lv.${ch.lvl}。`);
    });
}

function resetGrowthLevel(id, expected) {
    stopGrowthContinuous();
    return runGrowthTransaction(id, ch => {
        if (growthResourceKey(ch, growthCurrentWallet()) !== expected) throw new Error('角色或資源狀態已改變，請重新確認。');
        const quote = growthResetQuote(ch);
        if (quote.error) throw new Error(quote.error);
        const ledger = ch.growthLedger;
        ledger.talentBudgetFloor = talentBudget(ch);
        ledger.resets++;
        ledger.experience = 0;
        ledger.gold = 0;
        ch.lvl = 1;
        ch.exp = 0;
        ch.nextExp = growthExpNeed(1);
        ch.baseAtk = ledger.baseAtk;
        ch.maxHp = ledger.baseHp;
        if (ch.hp > 0) ch.hp = hpMax(ch);
        growthExpReserve += quote.experience;
        gold += quote.gold;
        return quote;
    }, (ch, quote) => {
        hmToast(`已重置為 Lv.1，返還 ${quote.experience.toLocaleString('zh-TW')} 培養經驗、${quote.gold.toLocaleString('zh-TW')} 金幣。`);
    });
}

function closeGrowthActionDialog() {
    growthPendingAction = null;
    document.getElementById('growth-action-dialog')?.close();
}

function openGrowthActionDialog(id, kind) {
    stopGrowthContinuous();
    const ch = roster[id];
    if (!ch?.unlocked || growthOperationBusy || !['cap', 'reset'].includes(kind)) return;
    const quote = kind === 'reset' ? growthResetQuote(ch) : growthUpgradeQuote(ch, 'cap');
    if (!quote || quote.error) { hmToast(quote?.error || '資源不足，無法升至目前等級上限。'); return; }
    let dialog = document.getElementById('growth-action-dialog');
    if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'growth-action-dialog';
        dialog.className = 'growth-action-dialog';
        dialog.setAttribute('aria-labelledby', 'growth-action-dialog-title');
        dialog.addEventListener('cancel', () => { growthPendingAction = null; });
        document.getElementById('app-frame').appendChild(dialog);
    }
    const reset = kind === 'reset';
    const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
    growthPendingAction = { id, kind, expected:growthResourceKey(ch, growthCurrentWallet()) };
    dialog.innerHTML = `<form method="dialog" onsubmit="event.preventDefault();confirmGrowthAction()">
        <small>CHARACTER TRAINING</small><h2 id="growth-action-dialog-title">${reset ? '確認重置等級' : '確認升至上限'}</h2>
        <p class="growth-dialog-character">${escape(charName(id))}</p>
        <div class="growth-dialog-level"><b>Lv.${ch.lvl}</b><span>→</span><b>Lv.${reset ? 1 : quote.target}</b></div>
        ${reset ? `<dl><div><dt>返還培養經驗</dt><dd>${quote.experience.toLocaleString('zh-TW')}</dd></div><div><dt>返還金幣</dt><dd>${quote.gold.toLocaleString('zh-TW')}</dd></div><div><dt>重置剩餘次數</dt><dd>${quote.remaining} → ${quote.remaining - 1}</dd></div></dl>
        <p class="growth-dialog-warning">將損失 20% 已投入資源。星級、突破與天賦進度保留。</p><p>經驗存入「返還經驗」，可用於升級。返還以實際使用的水晶原始經驗計算，封測額外加成不計入投入；現有水晶強化不扣金幣，因此該部分金幣返還為 0。</p>`
        : `<dl><div><dt>使用返還經驗</dt><dd>${quote.reserve.toLocaleString('zh-TW')}</dd></div><div><dt>經驗水晶</dt><dd>×${quote.normal}</dd></div><div><dt>高階水晶</dt><dd>×${quote.high}</dd></div><div><dt>金幣</dt><dd>0</dd></div></dl>
        <p>升至目前已解鎖上限。水晶未用完的 ${quote.change.toLocaleString('zh-TW')} 經驗轉入返還經驗。</p>`}
        <div class="growth-dialog-actions"><button type="button" onclick="closeGrowthActionDialog()">取消</button><button type="submit" class="growth-dialog-confirm">${reset ? '確認重置' : '確認升級'}</button></div></form>`;
    dialog.showModal();
    dialog.querySelector('button[type="button"]').focus();
}

function confirmGrowthAction() {
    const pending = growthPendingAction;
    if (!pending || growthOperationBusy) return;
    closeGrowthActionDialog();
    if (pending.kind === 'reset') return resetGrowthLevel(pending.id, pending.expected);
    return upgradeGrowthLevels(pending.id, 'cap', pending.expected);
}
