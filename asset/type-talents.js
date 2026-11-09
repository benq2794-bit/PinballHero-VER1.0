// 攻擊型態天賦樹：天賦分頁直接使用這套樹與帳號天賦點。
// 車道 key 是 TYPE_INFO 的五種攻擊型態（職業系統已移除，不再以職業分組）。
let typeTalentPoints = 0;
let typeTalentRanks = {};
const TYPE_TALENT_MAX_RANK = GAME_DATA.progression.typeTalents.maxRank;
const TYPE_TALENT_POOL_LIMIT = 33;
const TYPE_TALENT_TYPE_LIMIT = 11;
const TYPE_TALENT_PASSIVE_LIMIT = 3;
const TYPE_TALENT_PASSIVE_PREREQUISITE = 5;
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
    let passives = 0, spent = 0;
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
        const passiveKey = `passive_${type}`;
        const normal = Object.values(normalized[type]).reduce((sum, rank) => sum + rank, 0);
        const progress = Object.values(normalized[type]).filter(rank => rank > 0).length;
        if (saved?.[type]?.[passiveKey] === 1 && progress >= TYPE_TALENT_PASSIVE_PREREQUISITE &&
            passives < TYPE_TALENT_PASSIVE_LIMIT && normal < TYPE_TALENT_TYPE_LIMIT &&
            spent + normal < TYPE_TALENT_POOL_LIMIT) {
            normalized[type][passiveKey] = 1;
            passives++;
            spent++;
        }
        spent += normal;
    }
    return normalized;
}
function typeTalentRank(id, type = (Object.keys(TYPE_TALENT_TREES).find(key => String(id).startsWith(`${key}_`)) || typeTalentSelected.type)) { return Math.max(0, Math.min(TYPE_TALENT_MAX_RANK, Math.floor(Number(typeTalentRanks[type] && typeTalentRanks[type][id]) || 0))); }
function typeTalentPassiveKey(type) { return `passive_${type}`; }
function typeTalentOrdinaryProgress(type, ranks = typeTalentRanks) {
    const nodes = typeTalentLaneNodes(type);
    return Math.min(TYPE_TALENT_PASSIVE_PREREQUISITE, nodes.filter(node => Number(ranks[type]?.[node.id]) > 0).length);
}
function typeTalentTypeSpent(type, ranks = typeTalentRanks) {
    const nodes = typeTalentLaneNodes(type);
    const normal = nodes.reduce((spent, node) => spent + Math.max(0, Math.min(TYPE_TALENT_MAX_RANK, Math.floor(Number(ranks[type]?.[node.id]) || 0))), 0);
    return normal + (Number(ranks[type]?.[typeTalentPassiveKey(type)]) === 1 ? 1 : 0);
}
function typeTalentSpent(type = null, ranks = typeTalentRanks) {
    const types = type ? [type] : Object.keys(TYPE_TALENT_TREES);
    return types.reduce((sum, key) => sum + typeTalentTypeSpent(key, ranks), 0);
}
function typeTalentPassiveCount(ranks = typeTalentRanks) {
    return Object.keys(TYPE_TALENT_TREES).filter(type => Number(ranks[type]?.[typeTalentPassiveKey(type)]) === 1).length;
}
function typeTalentPassiveUnlocked(type, ranks = typeTalentRanks) {
    return Number(ranks[type]?.[typeTalentPassiveKey(type)]) === 1;
}
function typeTalentPassiveState(type) {
    if (typeTalentPassiveUnlocked(type)) return { state:"passive-active", label:"已啟用", reason:"專屬被動已啟用。" };
    if (typeTalentPassiveCount() >= TYPE_TALENT_PASSIVE_LIMIT)
        return { state:"passive-limit", label:"上限已滿", reason:`已達 ${TYPE_TALENT_PASSIVE_LIMIT} 種專屬被動上限。` };
    if (typeTalentTypeSpent(type) >= TYPE_TALENT_TYPE_LIMIT)
        return { state:"passive-limit", label:"上限已滿", reason:`此攻擊型態已達 ${TYPE_TALENT_TYPE_LIMIT} 點投入上限。` };
    if (typeTalentSpent() >= TYPE_TALENT_POOL_LIMIT)
        return { state:"passive-limit", label:"上限已滿", reason:`共用天賦已達 ${TYPE_TALENT_POOL_LIMIT} 點投入上限。` };
    const progress = typeTalentOrdinaryProgress(type);
    if (progress < TYPE_TALENT_PASSIVE_PREREQUISITE)
        return { state:"passive-locked", label:"未解鎖", reason:`普通天賦需先達 ${TYPE_TALENT_PASSIVE_PREREQUISITE}/5，目前 ${progress}/5。` };
    return { state:"passive-available", label:"可解鎖（消耗 1 點）", reason:typeTalentPoints > 0
        ? "消耗 1 點天賦點手動解鎖專屬被動。"
        : "可解鎖，但目前沒有可用天賦點。" };
}
// Combat and the talent interface share the same explicit passive-unlock state.
function typeTalentTreeMaxed(type) {
    return typeTalentPassiveUnlocked(type);
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
    if (learned) return "learned";
    if (typeTalentTypeSpent(type) >= TYPE_TALENT_TYPE_LIMIT || typeTalentSpent() >= TYPE_TALENT_POOL_LIMIT) return "locked";
    return prior && typeTalentPoints > 0 ? "available" : "locked";
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
    if (!tree || typeTalentPoints <= 0 || typeTalentTypeSpent(type) >= TYPE_TALENT_TYPE_LIMIT ||
        typeTalentSpent() >= TYPE_TALENT_POOL_LIMIT) return;
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
    if (typeTalentPassiveUnlocked(type) && typeTalentOrdinaryProgress(type) < TYPE_TALENT_PASSIVE_PREREQUISITE) {
        delete typeTalentRanks[type][typeTalentPassiveKey(type)];
        typeTalentPoints++;
    }
    typeTalentSelected = { type, node: nodeId };
    saveGame();
    renderTypeTalentTree();
}
function unlockTypeTalentPassive(type) {
    const status = typeTalentPassiveState(type);
    if (status.state !== "passive-available" || typeTalentPoints < 1) return;
    if (!typeTalentRanks[type]) typeTalentRanks[type] = {};
    typeTalentRanks[type][typeTalentPassiveKey(type)] = 1;
    typeTalentPoints--;
    typeTalentSelected = { type, node: typeTalentPassiveKey(type) };
    saveGame();
    renderTypeTalentTree();
}
function refundTypeTalentPassive(type) {
    if (!typeTalentPassiveUnlocked(type)) return;
    delete typeTalentRanks[type][typeTalentPassiveKey(type)];
    typeTalentPoints++;
    typeTalentSelected = { type, node: typeTalentPassiveKey(type) };
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
    types.forEach(type => allNodes.push({ type, isPassive: true, node: { id: typeTalentPassiveKey(type), title: TYPE_PASSIVES[type].name, desc: TYPE_PASSIVES[type].desc } }));
    let selected = allNodes.find(item => item.node.id === typeTalentSelected.node && item.type === typeTalentSelected.type);
    if (!selected) selected = allNodes.find(item => !item.isPassive && ["available", "learned"].includes(typeTalentNodeState(item.type, item.branch, item.index))) || allNodes.find(item => !item.isPassive) || allNodes[0];
    typeTalentSelected = { type: selected.type, node: selected.node.id };
    // 五條直列車道＝五種攻擊型態，由下往上讀；同一分支的兩顆用實線綁住，跨分支換虛線，車道頂端留給被動。
    const laneX = [10, 30, 50, 70, 90];
    const routePoint = (lane, step) => [laneX[lane], 84 - step * 11];
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
        const progress = typeTalentOrdinaryProgress(type), invested = typeTalentTypeSpent(type);
        const passive = typeTalentPassiveState(type);
        const title = passive.reason.replaceAll('"', "&quot;");
        return `<span class="tt-lane" style="left:${laneX[lane]}%;--lane-color:${laneHue(type)}" aria-hidden="true"></span><span class="tt-passive-status ${passive.state}" style="left:${laneX[lane]}%;--lane-color:${laneHue(type)}" title="${title}">${passive.label}</span><span class="tt-lane-foot${typeTalentTreeMaxed(type) ? " done" : ""}" style="left:${laneX[lane]}%;--lane-color:${laneHue(type)}"><b>${TYPE_INFO[type].n}</b><i>普通 ${progress}/5</i><i>投入 ${invested}/${TYPE_TALENT_TYPE_LIMIT}</i></span>`;
    }).join("");
    const nodes = allNodes.map(item => {
        const { type, node, isPassive } = item, lane = types.indexOf(type);
        const active = selected.node.id === node.id && selected.type === type;
        const position = isPassive ? passivePoint(lane) : routePoint(lane, typeTalentLaneStep(type, item));
        const rank = isPassive ? 0 : typeTalentRank(node.id, type);
        const passive = isPassive ? typeTalentPassiveState(type) : null;
        const state = isPassive ? passive.state : typeTalentNodeState(type, item.branch, item.index);
        const iconKey = isPassive ? TYPE_TALENT_PASSIVE_ICON[type] : TYPE_TALENT_ICON_BY_ID[node.id];
        const effect = isPassive ? TYPE_PASSIVES[type].desc : node.desc;
        const label = `${TYPE_INFO[type].n}・${node.title}${isPassive ? `（${passive.label}；${passive.reason}）` : ` ${rank}/${TYPE_TALENT_MAX_RANK} 級`}`;
        const badge = isPassive || !rank ? "" : `<i>${rank}</i>`;
        const tooltip = `${label}\n效果：${effect}`;
        const tooltipAttr = tooltip.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
        const actions = isPassive
            ? `onclick="${typeTalentPassiveUnlocked(type) ? "refund" : "unlock"}TypeTalentPassive('${type}')"`
            : `onclick="investTypeTalent('${type}','${node.id}')" oncontextmenu="event.preventDefault();refundTypeTalent('${type}','${node.id}');return false"`;
        const disabled = isPassive && !typeTalentPassiveUnlocked(type) &&
            (passive.state !== "passive-available" || typeTalentPoints < 1) ? " disabled" : "";
        return `<button class="tt-node ${state}${isPassive ? " tt-passive-node" : ""}${active ? " selected" : ""}" type="button" style="left:${position[0]}%;top:${position[1]}%;--lane-color:${laneHue(type)}" data-tooltip="${tooltipAttr}" aria-label="${tooltipAttr}" title="${isPassive ? passive.reason : ""}" onmouseenter="showTypeTalentTooltip(event,this)" onmousemove="showTypeTalentTooltip(event,this)" onmouseleave="hideTypeTalentTooltip()" ${actions}${disabled}>${typeTalentIconMarkup(iconKey)}${badge}</button>`;
    }).join("");
    const passiveCount = typeTalentPassiveCount();
    return `<div class="tt-shell" style="--lane-color:${laneHue(selected.type)}">
        <header class="tt-header">
            <div class="tt-heading"><h2>攻擊型態天賦</h2><small>共用 33 點・已投入 ${typeTalentSpent()}/33・專屬被動 ${passiveCount}/${TYPE_TALENT_PASSIVE_LIMIT}・左鍵投入／右鍵返還</small></div>
            <div class="tt-header-actions"><button class="tt-reset-mini" type="button" onclick="resetAllTypeTalents()" ${typeTalentSpent() ? "" : "disabled"} title="免費重置並返還全部已投入點數">↺ 重置</button><div class="tt-point" title="天賦點由帳號 RANK 獲得，五種攻擊型態共用"><span class="tt-point-mark" aria-hidden="true">✦</span><b>${typeTalentPoints}</b><small>可用點數</small></div></div>
        </header>
        <div class="tt-canvas">
            <div class="tt-lanes">${lanes}</div>
            <svg class="tt-tree-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${links}</svg>
            ${nodes}
        </div>
    </div>`;
}
