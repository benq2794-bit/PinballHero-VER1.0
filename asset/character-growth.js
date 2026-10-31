const GROWTH_PATHS = {
    skill: { name: '技能', icon: '✦', desc: '每階技能傷害 +6%、技能治療量 +2%' },
    pf: { name: '強力彈射', icon: '⚡', desc: '每階 PF 傷害與應援攻擊加成效果 +8%' },
    survival: { name: '生存', icon: '🛡', desc: '每階最大生命 +4%、受到傷害 -1%' }
};
let growthFor = null;
let growthViewSignature = '';
const growthInt = (n, min, max) => Math.max(min, Math.min(max, Math.floor(Number(n) || 0)));
function growthExpNeed(level) { const n = Math.max(0, level - 1); return 100 + 45 * n + 15 * n * n; }
function growthCap(ch) { return Math.max(ch.lvl > 100 ? ch.lvl : 0, Math.min(100, (ch.legacyCap || 30) + (ch.breakthrough || 0) * 10)); }
function talentRank(ch, key) { return growthInt(ch && ch.talents && ch.talents[key], 0, 8); }
function talentBudget(ch) { return Math.min(12, 2 + Math.floor(ch.lvl / 5)); }
function talentUsed(ch) { return Object.keys(GROWTH_PATHS).reduce((n, k) => n + talentRank(ch, k), 0); }
function talentCost(rank) { return 20 + 15 * rank; }
function talentRefund(ch) { return Object.keys(GROWTH_PATHS).reduce((n, k) => { const r = talentRank(ch, k); return n + r * 20 + 15 * r * (r - 1) / 2; }, 0); }
function breakthroughCost(ch) { return 10 + (ch.breakthrough || 0) * 5; }

function normalizeCharacterGrowth(ch) {
    ch.lvl = growthInt(ch.lvl, 1, 999999);
    const oldNeed = Math.max(1, Number(ch.nextExp) || 100);
    const oldExp = Math.max(0, Number(ch.exp) || 0);
    if (ch.growthVersion !== 1) {
        // Grandfather existing levels and preserve progress toward the next level.
        ch.legacyCap = Math.max(30, Math.ceil(ch.lvl / 10) * 10);
        ch.breakthrough = 0;
        ch.exp = Math.floor(Math.min(1, oldExp / oldNeed) * growthExpNeed(ch.lvl));
    } else {
        ch.legacyCap = Math.max(30, growthInt(ch.legacyCap, 30, 999999), Math.ceil(Math.min(ch.lvl, 100) / 10) * 10 - growthInt(ch.breakthrough, 0, 7) * 10);
        ch.exp = oldExp;
    }
    ch.breakthrough = growthInt(ch.breakthrough, 0, Math.max(0, Math.ceil((100 - ch.legacyCap) / 10)));
    ch.shards = growthInt(ch.shards, 0, 999999);
    ch.nextExp = growthExpNeed(ch.lvl);
    if (ch.lvl >= growthCap(ch)) ch.exp = Math.min(ch.exp, ch.nextExp);
    const oldTalents = ch.talents || {};
    ch.talents = {};
    let remaining = talentBudget(ch);
    for (const key of Object.keys(GROWTH_PATHS)) {
        ch.talents[key] = Math.min(remaining, growthInt(oldTalents[key], 0, 8));
        remaining -= ch.talents[key];
    }
    ch.growthVersion = 1;
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
function breakthroughChar(id) {
    const ch = roster[id];
    if (!ch || !ch.unlocked || growthCap(ch) >= 100) return;
    const cost = breakthroughCost(ch);
    if (ch.shards < cost) { hmToast(`突破需要 ${cost} 片，目前 ${ch.shards} 片`); return; }
    ch.shards -= cost; ch.breakthrough++;
    const levels = gainGrowthExp(ch, 0);
    log(`🌟 <b>${charName(id)}</b> 突破！等級上限 ${growthCap(ch)}${levels ? '，已使用預存經驗升級' : ''}。`);
    refreshGrowthAfterPurchase();
}
function upgradeTalent(id, key) {
    const ch = roster[id];
    if (!ch || !ch.unlocked || !Object.hasOwn(GROWTH_PATHS, key)) return;
    const rank = talentRank(ch, key), cost = talentCost(rank);
    if (rank >= 8 || talentUsed(ch) >= talentBudget(ch)) { hmToast('天賦點已用完，升級可增加可用點數'); return; }
    if (shardTotal < cost) { hmToast(`結晶不足，需要 ${cost}`); return; }
    const oldCap = hpMax(ch), ratio = ch.hp / oldCap;
    shardTotal -= cost; ch.talents[key] = rank + 1;
    ch.hp = Math.max(ch.hp > 0 ? 1 : 0, Math.min(hpMax(ch), Math.floor(hpMax(ch) * ratio)));
    refreshGrowthAfterPurchase();
}
function resetTalents(id) {
    const ch = roster[id];
    if (!ch || !ch.unlocked || !talentUsed(ch)) return;
    const ratio = ch.hp / hpMax(ch), refund = talentRefund(ch);
    ch.talents = { skill: 0, pf: 0, survival: 0 }; shardTotal += refund;
    ch.hp = Math.max(ch.hp > 0 ? 1 : 0, Math.min(hpMax(ch), Math.floor(hpMax(ch) * ratio)));
    hmToast(`天賦已重配，返還 ${refund} 結晶`);
    refreshGrowthAfterPurchase();
}

function growthSignature(ch) { return [ch.id, ch.lvl, ch.exp, ch.shards, ch.breakthrough, shardTotal, ...Object.keys(GROWTH_PATHS).map(k => talentRank(ch, k))].join('|'); }
function syncGrowthView() {
    if (!growthFor || homeTabOn !== 'chars' || pickerFor || !roster[growthFor]) return;
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
    const cap = growthCap(ch), cost = breakthroughCost(ch), used = talentUsed(ch), budget = talentBudget(ch);
    const capped = ch.lvl >= cap, final = cap >= 100;
    return `<button class="mini-btn gray" onclick="closeGrowth()">‹ 返回角色</button>
        <div class="pg-sec">${d.name}・角色培養</div>
        <div class="pgc"><div class="nm">① 打怪升級　Lv.${ch.lvl} / ${cap}</div>
            <div class="st">攻擊 <b>${atkOf(ch)}</b>｜最大生命 <b>${hpMax(ch)}</b></div>
            <div class="bar"><i style="width:${Math.min(100, ch.exp / ch.nextExp * 100)}%"></i></div>
            <div class="sub">${capped ? (final ? '已達最高等級' : '已達等級上限，突破後可繼續升級') : `經驗 ${Math.floor(ch.exp)} / ${ch.nextExp}`}</div>
            <div class="sub">上場打怪自動獲得經驗，每級攻擊 +3、生命 +20。${capped && !final ? `預存經驗 ${Math.floor(ch.exp)} / ${ch.nextExp}` : ''}</div></div>
        <div class="pgc"><div class="nm">② 碎片突破</div><div class="st">持有 <b>${ch.shards}</b> 片｜已突破 ${ch.breakthrough || 0} 次</div>
            <div class="sub">${final ? '等級上限已完成；舊角色原有等級與能力保留。' : `使用 ${cost} 片專屬碎片，上限 ${cap} → ${Math.min(100, cap + 10)}；不必等滿級即可突破。`}</div>
            <button class="mini-btn gold" ${final || ch.shards < cost ? 'disabled' : ''} onclick="breakthroughChar('${ch.id}')">${final ? '上限已完成' : `突破 · ${cost} 片`}</button></div>
        <div class="pgc"><div class="nm">③ 角色天賦　${used} / ${budget} 點</div>
            <div class="sub">初始 2 點，每 5 級多 1 點，最多 12 點；每條最多 8 階。只強化此角色，PF 以隊長天賦為準。</div>
            ${Object.entries(GROWTH_PATHS).map(([key, p]) => { const rank = talentRank(ch, key), price = talentCost(rank); return `<div class="growth-path"><div><b>${p.icon} ${p.name}　${rank} / 8</b><div class="sub">${p.desc}</div></div>
                <button class="mini-btn" ${rank >= 8 || used >= budget || shardTotal < price ? 'disabled' : ''} onclick="upgradeTalent('${ch.id}','${key}')">${rank >= 8 ? '已滿' : `💎 ${price}`}</button></div>`; }).join('')}
            <div class="sub">目前效果：技能傷害 +${talentRank(ch, 'skill') * 6}%／治療 +${talentRank(ch, 'skill') * 2}%、PF 效果 +${talentRank(ch, 'pf') * 8}%、生命 +${talentRank(ch, 'survival') * 4}%／減傷 ${talentRank(ch, 'survival')}%。</div>
            <button class="mini-btn gray" ${used ? '' : 'disabled'} onclick="resetTalents('${ch.id}')">重配天賦 · 返還 💎${talentRefund(ch)}</button></div>`;
}
