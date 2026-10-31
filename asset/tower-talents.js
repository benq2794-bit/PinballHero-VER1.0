// New tower-wide passive tree. Legacy blessing saves are intentionally not imported.
const TOWER_TREE_LIMIT = 18;
const TOWER_TREE_STYLE = {
    damage: { icon: '⚔', color: '#e9a974', label: '傷害', step: 12, sign: '+' },
    crit: { icon: '◎', color: '#ead078', label: '暴擊率', step: 5, sign: '+' },
    guard: { icon: '🛡', color: '#88bce4', label: '受到傷害', step: 10, sign: '−' },
    gauge: { icon: 'ϟ', color: '#b9a2df', label: '技能能量獲得', step: 20, sign: '+' },
    heal: { icon: '✚', color: '#8ac9a5', label: '通關回復生命', step: 10, base: 25, sign: '' },
    element: { icon: '✧', color: '#7fcdd0', label: '克制傷害額外加成', step: 15, sign: '+' }
};
let towerTalentPoints = 0;
let towerTalentSelection = { id: 'damage', rank: 1 };
let towerTalentViewSignature = '';
function towerTalentSpent() { return TOWER_TALENTS.reduce((sum, p) => sum + (deepPerks[p.id] || 0), 0); }
function towerTalentValue(id, rank) {
    const p = TOWER_TREE_STYLE[id]; return p.sign + ((p.base || 0) + p.step * rank) + '%';
}
function loadTowerTalentState(saved) {
    deepPerks = {}; towerTalentPoints = 0;
    if (!saved || saved.version !== 1) return; // Explicitly clear the old random blessings.
    for (const p of TOWER_TALENTS) {
        const n = Math.max(0, Math.min(p.max, Math.floor(Number(saved.allocated && saved.allocated[p.id]) || 0)));
        if (n) deepPerks[p.id] = n;
    }
    towerTalentPoints = Math.max(0, Math.min(TOWER_TREE_LIMIT - towerTalentSpent(), Math.floor(Number(saved.points) || 0)));
}
function saveTowerTalentState() { return { version: 1, points: towerTalentPoints, allocated: { ...deepPerks } }; }
function awardTowerTalentPoint() {
    if (gateOn() || towerTalentPoints + towerTalentSpent() >= TOWER_TREE_LIMIT) return false;
    towerTalentPoints++;
    log('✧ 波利塔 BOSS 擊破，獲得 1 點天賦點！回到主頁「天賦」可點亮節點。');
    pfBanner('天賦點 +1', '主頁「天賦」可分配');
    return true;
}
function selectTowerTalent(id, rank) {
    const perk = TOWER_TALENTS.find(p => p.id === id);
    if (!perk || !Number.isInteger(rank) || rank < 1 || rank > perk.max) return;
    towerTalentSelection = { id, rank }; towerTalentViewSignature = '';
    if (homeTabOn === 'talents') renderPage();
}
function refreshTowerTalentPage() {
    const body = $('pg-body'), scroll = body ? body.scrollTop : 0;
    towerTalentViewSignature = ''; saveGame();
    if (homeTabOn === 'talents') renderPage();
    updateUI(); if (body) body.scrollTop = scroll;
}
function unlockTowerTalent(id, rank) {
    const perk = TOWER_TALENTS.find(p => p.id === id);
    if (!perk || towerTalentPoints < 1 || !Number.isInteger(rank) || rank < 1 || rank > perk.max || rank !== (deepPerks[id] || 0) + 1) return;
    deepPerks[id] = rank; towerTalentPoints--;
    log(`✧ 點亮天賦 <b>${perk.name} ${rank} 階</b>，${TOWER_TREE_STYLE[id].label} ${towerTalentValue(id, rank)}。`);
    refreshTowerTalentPage();
}
function resetTowerTalents() {
    const spent = towerTalentSpent(); if (!spent) return;
    deepPerks = {}; towerTalentPoints = Math.min(TOWER_TREE_LIMIT, towerTalentPoints + spent);
    refreshTowerTalentPage();
}
function syncTowerTalentView() {
    if (homeTabOn !== 'talents' || !$('page') || $('page').style.display === 'none') return;
    const signature = JSON.stringify([towerTalentPoints, deepPerks, towerTalentSelection]);
    if (signature === towerTalentViewSignature) return;
    const body = $('pg-body'); if (!body) return;
    const scroll = body.scrollTop; body.innerHTML = pageTowerTalents(); body.scrollTop = scroll;
}
function pageTowerTalents() {
    towerTalentViewSignature = JSON.stringify([towerTalentPoints, deepPerks, towerTalentSelection]);
    let lines = '', labels = '', nodes = '';
    TOWER_TALENTS.forEach((p, index) => {
        const style = TOWER_TREE_STYLE[p.id], angle = (-90 + index * 60) * Math.PI / 180;
        let from = { x: 180 + Math.cos(angle) * 25, y: 190 + Math.sin(angle) * 25 };
        const owned = deepPerks[p.id] || 0;
        for (let rank = 1; rank <= p.max; rank++) {
            const radius = [0, 53, 102, 151][rank], x = 180 + Math.cos(angle) * radius, y = 190 + Math.sin(angle) * radius;
            lines += `<line x1="${from.x}" y1="${from.y}" x2="${x}" y2="${y}" class="${rank <= owned ? 'lit' : ''}" style="--branch:${style.color}"/>`;
            const state = rank <= owned ? 'allocated' : rank === owned + 1 && towerTalentPoints > 0 ? 'available' : 'locked';
            const selected = towerTalentSelection.id === p.id && towerTalentSelection.rank === rank;
            nodes += `<button type="button" class="tower-tree-node ${state}${selected ? ' selected' : ''}" style="left:${x / 3.6}%;top:${y / 3.8}%;--branch:${style.color}"
                onclick="selectTowerTalent('${p.id}',${rank})" aria-pressed="${selected}" aria-label="${p.name}第 ${rank} 階，${rank <= owned ? '已點亮' : '未點亮'}" title="${p.name} ${rank} 階">${rank === 1 ? style.icon : rank === 2 ? 'Ⅱ' : 'Ⅲ'}</button>`;
            from = { x, y };
        }
        labels += `<text x="${180 + Math.cos(angle) * 175}" y="${194 + Math.sin(angle) * 175}" fill="${style.color}">${p.name}</text>`;
    });
    const selected = towerTalentSelection, perk = TOWER_TALENTS.find(p => p.id === selected.id), style = TOWER_TREE_STYLE[perk.id];
    const owned = deepPerks[perk.id] || 0, learned = selected.rank <= owned, connected = selected.rank === owned + 1;
    return `<div class="tower-tree-page"><div class="tower-tree-header"><div><small>波利塔專屬</small><h3>星脈天賦</h3></div><div class="tower-tree-points"><strong>${towerTalentPoints}</strong><span>可用天賦點</span></div></div>
        <div class="tower-tree-help">從中央向外逐步點亮。擊敗波利塔 BOSS 獲得 1 點。</div>
        <div class="tower-tree-map"><svg viewBox="0 0 360 380" class="tower-tree-lines" aria-hidden="true"><circle cx="180" cy="190" r="151" class="orbit"/><circle cx="180" cy="190" r="102" class="orbit"/>${lines}${labels}</svg>
            <div class="tower-tree-origin" aria-hidden="true">✧<small>起源</small></div>${nodes}</div>
        <div class="tower-tree-detail" style="--branch:${style.color}"><div><b>${style.icon} ${perk.name} · 第 ${selected.rank} 階</b><span>${learned ? '已點亮' : connected ? '與起源相連' : `需先點亮第 ${selected.rank - 1} 階`}</span></div>
            <p>${style.label}　<strong>${towerTalentValue(perk.id, Math.max(0, selected.rank - 1))} → ${towerTalentValue(perk.id, selected.rank)}</strong></p>
            <button type="button" class="mini-btn gold" ${learned || !connected || !towerTalentPoints ? 'disabled' : ''} onclick="unlockTowerTalent('${perk.id}',${selected.rank})">${learned ? '已點亮' : !connected ? '前置節點未解鎖' : towerTalentPoints ? '點亮節點 · 1 點' : '需要 1 點天賦點'}</button></div>
        <div class="tower-tree-footer"><span>已分配 ${towerTalentSpent()} / ${TOWER_TREE_LIMIT} 點 · 僅在波利塔生效</span><button type="button" class="mini-btn gray" ${towerTalentSpent() ? '' : 'disabled'} onclick="resetTowerTalents()">重配 · 返還 ${towerTalentSpent()} 點</button></div></div>`;
}
