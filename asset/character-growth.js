const GROWTH_PATHS = {
    skill: { name: '技能', icon: '✦', desc: '每階技能傷害 +6%、技能治療量 +2%' },
    pf: { name: '強力彈射', icon: '⚡', desc: '每階 PF 傷害與應援攻擊加成效果 +8%' },
    survival: { name: '生存', icon: '🛡', desc: '每階最大生命 +4%、受到傷害 -1%' }
};
let growthFor = null;
let growthViewSignature = '';
const growthInt = (n, min, max) => Math.max(min, Math.min(max, Math.floor(Number(n) || 0)));
const GROWTH_BASE_CAP = 80;
const GROWTH_MAX_CAP = 100;
const GROWTH_CAP_STEP = 5;
// 上限解放 4 階：每階需要的最高 RANK（推過的最高樓層）與碎片
const GROWTH_BREAK_RANKS = [40, 60, 80, 100];
const GROWTH_BREAK_SHARDS = [20, 30, 40, 50];
function growthExpNeed(level) { const n = Math.max(0, level - 1); return 100 + 45 * n + 15 * n * n; }
function growthRank() { return Math.max(1, Math.floor(Number(rankLv) || 1)); }
function breakthroughStage(ch) { return growthInt(ch && ch.breakthrough, 0, GROWTH_BREAK_RANKS.length); }
// 前四顆星代表已完成的上限解放；第五格先展示為未開放的超限解放。
function breakthroughStarsMarkup(ch, compact = false) {
    const stage = breakthroughStage(ch);
    const stars = Array.from({ length: 4 }, (_, i) => `<span class="growth-star${i < stage ? ' earned' : ''}" aria-hidden="true">★</span>`).join('');
    return `<div class="growth-stars${compact ? ' compact' : ''}" aria-label="上限解放 ${stage}/4 星；超限解放星未開放" title="上限解放 ${stage}/4　・　超限解放星（未開放）"><span class="growth-stars-label">解放</span>${stars}<span class="growth-overlimit-label">／超限解放 <b aria-hidden="true">★</b>（未開放）</span></div>`;
}
function growthCap(ch) { return Math.max(ch.lvl > GROWTH_MAX_CAP ? ch.lvl : 0, Math.min(GROWTH_MAX_CAP, GROWTH_BASE_CAP + breakthroughStage(ch) * GROWTH_CAP_STEP)); }
function talentRank(ch, key) { return growthInt(ch && ch.talents && ch.talents[key], 0, 999999); }
// 天賦點由等級與上限解放累積；不再設總點數或單條天賦階級上限。
function talentBudget(ch) { return 2 + Math.floor(ch.lvl / 5) + breakthroughStage(ch); }
function talentUsed(ch) { return Object.keys(GROWTH_PATHS).reduce((n, k) => n + talentRank(ch, k), 0); }
function breakthroughRankNeed(ch) { return GROWTH_BREAK_RANKS[breakthroughStage(ch)]; }
function breakthroughCost(ch) { return GROWTH_BREAK_SHARDS[breakthroughStage(ch)]; }

function normalizeCharacterGrowth(ch) {
    ch.lvl = growthInt(ch.lvl, 1, 999999);
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
        ch.lvl++; ch.baseAtk += 3; ch.maxHp += 20;
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
    return `<button class="mini-btn gray" onclick="closeGrowth()">‹ 返回角色</button>
        <div class="pg-sec">${d.name}・角色培養</div>
        <div class="pgc growth-breakthrough-display"><div class="growth-break-target" id="growth-break-target">${unitFace(d.unit, d.rarity, 'walk_front', d.name.slice(0, 1))}</div><div class="growth-break-copy"><div class="nm">上限解放星級</div>${breakthroughStarsMarkup(ch)}<div class="sub">每次上限解放增加一星；完成四次後為四星。超限解放五星目前尚未開放。</div></div></div>
        <div class="pgc"><div class="nm">升級　Lv.${ch.lvl} / ${cap}</div>
            <div class="st">攻擊 <b>${atkOf(ch)}</b>｜最大生命 <b>${hpMax(ch)}</b></div>
            <div class="bar"><i style="width:${Math.min(100, ch.exp / ch.nextExp * 100)}%"></i></div>
            <div class="sub">${capped ? (maxed ? '已達最高等級' : '已達等級上限，上限解放後可繼續升級') : `經驗 ${Math.floor(ch.exp)} / ${ch.nextExp}`}</div>
            <div class="sub">使用培養道具取得角色經驗；每級攻擊 +3、生命 +20。</div>
            <button class="mini-btn gold growth-cultivate-btn" ${!materials || capped ? 'disabled' : ''} onclick="cultivateGrowthChar('${ch.id}',event)">道具培養｜神之金屬 ×1　角色經驗 +100（持有 ${materials}）</button></div>
        <div class="pgc"><div class="nm">上限解放　${breakStage} / ${GROWTH_BREAK_RANKS.length}</div>
            <div class="st">持有 <b>${ch.shards}</b> 片｜目前上限 <b>${cap}</b>｜目前 RANK <b>${rank}</b></div>
            <div class="sub">${maxed ? `等級上限已解放到 ${GROWTH_MAX_CAP}。` : `解放後上限 ${cap} → ${Math.min(GROWTH_MAX_CAP, cap + GROWTH_CAP_STEP)}；需要 RANK ${need} ＋ ${cost} 片碎片。`}</div>
            <div class="sub">RANK 靠打怪經驗升級、不會倒退；不必等滿級即可解放。</div>
            <button class="mini-btn gold" ${maxed || !rankOk || ch.shards < cost ? 'disabled' : ''} onclick="breakthroughChar('${ch.id}',event)">${maxed ? '上限已達 100' : !rankOk ? `需要 RANK ${need}` : `上限解放 · ${cost} 片`}</button></div>
        <div class="pgc"><div class="nm">角色天賦　${used} / ${budget} 點</div>
            <div class="sub">每次上限解放獲得 1 點（目前解放取得 ${breakStage} 點）；角色升級也會增加天賦點。點擊「＋」配置，天賦點與各天賦階級暫無上限；PF 以隊長天賦為準。</div>
            ${Object.entries(GROWTH_PATHS).map(([key, p]) => { const rank = talentRank(ch, key); return `<div class="growth-path"><div><b>${p.icon} ${p.name}　${rank}</b><div class="sub">${p.desc}</div></div>
                <button class="growth-talent-plus" aria-label="${p.name}天賦加一點" title="消耗 1 點天賦點" ${used >= budget ? 'disabled' : ''} onclick="upgradeTalent('${ch.id}','${key}')">＋</button></div>`; }).join('')}
            <div class="sub">目前效果：技能傷害 +${talentRank(ch, 'skill') * 6}%／治療 +${talentRank(ch, 'skill') * 2}%、PF 效果 +${talentRank(ch, 'pf') * 8}%、生命 +${talentRank(ch, 'survival') * 4}%／減傷 ${talentRank(ch, 'survival')}%。</div>
            <button class="mini-btn gray" ${used ? '' : 'disabled'} onclick="resetTalents('${ch.id}')">重置天賦配置 · 返還 ${used} 點</button></div>`;
}
