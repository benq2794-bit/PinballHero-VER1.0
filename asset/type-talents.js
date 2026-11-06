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
function showTypeTalentTooltip(event, node) {
    const text = node?.dataset?.tooltip;
    if (!text) return;
    let tip = document.getElementById("tt-hover-tooltip");
    if (!tip) {
        tip = document.createElement("div");
        tip.id = "tt-hover-tooltip";
        tip.className = "tt-hover-tooltip";
        tip.setAttribute("role", "tooltip");
        document.body.appendChild(tip);
    }
    tip.textContent = text;
    tip.classList.add("visible");
    const margin = 10, gap = 14;
    const rect = tip.getBoundingClientRect();
    const left = Math.max(margin, Math.min(event.clientX + gap, window.innerWidth - rect.width - margin));
    const top = Math.max(margin, Math.min(event.clientY + gap, window.innerHeight - rect.height - margin));
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
}
function hideTypeTalentTooltip() {
    document.getElementById("tt-hover-tooltip")?.classList.remove("visible");
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
    typeTalentSelected = { type, node: nodeId };
    if (rank === 0) typeTalentLineUnlock = { type, nodeId, startedAt: 0 };
    saveGame();
    renderTypeTalentTree();
    if (rank === 0) {
        typeTalentLineUnlock.startedAt = performance.now();
        startTypeTalentMapFlow();
    }
}
function refundTypeTalent(type, nodeId) {
    const tree = TYPE_TALENT_TREES[type];
    if (!tree) return;
    const sequence = tree.branches.flatMap(branch => branch.nodes);
    const index = sequence.findIndex(node => node.id === nodeId);
    if (index < 0) return;
    const rank = typeTalentRank(nodeId, type);
    if (!rank) return;
    if (!typeTalentRanks[type]) typeTalentRanks[type] = {};
    typeTalentRanks[type][nodeId] = rank - 1;
    let refunded = 1;
    // 若節點完全歸零，後續依賴節點一併退回，避免留下不符合前置條件的天賦。
    if (rank === 1) {
        for (const node of sequence.slice(index + 1)) {
            const downstreamRank = typeTalentRank(node.id, type);
            if (downstreamRank > 0) {
                refunded += downstreamRank;
                typeTalentRanks[type][node.id] = 0;
            }
        }
    }
    typeTalentPoints += refunded;
    typeTalentSelected = { type, node: nodeId };
    saveGame();
    renderTypeTalentTree();
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
    hideTypeTalentTooltip();
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
        const effect = isPassive ? TYPE_PASSIVES[type].desc : node.desc;
        const label = `${TYPE_INFO[type].n}・${node.title}${isPassive ? (typeTalentTreeMaxed(type) ? "（該道天賦點滿自動解鎖・被動生效中）" : "（該道天賦點滿自動解鎖）") : ` ${rank}/${TYPE_TALENT_MAX_RANK} 級`}`;
        const badge = isPassive || !rank ? "" : `<i>${rank}</i>`;
        const tooltip = `${label}\n效果：${effect}`;
        const tooltipAttr = tooltip.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
        const actions = isPassive ? "" : `onclick="investTypeTalent('${type}','${node.id}')" oncontextmenu="event.preventDefault();refundTypeTalent('${type}','${node.id}');return false"`;
        return `<button class="tt-node ${state}${isPassive ? " tt-passive-node" : ""}${active ? " selected" : ""}" type="button" style="left:${position[0]}%;top:${position[1]}%;--lane-color:${laneHue(type)}" data-tooltip="${tooltipAttr}" aria-label="${tooltipAttr}" onmouseenter="showTypeTalentTooltip(event,this)" onmousemove="showTypeTalentTooltip(event,this)" onmouseleave="hideTypeTalentTooltip()" ${actions}>${typeTalentIconMarkup(iconKey)}${badge}</button>`;
    }).join("");
    const passiveCount = types.filter(type => typeTalentTreeMaxed(type)).length;
    return `<div class="tt-shell" style="--lane-color:${laneHue(selected.type)}">
        <header class="tt-header">
            <div class="tt-heading"><h2>攻擊型態天賦</h2><small>30 節點・被動 ${passiveCount}/5・左鍵解鎖／右鍵返還・懸浮看效果</small></div>
            <div class="tt-header-actions"><button class="tt-reset-mini" type="button" onclick="resetAllTypeTalents()" ${typeTalentSpent() ? "" : "disabled"} title="重置天賦並返還全部點數">↺ 重置</button><div class="tt-point" title="每達 RANK 5 倍數獲得 1 點天賦點"><span class="tt-point-mark" aria-hidden="true">✦</span><b>${typeTalentPoints}</b><small>天賦點</small></div></div>
        </header>
        <div class="tt-canvas">
            <div class="tt-lanes">${lanes}</div>
            <svg class="tt-tree-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${links}</svg>
            ${nodes}
        </div>
    </div>`;
}
