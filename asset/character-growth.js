const GROWTH_CONFIG = GAME_DATA.progression.characterGrowth;
const GROWTH_PATHS = GROWTH_CONFIG.paths;
const GROWTH_ELEMENTS = GAME_DATA.elements.definitions;
// 圓台素材以屬性分檔，立繪背後的底盤顏色就跟著角色屬性走。
const GROWTH_DAIS_EL = ['fire', 'water', 'thunder', 'wind', 'light', 'dark'];
let growthFor = null;
let growthViewSignature = '';
const growthInt = (n, min, max) => Math.max(min, Math.min(max, Math.floor(Number(n) || 0)));
const GROWTH_BASE_CAP = GROWTH_CONFIG.baseCap;
const GROWTH_MAX_CAP = GROWTH_CONFIG.maxCap;
const GROWTH_CAP_STEP = GROWTH_CONFIG.capStep;
// 上限解放 4 階：每階需要的最高 RANK（推過的最高樓層）與碎片
const GROWTH_BREAK_RANKS = GROWTH_CONFIG.breakthroughRanks;
const GROWTH_BREAK_SHARDS = GROWTH_CONFIG.breakthroughShards;
function growthExpNeed(level) { const n = Math.max(0, level - 1); return GROWTH_CONFIG.exp.base + GROWTH_CONFIG.exp.linear * n + GROWTH_CONFIG.exp.quadratic * n * n; }
function growthStatGain(ch, key) { return GROWTH_CONFIG.levelGains[key] * (CHAR_TABLE[ch && ch.id]?.powerScale || 1); }
function growthGainText(value) { return Number.isInteger(value) ? String(value) : Number(value).toFixed(1); }
function growthRank() { return Math.max(1, Math.floor(Number(rankLv) || 1)); }
function breakthroughStage(ch) { return growthInt(ch && ch.breakthrough, 0, GROWTH_BREAK_RANKS.length); }
// 星數就是上限解放次數，解放／超限解放的字樣不再顯示；未解放時整列不出現。
function earnedStarsMarkup(stage) { return '<span class="growth-star earned" aria-hidden="true">★</span>'.repeat(stage); }
function breakthroughStarsMarkup(ch) {
    const stage = breakthroughStage(ch);
    if (!stage) return '';
    return `<div class="growth-stars compact" aria-label="上限解放 ${stage} 星" title="上限解放 ${stage}／${GROWTH_BREAK_RANKS.length} 星">${earnedStarsMarkup(stage)}</div>`;
}
// 立繪頭頂的星級：置中浮在角色上方。
function growthHeadStarsMarkup(stage) {
    if (!stage) return '';
    return `<div class="growth-head-stars" aria-label="上限解放 ${stage} 星">${earnedStarsMarkup(stage)}</div>`;
}
function growthCap(ch) { return Math.max(ch.lvl > GROWTH_MAX_CAP ? ch.lvl : 0, Math.min(GROWTH_MAX_CAP, GROWTH_BASE_CAP + breakthroughStage(ch) * GROWTH_CAP_STEP)); }
function talentRank(ch, key) { return growthInt(ch && ch.talents && ch.talents[key], 0, 999999); }
// 天賦點由等級與上限解放累積；不再設總點數或單條天賦階級上限。
function talentBudget(ch) { return GROWTH_CONFIG.talent.basePoints + Math.floor(ch.lvl / GROWTH_CONFIG.talent.pointsPerLevels) + breakthroughStage(ch); }
function talentUsed(ch) { return Object.keys(GROWTH_PATHS).reduce((n, k) => n + talentRank(ch, k), 0); }
function breakthroughRankNeed(ch) { return GROWTH_BREAK_RANKS[breakthroughStage(ch)]; }
function breakthroughCost(ch) { return GROWTH_BREAK_SHARDS[breakthroughStage(ch)]; }

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
    if (!roster[id] || !roster[id].unlocked) return;
    growthFor = id; growthViewSignature = ''; renderPage();
}
function closeGrowth() { growthFor = null; growthViewSignature = ''; renderPage(); }
function refreshGrowthAfterPurchase() {
    const body = $('pg-body'), scroll = body ? body.scrollTop : 0;
    growthViewSignature = ''; saveGame(); renderPage(); updateUI();
    if (body) body.scrollTop = scroll;
}
function breakthroughChar(id, event) {
    const ch = roster[id];
    if (!ch || !ch.unlocked || growthCap(ch) >= GROWTH_MAX_CAP) return;
    const need = breakthroughRankNeed(ch);
    if (growthRank() < need) { hmToast(`上限解放需要 RANK ${need}，目前 RANK ${growthRank()}`); return; }
    const cost = breakthroughCost(ch);
    if (ch.shards < cost) { hmToast(`上限解放需要 ${cost} 片，目前 ${ch.shards} 片`); return; }
    const sourceRect = event && event.currentTarget && event.currentTarget.getBoundingClientRect();
    const targetEl = typeof document !== 'undefined' ? document.querySelector('#pg-body .growth-break-target') : null;
    const targetRect = targetEl && targetEl.getBoundingClientRect();
    const oldCap = growthCap(ch);
    ch.shards -= cost; ch.breakthrough = breakthroughStage(ch) + 1;
    const levels = gainGrowthExp(ch, 0);
    log(`🌟 <b>${charName(id)}</b> 上限解放！等級上限 ${growthCap(ch)}（${ch.breakthrough} / ${GROWTH_BREAK_RANKS.length}），角色天賦點 +1${levels ? '，已使用預存經驗升級' : ''}。`);
    refreshGrowthAfterPurchase();
    if (sourceRect && targetRect) playBreakthroughEffect(sourceRect, targetRect, oldCap, growthCap(ch));
}

function cultivateGrowthChar(id, event) {
    const ch = roster[id];
    if (!ch || !ch.unlocked || typeof cultivationMaterials !== 'number' || cultivationMaterials < 1) return;
    if (ch.lvl >= growthCap(ch)) { hmToast('角色已達目前等級上限，請先上限解放'); return; }
    const sourceRect = event && event.currentTarget && event.currentTarget.getBoundingClientRect();
    const targetEl = typeof document !== 'undefined' ? document.querySelector('#pg-body .growth-break-target') : null;
    const targetRect = targetEl && targetEl.getBoundingClientRect();
    const oldLevel = ch.lvl;
    cultivationMaterials--;
    const levels = gainGrowthExp(ch, 100);
    log(`🧪 ${charName(id)} 培養完成，角色經驗 +100${levels ? `，升級 ${levels} 級` : ''}。`);
    refreshGrowthAfterPurchase();
    if (sourceRect && targetRect) playGrowthEffect(sourceRect, targetRect, {
        colors:['#f0ffe8','#b8ff8a','#6cdb62','#d9ffd1','#ffffff'],
        ringColor:'#a8ff83', textColor:'#caffad',
        title:levels ? `培養成功　Lv.${oldLevel} → ${ch.lvl}` : '培養成功',
        subtitle:'角色經驗 +100'
    });
}

function cultivateGrowthCharWithHighCrystal(id, event) {
    const ch = roster[id];
    if (!ch || !ch.unlocked || highGradeExperienceCrystals < 1) return;
    if (ch.lvl >= growthCap(ch)) { hmToast('角色已達目前等級上限，請先上限解放'); return; }
    const sourceRect = event && event.currentTarget && event.currentTarget.getBoundingClientRect();
    const targetEl = typeof document !== 'undefined' ? document.querySelector('#pg-body .growth-break-target') : null;
    const targetRect = targetEl && targetEl.getBoundingClientRect();
    const oldLevel = ch.lvl;
    highGradeExperienceCrystals--;
    const levels = gainGrowthExp(ch, 1000);
    log(`💎 ${charName(id)} 使用高階經驗水晶，角色經驗 +1,000${levels ? `，升級 ${levels} 級` : ''}。`);
    refreshGrowthAfterPurchase();
    if (sourceRect && targetRect) playGrowthEffect(sourceRect, targetRect, {
        colors:['#fff0ff','#e2b8ff','#a66eff','#d8c7ff','#ffffff'],
        ringColor:'#d8b5ff', textColor:'#edcaff',
        title:levels ? `強化成功　Lv.${oldLevel} → ${ch.lvl}` : '高階培養成功',
        subtitle:'角色經驗 +1,000'
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
    if (talentUsed(ch) >= talentBudget(ch)) { hmToast('天賦點已用完，升級或上限解放可增加可用點數'); return; }
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

function growthSignature(ch) { return [ch.id, ch.lvl, ch.exp, ch.shards, ch.breakthrough, shardTotal, growthRank(), ...Object.keys(GROWTH_PATHS).map(k => talentRank(ch, k))].join('|'); }
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
    const breakStage = breakthroughStage(ch), need = breakthroughRankNeed(ch), cost = breakthroughCost(ch);
    const rank = growthRank(), maxed = cap >= GROWTH_MAX_CAP, rankOk = maxed || rank >= need;
    const capped = ch.lvl >= cap;
    const materials = typeof cultivationMaterials === 'number' ? cultivationMaterials : 0;
    const highMaterials = typeof highGradeExperienceCrystals === 'number' ? highGradeExperienceCrystals : 0;
    // 圓台與徽章都取自角色自己的屬性，沒有對應素材時退回風屬性的圓台。
    const el = GROWTH_DAIS_EL.includes(d.element) ? d.element : 'wind', elInfo = GROWTH_ELEMENTS[el];
    const skill = talentRank(ch, 'skill'), pf = talentRank(ch, 'pf'), survival = talentRank(ch, 'survival');
    return `<div class="growth-who">
        <button class="mini-btn gray growth-back" onclick="closeGrowth()">‹ 返回角色</button></div>
    <div class="growth-stage">
        <div class="growth-halo"></div>
        <img class="growth-dais" src="asset/ui/growth-dais/${el}.png" alt="${elInfo.label}屬性圓台">
        <div class="growth-ring"></div>
        <div class="growth-break-target">${unitFace(d.unit, d.rarity, 'walk_front', d.name.slice(0, 1))}</div>${growthHeadStarsMarkup(breakStage)}
        <div class="growth-head-id"><span class="growth-name">${d.name}</span><span class="element-badge ${elInfo.cls}" aria-label="${d.name}是${elInfo.label}屬性" title="${elInfo.label}屬性">${elInfo.label}</span></div></div>
    <div class="growth-sheet">
        <div class="growth-break-row">
            <div class="growth-break-left">${breakthroughStarsMarkup(ch)}</div>
            <div class="growth-break-meta" aria-label="上限解放 ${breakStage}/${GROWTH_BREAK_RANKS.length} 星">碎片 <i>${ch.shards}</i>｜RANK <i>${rank}</i>｜上限 <i>${maxed ? cap : `${cap}→${Math.min(GROWTH_MAX_CAP, cap + GROWTH_CAP_STEP)}`}</i></div></div>
        <div class="growth-band">
            <div><small>LV</small><b>${ch.lvl}<u>/${cap}</u></b></div>
            <div><small>HP</small><b>${hpMax(ch)}</b></div>
            <div><small>攻擊</small><b>${atkOf(ch)}</b></div>
            <div><small>解放</small><b>${breakStage}<u>/${GROWTH_BREAK_RANKS.length}</u></b></div>
            <div><small>天賦點</small><b>${used}<u>/${budget}</u></b></div></div>
        <div class="growth-exp">
            <div class="growth-exp-head"><b>${capped ? (maxed ? '已達最高等級' : '已達等級上限，請先上限解放') : `經驗 ${Math.floor(ch.exp)} / ${ch.nextExp}`}</b><span>每級 攻擊 +${growthGainText(growthStatGain(ch, 'atk'))}｜生命 +${growthGainText(growthStatGain(ch, 'hp'))}</span></div>
            <div class="growth-track"><i class="growth-fill${capped ? ' full' : ''}" style="width:${Math.min(100, ch.exp / ch.nextExp * 100)}%"></i></div></div>
        <div class="growth-acts">
            <button class="growth-act gold" ${!materials || capped ? 'disabled' : ''} onclick="cultivateGrowthChar('${ch.id}',event)"><b>經驗水晶強化</b><small>${capped ? '需先上限解放' : `+100 經驗｜持有 ${materials}`}</small></button>
            <button class="growth-act high-crystal" ${!highMaterials || capped ? 'disabled' : ''} onclick="cultivateGrowthCharWithHighCrystal('${ch.id}',event)"><b>高階水晶強化</b><small>${capped ? '需先上限解放' : `+1,000 經驗｜持有 ${highMaterials}`}</small></button>
            <button class="growth-act breakthrough" ${maxed || !rankOk || ch.shards < cost ? 'disabled' : ''} onclick="breakthroughChar('${ch.id}',event)"><b>上限解放</b><small>${maxed ? `已達 ${GROWTH_MAX_CAP}` : !rankOk ? `需 RANK ${need}` : `解放 · ${cost} 片`}</small></button></div>
        <div class="growth-talents">
            <div class="growth-sec"><div class="growth-sec-title"><b>角色天賦</b><span>${used} / ${budget} 點</span></div>
                <button class="growth-reset" ${used ? '' : 'disabled'} onclick="resetTalents('${ch.id}')">重置 · 返還 ${used} 點</button></div>
            ${Object.entries(GROWTH_PATHS).map(([key, p]) => { const rank = talentRank(ch, key); return `<div class="growth-path"><div><b>${p.icon} ${p.name}<u>${rank}</u></b><div class="sub">${p.desc}</div></div>
                <button class="growth-talent-plus" aria-label="${p.name}天賦加一點" title="消耗 1 點天賦點" ${used >= budget ? 'disabled' : ''} onclick="upgradeTalent('${ch.id}','${key}')">＋</button></div>`; }).join('')}
            <div class="growth-eff">目前：技能傷害 +${skill * 6}%／治療 +${skill * 2}%・PF 效果 +${pf * 8}%・生命 +${survival * 4}%／減傷 ${survival}%。天賦點隨等級與上限解放增加，PF 以隊長天賦為準。</div></div></div>`;
}
