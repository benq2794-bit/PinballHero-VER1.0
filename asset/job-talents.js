// 五職專屬天賦樹：天賦分頁直接使用這套樹與職業點數。
let jobTalentPoints = 0;
let jobTalentRanks = {};
let jobPassiveActive = false;
const JOB_TALENT_MAX_RANK = 5;
let jobTalentSelected = { job: "warrior", node: "warrior_recovery" };
let jobTalentHasSelectedTree = false;

const JOB_TALENT_TREES = {
    warrior: { title: "戰士・烈風古樹", theme: "warrior", branches: [
        { name: "戰意回流", nodes: [
            { id: "warrior_recovery", title: "旋刃回生", icon: "✦", stat: "STR", desc: "戰士 PF 命中回復比例提高 1%。" },
            { id: "warrior_recovery_cap", title: "生命掠取", icon: "✚", stat: "STR", desc: "PF 單次回復上限再提高最大生命的 2%。" }
        ] },
        { name: "御風身法", nodes: [
            { id: "warrior_float_time", title: "踏風浮游", icon: "⌁", stat: "AGI", desc: "連擊浮游時間延長 0.35 秒。" },
            { id: "warrior_float_gravity", title: "凌空步法", icon: "➤", stat: "AGI", desc: "浮游期間重力再降低 0.08 倍，碰撞仍正常。" }
        ] },
        { name: "破陣劍勢", nodes: [
            { id: "warrior_pf_damage", title: "破陣斬", icon: "⚔", stat: "STR", desc: "PF 傷害提高 5%。" },
            { id: "warrior_float_drag", title: "乘風追擊", icon: "✧", stat: "AGI", desc: "浮游期間空氣阻力再降低，移動更俐落。" }
        ] }
    ] },
    mage: { title: "法師・星界秘樹", theme: "mage", branches: [
        { name: "星爆術式", nodes: [
            { id: "mage_skill_damage", title: "星能增幅", icon: "✧", stat: "INT", desc: "全隊技能傷害提高 2%。" },
            { id: "mage_special_radius", title: "界域擴張", icon: "◉", stat: "INT", desc: "特殊型 PF 的爆裂範圍增加 12%。" }
        ] },
        { name: "時空緩速", nodes: [
            { id: "mage_slow_time", title: "凝滯刻印", icon: "◷", stat: "INT", desc: "擊破弱點時，Boss 讀條額外延長 0.2 秒。" },
            { id: "mage_slow_cap", title: "時域延展", icon: "⌛", stat: "LUK", desc: "星爆時空的總延長上限提高 0.4 秒。" }
        ] },
        { name: "咒式共鳴", nodes: [
            { id: "mage_weak_width", title: "弱點洞察", icon: "◇", stat: "INT", desc: "技能與 PF 的弱點判定範圍增加。" },
            { id: "mage_crit", title: "秘術暴擊", icon: "✦", stat: "LUK", desc: "技能暴擊率提高 2%。" }
        ] }
    ] },
    priest: { title: "牧師・翠光聖樹", theme: "priest", branches: [
        { name: "狂熱共鳴", nodes: [
            { id: "priest_fever_attack", title: "狂熱祝福", icon: "✚", stat: "VIT", desc: "FEVER 期間全隊攻擊加成再提高 10%。" },
            { id: "priest_fever_shield", title: "聖域庇護", icon: "⬡", stat: "VIT", desc: "FEVER 期間額外減傷 4%。" }
        ] },
        { name: "靈能循環", nodes: [
            { id: "priest_gauge", title: "靈泉回流", icon: "◌", stat: "AGI", desc: "非 FEVER 時技能蓄能再提高 5%。" },
            { id: "priest_energy", title: "共鳴脈衝", icon: "ϟ", stat: "AGI", desc: "FEVER 發動時，全隊立即補充 3% 技能能量。" }
        ] },
        { name: "守護祈禱", nodes: [
            { id: "priest_heal", title: "生命禱言", icon: "♡", stat: "VIT", desc: "通過關卡時額外回復全隊 3% 生命。" },
            { id: "priest_resist", title: "堅韌聖印", icon: "▣", stat: "VIT", desc: "全隊最大生命提高 3%。" }
        ] }
    ] },
    thief: { title: "盜賊・幽影魔樹", theme: "thief", branches: [
        { name: "爆裂暗勁", nodes: [
            { id: "thief_shock_damage", title: "暗勁爆發", icon: "✹", stat: "STR", desc: "盜賊範圍衝擊傷害提高 12%。" },
            { id: "thief_shock_radius", title: "震波擴散", icon: "◎", stat: "STR", desc: "盜賊衝擊範圍增加 14px。" }
        ] },
        { name: "影步連襲", nodes: [
            { id: "thief_cooldown", title: "迅影連擊", icon: "➤", stat: "AGI", desc: "範圍衝擊冷卻縮短 100ms。" },
            { id: "thief_combo", title: "追擊節奏", icon: "⌁", stat: "AGI", desc: "每次觸發衝擊額外增加 1 Combo。" }
        ] },
        { name: "致命判讀", nodes: [
            { id: "thief_crit", title: "要害洞悉", icon: "✦", stat: "LUK", desc: "衝擊暴擊率提高 3%。" },
            { id: "thief_crit_damage", title: "致命一擊", icon: "†", stat: "LUK", desc: "衝擊暴擊傷害額外提高 15%。" }
        ] }
    ] },
    archer: { title: "射手・蒼穹靈樹", theme: "archer", branches: [
        { name: "絕對貫穿", nodes: [
            { id: "archer_direct", title: "貫穿箭矢", icon: "➤", stat: "DEX", desc: "射手直擊與貫穿 PF 傷害提高 5%。" },
            { id: "archer_pierce", title: "穿透強化", icon: "≫", stat: "DEX", desc: "射擊 PF 的貫穿傷害再提高 5%。" }
        ] },
        { name: "鷹眼鎖定", nodes: [
            { id: "archer_beam", title: "拓寬光束", icon: "⌖", stat: "INT", desc: "射擊 PF 光束寬度增加 8px。" },
            { id: "archer_weak", title: "弱點追蹤", icon: "◇", stat: "INT", desc: "光束弱點判定寬度增加 8px。" }
        ] },
        { name: "迅捷裝填", nodes: [
            { id: "archer_crit", title: "精準狙擊", icon: "✦", stat: "DEX", desc: "射手直擊暴擊率提高 2%。" },
            { id: "archer_gauge", title: "疾速裝填", icon: "ϟ", stat: "AGI", desc: "射手命中後額外回復技能能量。" }
        ] }
    ] }
};

const JOB_TALENT_COLORS = {
    warrior: { primary: "#a9cbb2", secondary: "#f1f4e7", bg: "#142821" },
    mage: { primary: "#a9cbb2", secondary: "#f1f4e7", bg: "#142821" },
    priest: { primary: "#a9cbb2", secondary: "#f1f4e7", bg: "#142821" },
    thief: { primary: "#a9cbb2", secondary: "#f1f4e7", bg: "#142821" },
    archer: { primary: "#a9cbb2", secondary: "#f1f4e7", bg: "#142821" }
};

function normalizeJobTalentRanks(saved) {
    const normalized = {};
    for (const [job, tree] of Object.entries(JOB_TALENT_TREES)) {
        normalized[job] = {};
        for (const branch of tree.branches) {
            let pathOpen = true;
            for (const node of branch.nodes) {
                const rank = Math.max(0, Math.min(JOB_TALENT_MAX_RANK, Math.floor(Number(saved && saved[job] && saved[job][node.id]) || 0)));
                const learned = rank > 0 && pathOpen;
                if (learned) normalized[job][node.id] = rank;
                else pathOpen = false;
            }
        }
    }
    return normalized;
}
function jobTalentRank(id, job = mainAccountJob) { return Math.max(0, Math.min(JOB_TALENT_MAX_RANK, Math.floor(Number(jobTalentRanks[job] && jobTalentRanks[job][id]) || 0))); }
function jobTalentSpent(job = null) {
    const jobs = job ? [job] : Object.keys(JOB_TALENT_TREES);
    return jobs.reduce((sum, key) => sum + Object.values(jobTalentRanks[key] || {}).reduce((spent, rank) => spent + Math.max(0, Math.min(JOB_TALENT_MAX_RANK, Math.floor(Number(rank) || 0))), 0), 0);
}
function jobTalentTreeMaxed(job) {
    const tree = JOB_TALENT_TREES[job];
    return !!tree && tree.branches.every(branch => branch.nodes.every(node => jobTalentRank(node.id, job) >= JOB_TALENT_MAX_RANK));
}
function isJobPassiveActive(job = mainAccountJob) { return !!jobPassiveActive && job === mainAccountJob && jobTalentTreeMaxed(job); }
function toggleJobPassive(job) {
    if (job !== mainAccountJob || !jobTalentTreeMaxed(job)) return;
    jobPassiveActive = !jobPassiveActive;
    saveGame();
    renderJobTalentTree();
}
function jobTalentNodeState(job, branch, index) {
    const node = branch.nodes[index], rank = jobTalentRank(node.id, job), learned = rank > 0;
    const prior = index === 0 || jobTalentRank(branch.nodes[index - 1].id, job) > 0;
    if (rank >= JOB_TALENT_MAX_RANK) return "maxed";
    // 非主職業只供瀏覽，不顯示可投入狀態。
    if (job !== mainAccountJob) return learned ? "learned" : "locked";
    return learned ? "learned" : prior && jobTalentPoints > 0 ? "available" : "locked";
}
// 依天賦效果挑選外部圖標精靈，顏色由各職業主題 CSS 控制。
const JOB_TALENT_ICON_BY_ID = {
    warrior_recovery: "heart", warrior_recovery_cap: "heart", warrior_float_time: "speed",
    warrior_float_gravity: "arrow", warrior_pf_damage: "sword", warrior_float_drag: "slash",
    mage_skill_damage: "burst", mage_special_radius: "target", mage_slow_time: "moon",
    mage_slow_cap: "moon", mage_weak_width: "eye", mage_crit: "burst",
    priest_fever_attack: "heart", priest_fever_shield: "shield", priest_gauge: "speed",
    priest_energy: "burst", priest_heal: "heart", priest_resist: "shield",
    thief_shock_damage: "slash", thief_shock_radius: "burst", thief_cooldown: "speed",
    thief_combo: "sword", thief_crit: "target", thief_crit_damage: "slash",
    archer_direct: "arrow", archer_pierce: "arrow", archer_beam: "target",
    archer_weak: "eye", archer_crit: "target", archer_gauge: "speed"
};
const JOB_TALENT_PASSIVE_ICON = { warrior: "sword", mage: "burst", priest: "shield", thief: "slash", archer: "target" };
function jobTalentIconMarkup(key, extraClass = "", job = jobTalentSelected.job) {
    const valid = ["shield", "heart", "sword", "slash", "target", "arrow", "burst", "moon", "speed", "eye"];
    const icon = valid.includes(key) ? key : "burst";
    const palette = "warrior"; // 五職共用冷調圖標色，不依職業改色。
    return `<img class="jt-icon ${extraClass}" src="asset/ui/job-talent-icons/${palette}-${icon}.png" alt="" aria-hidden="true" draggable="false">`;
}
function selectJobTalentNode(job, nodeId) {
    jobTalentHasSelectedTree = true;
    jobTalentSelected = { job, node: nodeId };
    renderJobTalentTree();
}
function investJobTalent(job, nodeId) {
    const tree = JOB_TALENT_TREES[job];
    if (!tree || job !== mainAccountJob || jobTalentPoints <= 0) return;
    const branch = tree.branches.find(path => path.nodes.some(node => node.id === nodeId));
    if (!branch) return;
    const index = branch.nodes.findIndex(node => node.id === nodeId);
    const rank = jobTalentRank(nodeId, job);
    if (rank >= JOB_TALENT_MAX_RANK || !["available", "learned"].includes(jobTalentNodeState(job, branch, index))) return;
    if (!jobTalentRanks[job]) jobTalentRanks[job] = {};
    jobTalentRanks[job][nodeId] = rank + 1;
    jobTalentPoints--;
    saveGame();
    renderJobTalentTree();
}
function resetJobTalentTree(job) {
    if (job !== mainAccountJob) return;
    const refund = Object.values(jobTalentRanks[job] || {}).reduce((sum, rank) => sum + Math.max(0, Math.min(JOB_TALENT_MAX_RANK, Math.floor(Number(rank) || 0))), 0);
    if (!refund) return;
    if (!confirm(`重置「${ACCOUNT_JOBS[job].n}」天賦樹並返還 ${refund} 點職業天賦點？`)) return;
    jobTalentPoints += refund;
    jobTalentRanks[job] = {};
    jobPassiveActive = false;
    saveGame();
    renderJobTalentTree();
}
function renderJobTalentTree() {
    const body = $("pg-body");
    if (homeTabOn !== "talents" || !body) return;
    const scroll = body.scrollTop;
    body.innerHTML = jobTalentTreeMarkup();
    body.scrollTop = scroll;
}
function pageJobTalents() {
    if (!jobTalentHasSelectedTree) {
        jobTalentSelected = { job: JOB_TALENT_TREES[mainAccountJob] ? mainAccountJob : "warrior", node: "" };
        jobTalentHasSelectedTree = true;
    }
    return jobTalentTreeMarkup();
}
function jobTalentTreeMarkup() {
    const job = JOB_TALENT_TREES[jobTalentSelected.job] ? jobTalentSelected.job : "warrior";
    const tree = JOB_TALENT_TREES[job], colors = JOB_TALENT_COLORS[job];
    const allNodes = tree.branches.flatMap((branch, branchIndex) => branch.nodes.map((node, index) => ({ branch, branchIndex, index, node })));
    const selected = allNodes.find(item => item.node.id === jobTalentSelected.node) || allNodes.find(item => ["available", "learned"].includes(jobTalentNodeState(job, item.branch, item.index))) || allNodes[0];
    jobTalentSelected = { job, node: selected.node.id };
    const positions = [[22, 63], [13, 38], [50, 61], [50, 34], [78, 63], [87, 38]];
    const tabs = Object.entries(ACCOUNT_JOBS).map(([key, info]) => `<button class="jt-job-tab${key === job ? " active" : ""}${key === mainAccountJob ? " equipped" : ""}" type="button" onclick="selectJobTalentNode('${key}', '${JOB_TALENT_TREES[key].branches[0].nodes[0].id}')" style="--job-color:${JOB_TALENT_COLORS[key].primary}"><span class="jt-tab-icon">${jobTalentIconMarkup(JOB_TALENT_PASSIVE_ICON[key], "", key)}</span><span class="jt-tab-copy"><b>${info.n}</b><small>${key === mainAccountJob ? "主職業" : "天賦樹"}</small></span></button>`).join("");
    const links = tree.branches.map((branch, i) => {
        const [x1, y1] = i === 0 ? [50, 82] : i === 1 ? [50, 78] : [50, 82];
        const p1 = positions[i * 2], p2 = positions[i * 2 + 1];
        const on1 = jobTalentRank(branch.nodes[0].id, job) > 0, on2 = jobTalentRank(branch.nodes[1].id, job) > 0;
        const stroke1 = on1 ? colors.primary : "#536878", stroke2 = on2 ? colors.primary : "#536878";
        return `<path class="jt-link ${on1 ? "lit" : ""}" d="M ${x1} ${y1} Q ${p1[0]} ${p1[1] + 8} ${p1[0]} ${p1[1]}" stroke="${stroke1}"/><path class="jt-link ${on2 ? "lit" : ""}" d="M ${p1[0]} ${p1[1] - 5} Q ${p2[0]} ${p2[1] + 12} ${p2[0]} ${p2[1]}" stroke="${stroke2}"/>`;
    }).join("");
    const nodes = allNodes.map(({ branch, branchIndex, index, node }) => {
        const [x, y] = positions[branchIndex * 2 + index], state = jobTalentNodeState(job, branch, index);
        const active = selected.node.id === node.id;
        const iconKey = JOB_TALENT_ICON_BY_ID[node.id];
        const rank = jobTalentRank(node.id, job);
        return `<button class="jt-node ${state}${active ? " selected" : ""}" type="button" style="left:${x}%;top:${y}%;--node-color:${colors.primary}" onclick="selectJobTalentNode('${job}','${node.id}')" aria-label="${node.title}，${rank}/${JOB_TALENT_MAX_RANK}級">${jobTalentIconMarkup(iconKey, "", job)}<small>${node.title}</small>${rank ? `<i>${rank}/${JOB_TALENT_MAX_RANK}</i>` : ""}</button>`;
    }).join("");
    const currentState = jobTalentNodeState(job, selected.branch, selected.index);
    const selectedRank = jobTalentRank(selected.node.id, job);
    const description = job !== mainAccountJob ? (selectedRank ? `目前 ${selectedRank}/${JOB_TALENT_MAX_RANK} 級。${selected.node.desc}` : "此為非主職業預覽，不能投入職業天賦點。") : currentState === "maxed" ? `已達上限 ${JOB_TALENT_MAX_RANK}/${JOB_TALENT_MAX_RANK}。${selected.node.desc}` : selectedRank ? `目前 ${selectedRank}/${JOB_TALENT_MAX_RANK} 級。${selected.node.desc}` : currentState === "available" ? selected.node.desc : `沿著「${selected.branch.name}」分支，先點亮前一個節點。`;
    const activeJobNote = job === mainAccountJob ? "固定主職業｜天賦點滿後可選擇啟動專屬被動。" : `預覽 ${ACCOUNT_JOBS[job].n} 天賦樹；主職業固定，無法投入點數。`;
    const passiveControl = job === mainAccountJob && jobTalentTreeMaxed(job)
        ? `<button class="jt-passive-toggle" type="button" onclick="toggleJobPassive('${job}')"><span aria-hidden="true">✧</span><span>${isJobPassiveActive(job) ? "專屬被動" : "啟動被動"}<small>${isJobPassiveActive(job) ? "已啟用" : "點擊啟用"}</small></span></button>` : "";
    return `<div class="jt-shell jt-embedded" data-theme="${tree.theme}" style="--jt-primary:${colors.primary};--jt-secondary:${colors.secondary};--jt-base:${colors.bg}">
        <header class="jt-header"><div><small>職業天賦</small><h2>${ACCOUNT_JOBS[job].n}</h2></div><div class="jt-point"><b>${job === mainAccountJob ? jobTalentPoints : "—"}</b><small>${job === mainAccountJob ? "可用點數" : "僅供預覽"}</small></div></header>
        <nav class="jt-job-tabs" aria-label="選擇職業天賦樹">${tabs}</nav>
        <div class="jt-active-note">${activeJobNote}${passiveControl}</div>
        <div class="jt-canvas"><div class="jt-mist"></div><svg class="jt-tree-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><radialGradient id="jtCoreGlow"><stop stop-color="${colors.secondary}" stop-opacity=".65"/><stop offset="1" stop-color="${colors.primary}" stop-opacity="0"/></radialGradient></defs>${links}<circle cx="50" cy="83" r="11" fill="url(#jtCoreGlow)"/><circle class="jt-root-orb" cx="50" cy="83" r="4.5"/></svg><div class="jt-root"><span>✧</span><small>核心</small></div>${nodes}<div class="jt-forest-floor"></div></div>
        <footer class="jt-detail"><div class="jt-branch-name">${selected.branch.name}</div><div class="jt-detail-title">${jobTalentIconMarkup(JOB_TALENT_ICON_BY_ID[selected.node.id], "", job)}<b>${selected.node.title}</b></div><p>${description}</p><div class="jt-detail-actions"><button class="jt-reset" type="button" onclick="resetJobTalentTree('${job}')" ${jobTalentSpent(job) && job === mainAccountJob ? "" : "disabled"}><span aria-hidden="true">↺</span><span>重置本職<small>返還已用點數</small></span></button><button class="jt-learn" type="button" onclick="investJobTalent('${job}','${selected.node.id}')" ${job === mainAccountJob && jobTalentPoints > 0 && currentState !== "maxed" && currentState !== "locked" ? "" : "disabled"}><span aria-hidden="true">✦</span><span>${job !== mainAccountJob ? "僅供預覽" : currentState === "maxed" ? "已滿級" : selectedRank ? `升級至 ${selectedRank + 1}/${JOB_TALENT_MAX_RANK}` : currentState === "available" ? "學習天賦" : "尚未解鎖"}<small>${job !== mainAccountJob ? "不能投入點數" : currentState === "maxed" ? "此節點已達上限" : jobTalentPoints > 0 ? "消耗 1 點天賦" : "目前沒有可用點數"}</small></span></button></div></footer>
        <div class="jt-footnote">每達 RANK 5 倍數獲得 1 點｜每個節點最高 5 級</div></div>`;
}

