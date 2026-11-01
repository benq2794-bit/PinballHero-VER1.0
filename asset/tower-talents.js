// New tower-wide passive tree. Legacy blessing saves are intentionally not imported.
const TOWER_TREE_LIMIT = 11;
// 第 1 階是唯一一階純數值（第 2 階起就是機制），所以 step 就是這一階的完整增幅
const TOWER_TREE_STYLE = {
    damage: { icon: '†', color: '#e9a974', label: '傷害', short: '傷害', step: 15, sign: '+' },
    crit: { icon: '○', color: '#ead078', label: '暴擊率', short: '暴擊', step: 10, sign: '+' },
    guard: { icon: '▢', color: '#88bce4', label: '受到傷害', short: '減傷', step: 12, sign: '−' },
    element: { icon: '◇', color: '#7fcdd0', label: '克制傷害額外', short: '克制', step: 18, sign: '+' },
    gauge: { icon: 'ϟ', color: '#b9a2df', label: '技能能量獲得', short: '能量', step: 22, sign: '+' },
    heal: { icon: '✚', color: '#8ac9a5', label: '通關回復生命', short: '回復', step: 15, base: 25, sign: '' }
};
let towerTalentPoints = 0;
let towerTalentSelection = { id: 'damage', rank: 1 };
let towerTalentViewSignature = '';
function towerTalentSpent() {
    return TOWER_TALENTS.reduce((sum, p) => sum + (deepPerks[p.id] || 0), 0)
        + TOWER_CROSS.filter(c => deepCross[c.id]).length;
}
function towerTalentValue(id, rank) {
    const p = TOWER_TREE_STYLE[id]; return p.sign + ((p.base || 0) + p.step * rank) + '%';
}
function towerRankNow() { return Math.max(1, Math.floor(Number(rankLv) || 1)); }
function towerTierLocked(id, rank) { return rank >= 2 && towerRankNow() < TOWER_MUT_RANK; }
function towerCrossDef(id) { return TOWER_CROSS.find(c => c.id === id) || null; }
function towerCrossOpen(c) { return (deepPerks[c.a] || 0) >= 2 && (deepPerks[c.b] || 0) >= 2; }
function loadTowerTalentState(saved) {
    deepPerks = {}; deepCross = {}; towerTalentPoints = 0;
    if (!saved || saved.version !== 1) return; // Explicitly clear the old random blessings.
    for (const p of TOWER_TALENTS) {
        const n = Math.max(0, Math.min(p.max, Math.floor(Number(saved.allocated && saved.allocated[p.id]) || 0)));
        if (n) deepPerks[p.id] = n;
    }
    // 交叉節點只認兩側都還在第 2 階以上的存檔；舊版節點 id 已不存在，點數退還
    const savedCross = saved.cross || {};
    let refund = 0;
    Object.keys(savedCross).forEach(id => {
        const c = towerCrossDef(id);
        if (c && towerCrossOpen(c)) deepCross[id] = 1;
        else refund++;
    });
    towerTalentPoints = Math.max(0, Math.min(TOWER_TREE_LIMIT - towerTalentSpent(), Math.floor(Number(saved.points) || 0) + refund));
}
function saveTowerTalentState() { return { version: 1, points: towerTalentPoints, allocated: { ...deepPerks }, cross: { ...deepCross } }; }
function awardTowerTalentPoint() {
    if (gateOn() || towerTalentPoints + towerTalentSpent() >= TOWER_TREE_LIMIT) return false;
    towerTalentPoints++;
    log('✧ 波利塔 BOSS 擊破，獲得 1 點天賦點！回到主頁「天賦」可點亮節點。');
    pfBanner('天賦點 +1', '主頁「天賦」可分配');
    return true;
}
function refreshTowerTalentPage() {
    const body = $('pg-body'), scroll = body ? body.scrollTop : 0;
    towerTalentViewSignature = ''; saveGame();
    if (homeTabOn === 'talents') renderPage();
    updateUI(); if (body) body.scrollTop = scroll;
}
function towerTalentLog(id, rank) {
    if (rank >= 2) {
        const m = TOWER_MUTATIONS[id];
        return rank >= 3
            ? `✦ 星脈質變強化 <b>${m.name}・強化</b>：${m.up}。`
            : `✦ 星脈質變 <b>${m.name}</b>：${m.desc}。`;
    }
    const perk = TOWER_TALENTS.find(p => p.id === id), style = TOWER_TREE_STYLE[id];
    return `✧ 點亮天賦 <b>${perk.name} ${rank} 階</b>，${style.label} ${towerTalentValue(id, rank)}。`;
}
function unlockTowerTalent(id, rank) {
    const cross = towerCrossDef(id);
    if (cross) {
        if (towerTalentPoints < 1 || deepCross[id] || !towerCrossOpen(cross)) return;
        deepCross[id] = 1; towerTalentPoints--;
        log(`✦ 解鎖雙修節點 <b>${cross.name}</b>：${cross.desc}。`);
        refreshTowerTalentPage();
        return;
    }
    const perk = TOWER_TALENTS.find(p => p.id === id);
    if (!perk || !Number.isInteger(rank) || rank < 1 || rank > perk.max || rank !== (deepPerks[id] || 0) + 1) return;
    if (towerTierLocked(id, rank)) { hmToast(`星脈質變需要 RANK ${TOWER_MUT_RANK}，目前 RANK ${towerRankNow()}`); return; }
    if (towerTalentPoints < 1) return;
    deepPerks[id] = rank; towerTalentPoints--;
    log(towerTalentLog(id, rank));
    refreshTowerTalentPage();
}
// 節點左鍵：還沒亮的直接點亮，已亮的只選取看說明
function towerTalentTap(id, rank) {
    const cross = towerCrossDef(id);
    if (cross) towerTalentSelection = { id, rank: 1 };
    else {
        const perk = TOWER_TALENTS.find(p => p.id === id);
        if (!perk || !Number.isInteger(rank) || rank < 1 || rank > perk.max) return;
        towerTalentSelection = { id, rank };
    }
    towerTalentViewSignature = '';
    const owned = cross ? (deepCross[id] ? 1 : 0) : (deepPerks[id] || 0);
    const target = cross ? 1 : rank;
    const canTry = cross ? !owned && towerCrossOpen(cross) : rank === owned + 1;
    if (canTry) unlockTowerTalent(id, target);
    // 點亮成功時 unlockTowerTalent 已重繪；只是選取、缺點數或 RANK 不足才補一次
    if (!(canTry && (cross ? deepCross[id] : (deepPerks[id] || 0) >= target))) {
        if (homeTabOn === 'talents') renderPage();
    }
}
// 節點右鍵：退回剛點亮的那一階；退回後若雙修節點失效，一併退還
function refundTowerTalent(id, rank) {
    const cross = towerCrossDef(id);
    if (cross) {
        if (!deepCross[id]) return;
        delete deepCross[id]; towerTalentPoints++;
        towerTalentSelection = { id, rank: 1 };
        log(`↩ 返還雙修節點 <b>${cross.name}</b>，退回 1 點天賦點。`);
        refreshTowerTalentPage();
        return;
    }
    const perk = TOWER_TALENTS.find(p => p.id === id), owned = deepPerks[id] || 0;
    if (!perk || !Number.isInteger(rank) || rank < 1) return;
    if (rank !== owned) {
        if (owned) hmToast(`返還要從第 ${owned} 階開始`);
        return;
    }
    deepPerks[id] = rank - 1;
    if (!deepPerks[id]) delete deepPerks[id];
    towerTalentPoints++;
    const broke = [];
    if (rank <= 2) TOWER_CROSS.forEach(c => {
        if (deepCross[c.id] && (c.a === id || c.b === id)) { delete deepCross[c.id]; towerTalentPoints++; broke.push(c.name); }
    });
    towerTalentSelection = { id, rank };
    log(`↩ 返還天賦 <b>${perk.name} ${rank} 階</b>，退回 1 點天賦點。`
        + (broke.length ? ` 連帶返還雙修節點 <b>${broke.join('、')}</b>，再退回 ${broke.length} 點。` : ''));
    refreshTowerTalentPage();
}
function resetTowerTalents() {
    const spent = towerTalentSpent(); if (!spent) return;
    deepPerks = {}; deepCross = {}; towerTalentPoints = Math.min(TOWER_TREE_LIMIT, towerTalentPoints + spent);
    refreshTowerTalentPage();
}
function syncTowerTalentView() {
    if (homeTabOn !== 'talents' || !$('page') || $('page').style.display === 'none') return;
    const signature = JSON.stringify([towerTalentPoints, deepPerks, deepCross, towerTalentSelection, towerRankNow()]);
    if (signature === towerTalentViewSignature) return;
    const body = $('pg-body'); if (!body) return;
    const scroll = body.scrollTop; body.innerHTML = pageTowerTalents(); body.scrollTop = scroll;
}
function towerCrossDetail(c) {
    const owned = !!deepCross[c.id], open = towerCrossOpen(c);
    const stateText = owned ? '已解鎖' : !open ? '需兩側第 2 階' : towerTalentPoints ? '可解鎖' : '缺天賦點';
    const stateClass = owned ? 'on' : open && towerTalentPoints ? 'ready' : '';
    return `<div class="tower-tree-detail cross" style="--branch:#ffe2a1">
        <div class="tt-head"><b><i class="tt-badge">✧</i>${c.name} · 雙修節點</b><span class="tt-state ${stateClass}">${stateText}</span></div>
        <p class="tt-cross-desc">${c.desc}</p>
    </div>`;
}
function towerBranchDetail(perk) {
    const style = TOWER_TREE_STYLE[perk.id];
    const selected = towerTalentSelection, owned = deepPerks[perk.id] || 0;
    const learned = selected.rank <= owned, connected = selected.rank === owned + 1;
    const mutLocked = towerTierLocked(perk.id, selected.rank);
    const isMut = selected.rank >= 2;
    const stateText = learned ? '已點亮'
        : !connected ? `需先點第 ${selected.rank - 1} 階`
        : mutLocked ? `需要 RANK ${TOWER_MUT_RANK}`
        : towerTalentPoints ? '可點亮' : '缺天賦點';
    const stateClass = learned ? 'on' : connected && !mutLocked && towerTalentPoints ? 'ready' : '';
    const mut = TOWER_MUTATIONS[perk.id];
    const mutTitle = mut.name;
    const body = isMut
        ? `<div class="tt-mut"><p>${selected.rank >= 3 ? mut.up : mut.desc}</p>`
            + `${selected.rank >= 3 ? `<small>強化前：${mut.desc}</small>` : ''}`
            + `${mutLocked && !learned ? `<small>需要 RANK ${TOWER_MUT_RANK}（目前 RANK ${towerRankNow()}）</small>` : ''}</div>`
        : `<p class="tt-values"><span class="tt-stat">${style.label}</span><em>${towerTalentValue(perk.id, 0)}</em><i>→</i><strong>${towerTalentValue(perk.id, 1)}</strong></p>`;
    return `<div class="tower-tree-detail" style="--branch:${style.color}">
        <div class="tt-head"><b><i class="tt-badge">${isMut ? '✦' : style.icon}</i>${isMut ? mutTitle : perk.name} · ${isMut ? (selected.rank >= 3 ? '質變強化' : '星脈質變') : `第 ${selected.rank} 階`}</b><span class="tt-state ${stateClass}">${stateText}</span></div>
        ${body}
    </div>`;
}
function pageTowerTalents() {
    towerTalentViewSignature = JSON.stringify([towerTalentPoints, deepPerks, deepCross, towerTalentSelection, towerRankNow()]);
    let lines = '', nodes = '';
    const placed = [];
    TOWER_TALENTS.forEach((p, index) => {
        const style = TOWER_TREE_STYLE[p.id], angle = (-90 + index * 60) * Math.PI / 180;
        let from = { x: 180 + Math.cos(angle) * 25, y: 190 + Math.sin(angle) * 25 };
        const owned = deepPerks[p.id] || 0;
        for (let rank = 1; rank <= p.max; rank++) {
            const radius = [0, 53, 102, 151][rank], x = 180 + Math.cos(angle) * radius, y = 190 + Math.sin(angle) * radius;
            placed.push({ index, rank, x, y });
            const lit = rank <= owned, next = rank === owned + 1, mutLocked = towerTierLocked(p.id, rank);
            lines += `<line x1="${from.x}" y1="${from.y}" x2="${x}" y2="${y}" class="wire-out"/>`
                + `<line x1="${from.x}" y1="${from.y}" x2="${x}" y2="${y}" class="wire-in${lit ? ' lit' : next ? ' next' : ''}" style="--branch:${style.color}"/>`;
            const state = lit ? 'allocated' : next && towerTalentPoints > 0 && !mutLocked ? 'available' : 'locked';
            const selected = towerTalentSelection.id === p.id && towerTalentSelection.rank === rank;
            const pips = Array.from({ length: p.max }, (_, i) => `<i class="${i < owned ? 'on' : ''}"></i>`).join('');
            const badge = state === 'allocated' && rank === p.max ? '<span class="tt-check">✓</span>'
                : state === 'available' ? '<span class="tt-plus">+</span>'
                : mutLocked ? `<span class="tt-rank">R${TOWER_MUT_RANK}</span>` : '';
            const icon = rank >= 2 ? '✦' : style.icon;
            const tierCls = `tier-${rank}${mutLocked && !lit ? ' rank-locked' : ''}`;
            nodes += `<button type="button" class="tower-tree-node ${state} ${tierCls}${selected ? ' selected' : ''}" style="left:${x / 3.6}%;top:${y / 3.8}%;--branch:${style.color}"
                data-talent="${p.id}" data-rank="${rank}"
                onclick="towerTalentTap('${p.id}',${rank})"
                aria-pressed="${selected}" aria-label="${p.name}第 ${rank} 階，${lit ? '已點亮' : '未點亮'}"><span class="tt-ico">${icon}</span><span class="tt-pips">${pips}</span>${badge}</button>`;
            from = { x, y };
        }
    });
    // 相鄰分支第 2 階之間的橫向弧線，兩側都點亮第 2 階時整條亮起
    TOWER_TALENTS.forEach((_, i) => {
        const j = (i + 1) % TOWER_TALENTS.length;
        const pa = placed.find(v => v.index === i && v.rank === 2), pb = placed.find(v => v.index === j && v.rank === 2);
        if (!pa || !pb) return;
        const lit = (deepPerks[TOWER_TALENTS[i].id] || 0) >= 2 && (deepPerks[TOWER_TALENTS[j].id] || 0) >= 2;
        lines += `<path d="M ${pa.x.toFixed(1)} ${pa.y.toFixed(1)} A 102 102 0 0 1 ${pb.x.toFixed(1)} ${pb.y.toFixed(1)}" class="wire-ring${lit ? ' lit' : ''}"/>`;
    });
    // 雙修節點：所有縫隙都先顯示輪廓，兩側都到第 2 階才可解鎖
    TOWER_CROSS.forEach(c => {
        const ai = TOWER_TALENTS.findIndex(p => p.id === c.a), bi = TOWER_TALENTS.findIndex(p => p.id === c.b);
        if (ai < 0 || bi < 0) return;
        const angle = (-90 + ai * 60 + 30) * Math.PI / 180;
        const x = 180 + Math.cos(angle) * 80, y = 190 + Math.sin(angle) * 80;
        const pa = placed.find(v => v.index === ai && v.rank === 2), pb = placed.find(v => v.index === bi && v.rank === 2);
        const lit = !!deepCross[c.id], open = towerCrossOpen(c);
        if (pa && pb) {
            const wire = lit ? 'lit' : open ? 'next' : '';
            lines += `<line x1="${pa.x}" y1="${pa.y}" x2="${x}" y2="${y}" class="wire-cross ${wire}"/>`
                + `<line x1="${pb.x}" y1="${pb.y}" x2="${x}" y2="${y}" class="wire-cross ${wire}"/>`;
        }
        const selected = towerTalentSelection.id === c.id;
        const state = lit ? 'allocated' : open && towerTalentPoints ? 'available' : 'locked';
        nodes += `<button type="button" class="tower-tree-node cross-node ${state}${selected ? ' selected' : ''}" style="left:${x / 3.6}%;top:${y / 3.8}%;--branch:#ffe2a1"
            data-talent="${c.id}" data-rank="1"
            onclick="towerTalentTap('${c.id}',1)"
            aria-pressed="${selected}" aria-label="${c.name}，雙修節點"><span class="tt-ico">✧</span></button>`;
    });
    const branchTags = TOWER_TALENTS.map(p => {
        const s = TOWER_TREE_STYLE[p.id];
        return `<span style="--branch:${s.color}"><i>${s.icon}</i>${s.short}</span>`;
    }).join('');
    const selected = towerTalentSelection, cross = towerCrossDef(selected.id);
    const detail = cross ? towerCrossDetail(cross) : towerBranchDetail(TOWER_TALENTS.find(p => p.id === selected.id) || TOWER_TALENTS[0]);
    const hexPts = Array.from({ length: 6 }, (_, i) => {
        const a = (-90 + i * 60) * Math.PI / 180;
        return [180 + Math.cos(a) * 151, 190 + Math.sin(a) * 151];
    });
    const hexRing = hexPts.map((p, i) => {
        const q = hexPts[(i + 1) % 6];
        return `<line class="hex-ring" x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${q[0].toFixed(1)}" y2="${q[1].toFixed(1)}"/>`;
    }).join('');
    const decor = `<g class="tt-decor">
        ${hexRing}
        <path class="corner" d="M11 40 L11 11 L40 11"/><path class="corner" d="M320 11 L349 11 L349 40"/>
        <path class="corner" d="M11 340 L11 369 L40 369"/><path class="corner" d="M349 340 L349 369 L320 369"/>
        <path class="spark" d="M34 184 L35.6 188.4 L40 190 L35.6 191.6 L34 196 L32.4 191.6 L28 190 L32.4 188.4 Z"/>
        <path class="spark" d="M326 184 L327.6 188.4 L332 190 L327.6 191.6 L326 196 L324.4 191.6 L320 190 L324.4 188.4 Z"/>
        <circle class="star" cx="72" cy="36" r="1.1"/><circle class="star" cx="120" cy="26" r="1"/>
        <circle class="star" cx="306" cy="44" r="1.4"/><circle class="star" cx="322" cy="78" r="1"/>
        <circle class="star" cx="46" cy="58" r="1.6"/><circle class="star" cx="95" cy="95" r="1.2"/>
        <circle class="star" cx="265" cy="95" r="1.2"/>
        <circle class="star" cx="22" cy="228" r="1.4"/><circle class="star" cx="34" cy="310" r="1.2"/>
        <circle class="star" cx="58" cy="330" r="1.6"/><circle class="star" cx="95" cy="285" r="1.2"/>
        <circle class="star" cx="265" cy="285" r="1.2"/><circle class="star" cx="316" cy="316" r="1.2"/>
        <circle class="star" cx="338" cy="220" r="1"/><circle class="star" cx="250" cy="356" r="1.2"/>
        <circle class="star" cx="135" cy="360" r="1"/>
    </g>`;
    return `<div class="tower-tree-page"><div class="tower-tree-header"><small>波利塔專屬</small><h3>星脈天賦</h3>
        <div class="tower-tree-side"><div class="tower-tree-points"><span class="tt-gem">✦</span><div><strong>${towerTalentPoints}</strong><span>可用天賦點</span></div></div>
        <button type="button" class="mini-btn gray tt-reset" ${towerTalentSpent() ? '' : 'disabled'} title="返還 ${towerTalentSpent()} 點" onclick="resetTowerTalents()">↺<small>重配</small></button></div></div>
        <div class="tower-tree-help">擊破 BOSS 得 1 點｜第 2 階星脈質變需 RANK ${TOWER_MUT_RANK}｜雙修節點需兩側第 2 階</div>
        <div class="tower-tree-help tip">左鍵點亮節點｜右鍵返還天賦點</div>
        <div class="tower-tree-legend"><span><i class="on"></i>已點亮</span><span><i class="avail"></i>可點亮</span><span><i class="lock"></i>未解鎖</span><span class="tt-spent">已分配 ${towerTalentSpent()}/${TOWER_TREE_LIMIT}</span></div>
        <div class="tower-tree-map"><svg viewBox="0 0 360 380" class="tower-tree-lines" aria-hidden="true"><circle cx="180" cy="190" r="151" class="orbit"/><circle cx="180" cy="190" r="102" class="orbit"/>${decor}${lines}</svg>
            <div class="tower-tree-origin" aria-hidden="true"><span>✧</span><small>起源</small></div>${nodes}</div>
        <div class="tower-tree-branches">${branchTags}</div>
        ${detail}</div>`;
}
// 右鍵返還天賦點：只在節點上攔截，其他地方的右鍵選單照舊
document.addEventListener('contextmenu', e => {
    const node = e.target && e.target.closest ? e.target.closest('.tower-tree-node') : null;
    if (!node || !node.dataset.talent) return;
    e.preventDefault();
    refundTowerTalent(node.dataset.talent, Number(node.dataset.rank) || 1);
});
