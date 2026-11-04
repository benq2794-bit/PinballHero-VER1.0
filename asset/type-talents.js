// 攻擊型態天賦樹：天賦分頁直接使用這套樹與帳號天賦點。
// 車道 key 是 TYPE_INFO 的五種攻擊型態（職業系統已移除，不再以職業分組）。
let typeTalentPoints = 0;
let typeTalentRanks = {};
const TYPE_TALENT_MAX_RANK = GAME_DATA.progression.typeTalents.maxRank;
let typeTalentSelected = { type: "knight", node: "knight_recovery" };
let typeTalentHasSelectedTree = false;
let typeTalentLineUnlock = null;
let typeTalentMapFrame = 0;
let typeTalentMapLast = 0;
let typeTalentMapTime = 0;

const TYPE_TALENT_TREES = GAME_DATA.typeTalentTrees;

// 車道色只負責辨認攻擊型態，節點狀態仍由灰／亮／車道色／金四種語言表達。
const TYPE_TALENT_COLORS = GAME_DATA.TYPE_TALENT_COLORS;

function normalizeTypeTalentRanks(saved) {
    const normalized = {};
    for (const [type, tree] of Object.entries(TYPE_TALENT_TREES)) {
        normalized[type] = {};
        for (const branch of tree.branches) {
            let pathOpen = true;
            for (const node of branch.nodes) {
                const rank = Math.max(0, Math.min(TYPE_TALENT_MAX_RANK, Math.floor(Number(saved && saved[type] && saved[type][node.id]) || 0)));
                const learned = rank > 0 && pathOpen;
                if (learned) normalized[type][node.id] = rank;
                else pathOpen = false;
            }
        }
    }
    return normalized;
}
function typeTalentRank(id, type = (Object.keys(TYPE_TALENT_TREES).find(key => String(id).startsWith(`${key}_`)) || typeTalentSelected.type)) { return Math.max(0, Math.min(TYPE_TALENT_MAX_RANK, Math.floor(Number(typeTalentRanks[type] && typeTalentRanks[type][id]) || 0))); }
function typeTalentSpent(type = null, ranks = typeTalentRanks) {
    const types = type ? [type] : Object.keys(TYPE_TALENT_TREES);
    return types.reduce((sum, key) => sum + Object.values(ranks[key] || {}).reduce((spent, rank) => spent + Math.max(0, Math.min(TYPE_TALENT_MAX_RANK, Math.floor(Number(rank) || 0))), 0), 0);
}
// 車道六顆全滿＝該攻擊型態的被動自動生效，沒有一時只能開一顆的開關。
function typeTalentTreeMaxed(type) {
    const tree = TYPE_TALENT_TREES[type];
    return !!tree && tree.branches.every(branch => branch.nodes.every(node => typeTalentRank(node.id, type) >= TYPE_TALENT_MAX_RANK));
}
function typeTalentNodeState(type, branch, index) {
    const sequence = TYPE_TALENT_TREES[type].branches.flatMap(path => path.nodes);
    const node = branch.nodes[index], sequenceIndex = sequence.findIndex(item => item.id === node.id);
    const rank = typeTalentRank(node.id, type), learned = rank > 0;
    const prior = sequenceIndex === 0 || typeTalentRank(sequence[sequenceIndex - 1].id, type) > 0;
    if (rank >= TYPE_TALENT_MAX_RANK) return "maxed";
    return learned ? "learned" : prior && typeTalentPoints > 0 ? "available" : "locked";
}
// 依天賦效果挑選外部圖標精靈，顏色由車道色 CSS 控制。
const TYPE_TALENT_ICON_BY_ID = GAME_DATA.TYPE_TALENT_ICON_BY_ID;
const TYPE_TALENT_PASSIVE_ICON = GAME_DATA.TYPE_TALENT_PASSIVE_ICON;
function typeTalentIconMarkup(key, extraClass = "") {
    const valid = ["shield", "heart", "sword", "slash", "target", "arrow", "burst", "moon", "speed", "eye"];
    const icon = valid.includes(key) ? key : "burst";
    return `<img class="tt-icon ${extraClass}" src="asset/ui/type-talent-icons/${icon}.png" alt="" aria-hidden="true" draggable="false">`;
}
function selectTypeTalentNode(type, nodeId) {
    typeTalentHasSelectedTree = true;
    typeTalentSelected = { type, node: nodeId };
    renderTypeTalentTree();
}
function stopTypeTalentMapFlow() {
    if (typeTalentMapFrame) cancelAnimationFrame(typeTalentMapFrame);
    typeTalentMapFrame = 0;
    typeTalentMapLast = 0;
}
function startTypeTalentMapFlow() {
    stopTypeTalentMapFlow();
    const body = $("pg-body");
    if (!body || homeTabOn !== "talents") return;
    const tick = timestamp => {
        if (homeTabOn !== "talents" || !document.body.contains(body)) { stopTypeTalentMapFlow(); return; }
        const deltaTime = typeTalentMapLast ? Math.min(.05, (timestamp - typeTalentMapLast) / 1000) : 0;
        typeTalentMapLast = timestamp;
        typeTalentMapTime += deltaTime;
        if (typeTalentLineUnlock) {
            const path = body.querySelector(`.tt-link[data-link-id="${typeTalentLineUnlock.nodeId}"]`);
            if (!path || typeTalentLineUnlock.type !== typeTalentSelected.type) typeTalentLineUnlock = null;
            else {
                const duration = .52;
                const progress = Math.min(1, (timestamp - typeTalentLineUnlock.startedAt) / (duration * 1000));
                const length = path.getTotalLength();
                path.style.strokeDasharray = `${length}`;
                path.style.strokeDashoffset = `${length * (1 - progress)}`;
                path.classList.add("unlocking");
                if (progress >= 1) { typeTalentLineUnlock = null; path.classList.remove("unlocking"); path.style.strokeDasharray = ""; path.style.strokeDashoffset = ""; }
            }
        }
        body.querySelectorAll(".tt-link.lit:not(.unlocking)").forEach(path => {
            path.style.strokeDasharray = "3 3";
            path.style.strokeDashoffset = `${-(typeTalentMapTime * 8) % 6}`;
        });
        typeTalentMapFrame = requestAnimationFrame(tick);
    };
    typeTalentMapFrame = requestAnimationFrame(tick);
}
function investTypeTalent(type, nodeId) {
    const tree = TYPE_TALENT_TREES[type];
    if (!tree || typeTalentPoints <= 0) return;
    const branch = tree.branches.find(path => path.nodes.some(node => node.id === nodeId));
    if (!branch) return;
    const index = branch.nodes.findIndex(node => node.id === nodeId);
    const rank = typeTalentRank(nodeId, type);
    if (rank >= TYPE_TALENT_MAX_RANK || !["available", "learned"].includes(typeTalentNodeState(type, branch, index))) return;
    if (!typeTalentRanks[type]) typeTalentRanks[type] = {};
    typeTalentRanks[type][nodeId] = rank + 1;
    typeTalentPoints--;
    if (rank === 0) typeTalentLineUnlock = { type, nodeId, startedAt: 0 };
    saveGame();
    renderTypeTalentTree();
    if (rank === 0) {
        typeTalentLineUnlock.startedAt = performance.now();
        startTypeTalentMapFlow();
    }
}
function resetAllTypeTalents() {
    const refund = typeTalentSpent();
    if (!refund) return;
    if (!confirm(`重置整張天賦圖並返還 ${refund} 點天賦點？`)) return;
    typeTalentPoints += refund;
    typeTalentRanks = {};
    saveGame();
    renderTypeTalentTree();
}
function renderTypeTalentTree() {
    const body = $("pg-body");
    if (homeTabOn !== "talents" || !body) return;
    const scroll = body.scrollTop;
    body.innerHTML = typeTalentTreeMarkup();
    body.scrollTop = scroll;
}
function pageTypeTalents() {
    if (!typeTalentHasSelectedTree) {
        typeTalentSelected = { type: "", node: "" };
        typeTalentHasSelectedTree = true;
    }
    return typeTalentTreeMarkup();
}
function typeTalentLaneNodes(type) { return TYPE_TALENT_TREES[type].branches.flatMap(branch => branch.nodes); }
function typeTalentLaneStep(type, item) { return TYPE_TALENT_TREES[type].branches.slice(0, item.branchIndex).reduce((count, branch) => count + branch.nodes.length, 0) + item.index; }
function typeTalentTreeMarkup() {
    const types = Object.keys(TYPE_TALENT_TREES);
    const allNodes = [];
    types.forEach(type => TYPE_TALENT_TREES[type].branches.forEach((branch, branchIndex) => branch.nodes.forEach((node, index) => allNodes.push({ type, branch, branchIndex, index, node, isPassive: false }))));
    types.forEach(type => allNodes.push({ type, isPassive: true, node: { id: `passive_${type}`, title: TYPE_PASSIVES[type].name, desc: TYPE_PASSIVES[type].desc } }));
    let selected = allNodes.find(item => item.node.id === typeTalentSelected.node && item.type === typeTalentSelected.type);
    if (!selected) selected = allNodes.find(item => !item.isPassive && ["available", "learned"].includes(typeTalentNodeState(item.type, item.branch, item.index))) || allNodes.find(item => !item.isPassive) || allNodes[0];
    typeTalentSelected = { type: selected.type, node: selected.node.id };
    // 五條直列車道＝五種攻擊型態，由下往上讀；同一分支的兩顆用實線綁住，跨分支換虛線，車道頂端留給被動。
    const laneX = [10, 30, 50, 70, 90];
    const routePoint = (lane, step) => [laneX[lane], 83 - step * 13];
    const passivePoint = lane => [laneX[lane], 6];
    const laneHue = type => TYPE_TALENT_COLORS[type];
    const links = types.map((type, lane) => {
        const nodes = typeTalentLaneNodes(type);
        const stem = `<path class="tt-link stem" d="M ${laneX[lane]} 92 L ${routePoint(lane, 0).join(" ")}"/>`;
        const chain = nodes.map((node, index) => {
            const lit = typeTalentRank(node.id, type) > 0;
            if (!index) return "";
            const a = routePoint(lane, index - 1), b = routePoint(lane, index);
            return `<path class="tt-link${lit ? " lit" : ""}${index % 2 ? " tie" : " cross"}" data-link-id="${node.id}" d="M ${a[0]} ${a[1]} L ${b[0]} ${b[1]}"/>`;
        }).join("");
        const toPassive = `<path class="tt-link cross${typeTalentTreeMaxed(type) ? " lit" : ""}" data-link-id="passive_${type}" d="M ${routePoint(lane, nodes.length - 1).join(" ")} L ${passivePoint(lane).join(" ")}"/>`;
        return `<g style="--lane-color:${laneHue(type)}">${stem}${chain}${toPassive}</g>`;
    }).join("");
    const lanes = types.map((type, lane) => {
        const learned = typeTalentLaneNodes(type).filter(node => typeTalentRank(node.id, type) > 0).length;
        const total = typeTalentLaneNodes(type).length;
        return `<span class="tt-lane" style="left:${laneX[lane]}%;--lane-color:${laneHue(type)}" aria-hidden="true"></span><span class="tt-lane-foot${typeTalentTreeMaxed(type) ? " done" : ""}" style="left:${laneX[lane]}%;--lane-color:${laneHue(type)}"><b>${TYPE_INFO[type].n}</b><i>${learned}/${total}</i></span>`;
    }).join("");
    const nodes = allNodes.map(item => {
        const { type, node, isPassive } = item, lane = types.indexOf(type);
        const active = selected.node.id === node.id && selected.type === type;
        const position = isPassive ? passivePoint(lane) : routePoint(lane, typeTalentLaneStep(type, item));
        const rank = isPassive ? 0 : typeTalentRank(node.id, type);
        const state = isPassive ? (typeTalentTreeMaxed(type) ? "passive-active" : "passive-locked") : typeTalentNodeState(type, item.branch, item.index);
        const iconKey = isPassive ? TYPE_TALENT_PASSIVE_ICON[type] : TYPE_TALENT_ICON_BY_ID[node.id];
        const label = `${TYPE_INFO[type].n}・${node.title}${isPassive ? (typeTalentTreeMaxed(type) ? "（被動生效中）" : "（完成車道解鎖）") : ` ${rank}/${TYPE_TALENT_MAX_RANK} 級`}`;
        const badge = isPassive || !rank ? "" : `<i>${rank}</i>`;
        return `<button class="tt-node ${state}${isPassive ? " tt-passive-node" : ""}${active ? " selected" : ""}" type="button" style="left:${position[0]}%;top:${position[1]}%;--lane-color:${laneHue(type)}" title="${label}" aria-label="${label}" onclick="selectTypeTalentNode('${type}','${node.id}')">${typeTalentIconMarkup(iconKey)}${badge}</button>`;
    }).join("");
    const selectedRank = selected.isPassive ? 0 : typeTalentRank(selected.node.id, selected.type);
    const currentState = selected.isPassive ? (typeTalentTreeMaxed(selected.type) ? "unlocked" : "locked") : typeTalentNodeState(selected.type, selected.branch, selected.index);
    const detailTitle = selected.isPassive ? TYPE_PASSIVES[selected.type].name : selected.node.title;
    const laneSize = typeTalentLaneNodes(selected.type).length;
    const detailDescription = selected.isPassive
        ? `${TYPE_PASSIVES[selected.type].desc} ${typeTalentTreeMaxed(selected.type) ? "車道已點滿，被動目前自動生效。" : `需將此車道 ${laneSize} 顆天賦全部升到 ${TYPE_TALENT_MAX_RANK} 級。`}`
        : `${selectedRank ? `目前 ${selectedRank}/${TYPE_TALENT_MAX_RANK} 級。` : ""}${selected.node.desc}`;
    const canInvest = !selected.isPassive && typeTalentPoints > 0 && currentState !== "maxed" && currentState !== "locked";
    // 停用原因要分「沒點數」與「車道前一顆還沒點」，否則第一顆節點會顯示錯誤的提示。
    const learnHint = currentState === "maxed" ? `每顆節點最高 ${TYPE_TALENT_MAX_RANK} 級`
        : !typeTalentPoints ? "目前沒有可用點數"
        : currentState === "locked" ? "需先點亮同車道前一顆" : "消耗 1 點天賦點";
    const passiveMaxed = typeTalentTreeMaxed(selected.type);
    const detailAction = selected.isPassive
        ? `<div class="tt-passive-state${passiveMaxed ? " active" : ""}"><span class="tt-passive-mark" aria-hidden="true">✧</span><span>${passiveMaxed ? "被動自動生效中<small>車道點滿就成立，不需要開關</small>" : `車道尚未點滿<small>完成此車道的 ${laneSize} 顆天賦</small>`}</span></div>`
        : `<button class="tt-learn" type="button" onclick="investTypeTalent('${selected.type}','${selected.node.id}')" ${canInvest ? "" : "disabled"}><span aria-hidden="true">✦</span><span>${currentState === "maxed" ? "已滿級" : selectedRank ? `升級至 ${selectedRank + 1}/${TYPE_TALENT_MAX_RANK}` : currentState === "available" ? "學習天賦" : "尚未解鎖"}<small>${learnHint}</small></span></button>`;
    const passiveCount = types.filter(type => typeTalentTreeMaxed(type)).length;
    return `<div class="tt-shell" style="--lane-color:${laneHue(selected.type)}">
        <header class="tt-header">
            <div class="tt-heading"><h2>攻擊型態天賦</h2><small>五型 30 節點・被動 ${passiveCount} / 5</small></div>
            <div class="tt-point" title="每達 RANK 5 倍數獲得 1 點天賦點"><span class="tt-point-mark" aria-hidden="true">✦</span><b>${typeTalentPoints}</b><small>天賦點</small></div>
        </header>
        <div class="tt-canvas">
            <div class="tt-lanes">${lanes}</div>
            <svg class="tt-tree-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${links}</svg>
            ${nodes}
        </div>
        <footer class="tt-detail"><div class="tt-branch-name">${TYPE_INFO[selected.type].n}・${selected.isPassive ? "專屬被動" : selected.branch.name}</div><div class="tt-detail-title">${typeTalentIconMarkup(selected.isPassive ? TYPE_TALENT_PASSIVE_ICON[selected.type] : TYPE_TALENT_ICON_BY_ID[selected.node.id])}<b>${detailTitle}</b><em>${selected.isPassive ? "自動生效" : `${selectedRank}/${TYPE_TALENT_MAX_RANK}`}</em></div><p>${detailDescription}</p><div class="tt-detail-actions"><button class="tt-reset" type="button" onclick="resetAllTypeTalents()" ${typeTalentSpent() ? "" : "disabled"}><span aria-hidden="true">↺</span><span>重置天賦<small>返還 ${typeTalentSpent()} 點</small></span></button>${detailAction}</div></footer>
    </div>`;
}
