const BETA_SOUVENIRS = ["beta-pioneer", "beta-frame", "beta-founder"];
const BETA_DAILY_STAMINA = 120;
const BETA_LOGIN_REWARDS = [
    { name: "開拓見面禮", gold: 50000 },
    { name: "探索補給", stamina: 200 },
    { name: "基礎養成包", experience: 30, jelly: 60, blockScrap: 30 },
    { name: "開拓資金", gold: 100000 },
    { name: "冒險補給", stamina: 300 },
    { name: "角色經驗包", experience: 50, highExperience: 5 },
    { name: "常駐五星召喚券", tickets: 1 },
    { name: "遠征資金", gold: 150000 },
    { name: "遠征補給", stamina: 300 },
    { name: "高級養成包", highExperience: 10, breakthrough: 10 },
    { name: "公會資金", gold: 200000 },
    { name: "最終衝刺補給", stamina: 500 },
    { name: "稀有素材包", monsterCrystal: 60, breakthrough: 10, bossMaterials: 2 },
    { name: "常駐五星召喚券", tickets: 1 }
];

window.BetaEvent = Object.freeze({
    normalize(raw) {
        const source = raw && typeof raw === "object" ? raw : {};
        const dates = value => [...new Set((Array.isArray(value) ? value : [])
            .filter(day => typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day)))].sort().slice(0, 14);
        const allowed = ["welcome", "memorial", ...Array.from({ length:14 }, (_, i) => "login" + (i + 1)),
            ...Array.from({ length:4 }, (_, i) => "mission" + i)];
        const claimed = [...new Set((Array.isArray(source.claimed) ? source.claimed : []).filter(id => allowed.includes(id)))];
        const souvenirs = new Set((Array.isArray(source.souvenirs) ? source.souvenirs : []).filter(id => BETA_SOUVENIRS.includes(id)));
        if (source.memorial === true || claimed.includes("memorial")) {
            souvenirs.add("beta-pioneer");
            souvenirs.add("beta-frame");
        }
        if ([0,1,2,3].every(i => claimed.includes("mission" + i))) souvenirs.add("beta-founder");
        return {
            start: typeof source.start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(source.start) ? source.start : "",
            logins: dates(source.logins), daily: dates(source.daily), supply: dates(source.supply), claimed,
            tickets: Math.max(0, Math.min(2, Math.floor(Number(source.tickets) || 0))),
            battles: Math.max(0, Math.min(10, Math.floor(Number(source.battles) || 0))),
            baseline: source.baseline && typeof source.baseline === "object" ? source.baseline : null,
            memorial: souvenirs.has("beta-pioneer"), souvenirs: [...souvenirs],
            badgeEquipped: source.badgeEquipped !== false,
            launchVersion: typeof source.launchVersion === "string" ? source.launchVersion.slice(0, 40) : "",
            lastSummon: typeof source.lastSummon === "string" ? source.lastSummon.slice(0, 100) : ""
        };
    },
    pick(pool, owned, random = Math.random()) {
        const missing = pool.filter(id => !owned.has(id));
        const candidates = missing.length ? missing : pool;
        return candidates[Math.min(candidates.length - 1, Math.floor(Math.max(0, Math.min(.999999999, random)) * candidates.length))] || null;
    },
    prepareLaunchSave(save, version) {
        const state = this.normalize(save.betaEventState);
        if (!state.start || state.launchVersion === version) return save;
        return {
            v:save.v, picked:false, accountCreated:save.accountCreated, accountName:save.accountName,
            accountAvatarFrameId:state.souvenirs.includes("beta-frame") ? "beta-frame" : "title",
            titleOn:state.souvenirs.includes("beta-founder") ? "beta-founder" : "novice",
            shakeOn:save.shakeOn,
            betaEventState:this.normalize({ start:state.start, souvenirs:state.souvenirs,
                badgeEquipped:state.badgeEquipped, launchVersion:version })
        };
    }
});

let betaEventBusy = false;
let betaEventLoginAttempt = "";
let betaEventTab = "overview";

function betaEventPhase() { return GAME_DATA.betaEvent?.phase || "beta"; }
function betaOwns(id) { return BetaEvent.normalize(betaEventState).souvenirs.includes(id); }
function betaEventActive() {
    if (betaEventPhase() !== "beta" || !betaEventState?.start) return false;
    const days = checkinDateGap(betaEventState.start, taipeiDateKey());
    return days >= 0 && days < 14;
}
function betaExperienceAmount(amount) { return amount * (betaEventActive() ? 2 : 1); }
function recordBetaEventBattle() {
    if (!GATE_MODE && betaEventActive()) betaEventState.battles = Math.min(10, (betaEventState.battles || 0) + 1);
}
function recordBetaEventLogin() {
    const today = taipeiDateKey();
    if (GATE_MODE || !betaEventState?.start || !betaEventActive() ||
        betaEventState.logins.includes(today) || betaEventLoginAttempt === today) return;
    betaEventLoginAttempt = today;
    betaEventVisit();
}
function betaEventBaseline() {
    return { kills, bosses:Object.values(bossWin).reduce((sum, n) => sum + n, 0),
        expedition:expeditionNormalClearCount,
        levels:Object.fromEntries(CHAR_IDS.map(id => [id, roster[id].lvl])) };
}
function betaEventVisit() {
    if (GATE_MODE || betaEventPhase() !== "beta") return true;
    const saved = saveStore.read();
    if (saved.ok && JSON.stringify(BetaEvent.normalize(saved.data.betaEventState)) !== JSON.stringify(BetaEvent.normalize(betaEventState))) return false;
    const previous = structuredClone(betaEventState);
    betaEventState = BetaEvent.normalize(betaEventState);
    if (!betaEventState.start) {
        betaEventState.start = taipeiDateKey();
        betaEventState.baseline = betaEventBaseline();
    }
    const today = taipeiDateKey();
    if (betaEventActive() && !betaEventState.logins.includes(today)) betaEventState.logins.push(today);
    if (JSON.stringify(previous) === JSON.stringify(betaEventState)) return true;
    if (!saveGame()) {
        betaEventState = previous;
        hmToast("活動進度儲存失敗，請稍後再試。");
        return false;
    }
    return true;
}
function betaEventMissions() {
    const baseline = betaEventState?.baseline || betaEventBaseline();
    return [
        { name:"完成 10 次戰鬥", detail:"波利塔每波／副本通關皆計入", value:betaEventState?.battles || 0, goal:10, draws:5 },
        { name:"擊破 1 次境界 BOSS", detail:"四屬性境界任選一位", value:Math.max(0, Object.values(bossWin).reduce((sum, n) => sum + n, 0) - baseline.bosses), goal:1, draws:5 },
        { name:"完成普通巴風特連擊", detail:"成功通關 1 次", value:Math.max(0, expeditionNormalClearCount - baseline.expedition), goal:1, draws:10 },
        { name:"培養 1 名角色至 Lv.20", detail:"已達等級的角色也符合資格", value:Math.max(0, ...CHAR_IDS.filter(id => roster[id].unlocked).map(id => roster[id].lvl)), goal:20, draws:10 }
    ];
}
function betaRewardLines(reward) {
    const labels = { gold:"金幣", stamina:"體力", experience:"經驗水晶", highExperience:"高階經驗水晶",
        jelly:"果凍碎塊", blockScrap:"方塊邊角料", monsterCrystal:"魔物結晶", breakthrough:"限定突破石",
        bossMaterials:"四屬性 BOSS 素材各", tickets:"常駐五星召喚券" };
    return Object.entries(reward).filter(([key]) => labels[key])
        .map(([key, amount]) => labels[key] + " ×" + amount.toLocaleString("zh-TW"));
}
function betaRewardIcon(reward) {
    if (reward.tickets) return "asset/ui/beta/five-star-ticket.svg";
    if (reward.gold) return "asset/items/gold-coin.svg";
    if (reward.stamina) return "asset/ui/beta/stamina.svg";
    if (reward.bossMaterials) return "asset/ui/beta/material-chest.svg";
    if (reward.breakthrough) return "asset/items/breakthrough-stone-four.png";
    if (reward.highExperience) return "asset/items/high-grade-experience-crystal.png";
    return "asset/ui/beta/material-chest.svg";
}
function betaClaimButton(id, text, ready, done = false) {
    return `<button type="button" class="beta-claim${done ? " is-claimed" : ""}" onclick="claimBetaEvent('${id}')" ${!ready || betaEventBusy ? "disabled" : ""}>${done ? "已領取" : text}</button>`;
}
function setBetaEventTab(tab) {
    if (!["overview", "login", "missions", "memorial", "rules"].includes(tab)) return;
    betaEventTab = tab;
    renderPage();
    document.querySelector('.beta-nav [aria-selected="true"]')?.focus({ preventScroll:true });
}
function betaEventLoginHTML() {
    const state = betaEventState, active = betaEventActive();
    return `<div class="beta-section-heading"><div><small>LOGIN REWARDS</small><h3>14 日登入獎勵</h3></div><b>${state.logins.length} / 14 天</b></div>
        <p class="beta-copy">每日十連另行領取；第 7、14 天各有一張常駐五星券。</p>
        <div class="beta-login-grid">${BETA_LOGIN_REWARDS.map((reward, i) => {
            const day = i + 1, done = state.claimed.includes("login" + day), ready = active && state.logins.length >= day && !done;
            return `<article class="beta-day${reward.tickets ? " is-special" : ""}${ready ? " is-ready" : ""}${done ? " is-claimed" : ""}">
                <div class="beta-day-top"><b>DAY ${String(day).padStart(2, "0")}</b><span>${done ? "✓" : reward.tickets ? "五星保證" : ""}</span></div>
                <img src="${betaRewardIcon(reward)}" alt="" loading="lazy"><h4>${reward.name}</h4>
                <div class="beta-reward-lines">${betaRewardLines(reward).map(line => `<span>${line}</span>`).join("")}</div>
                ${betaClaimButton("login" + day, ready ? "領取獎勵" : "待登入", ready, done)}
            </article>`;
        }).join("")}</div>`;
}
function betaEventMissionsHTML() {
    const missions = betaEventMissions();
    return `<div class="beta-section-heading"><div><small>TESTER MISSIONS</small><h3>封測挑戰 · 共 30 抽</h3></div><b>${missions.filter(m => m.value >= m.goal).length} / 4</b></div>
        <div class="beta-mission-list">${missions.map((mission, i) => {
            const done = betaEventState.claimed.includes("mission" + i), ready = betaEventActive() && mission.value >= mission.goal && !done;
            return `<article class="beta-mission"><span class="beta-mission-number">0${i + 1}</span><div><h4>${mission.name}</h4><p>${mission.detail}</p>
                <div class="beta-meter" role="progressbar" aria-label="${mission.name}" aria-valuemin="0" aria-valuemax="${mission.goal}" aria-valuenow="${Math.min(mission.value, mission.goal)}"><i style="width:${Math.min(100, mission.value / mission.goal * 100)}%"></i></div>
                <small>${Math.min(mission.value, mission.goal)} / ${mission.goal} · 單抽券 ×${mission.draws}</small></div>
                ${betaClaimButton("mission" + i, "領取", ready, done)}</article>`;
        }).join("")}</div>
        <div class="beta-founder-goal"><span class="beta-art-title"><img src="asset/ui/beta/founder-title-v2.png" alt=""><b>創世見證者</b></span><p>領取全部 4 項任務獎勵，即解鎖限定稱號「創世見證者」。</p></div>`;
}
function betaEventMemorialHTML() {
    const state = betaEventState;
    const items = [
        { id:"beta-pioneer", title:"封測先行者", kind:"紀念徽章", file:"pioneer-badge-v2.png", rule:"參加封測並領取紀念獎勵",
            action:`<button type="button" class="beta-claim" onclick="toggleBetaBadge()" ${!betaOwns("beta-pioneer") ? "disabled" : ""}>${state.badgeEquipped ? "隱藏徽章" : "展示徽章"}</button>` },
        { id:"beta-frame", title:"異界開拓者", kind:"限定頭像框", file:"pioneer-frame-v2.png", rule:"參加封測並領取紀念獎勵",
            action:`<button type="button" class="beta-claim" onclick="setAccountAvatarFrame('beta-frame')" ${!betaOwns("beta-frame") ? "disabled" : ""}>${accountAvatarFrameId === "beta-frame" ? "已套用" : "套用頭像框"}</button>` },
        { id:"beta-founder", title:"創世見證者", kind:"限定稱號", file:"founder-title-v2.png", rule:"領取全部 4 項封測任務獎勵",
            action:`<button type="button" class="beta-claim" onclick="openTitleApply('beta-founder')" ${!betaOwns("beta-founder") ? "disabled" : ""}>${titleOn === "beta-founder" ? "目前展示" : "套用稱號"}</button>` }
    ];
    return `<div class="beta-section-heading"><div><small>FOUNDERS COLLECTION</small><h3>留給開拓者的紀念</h3></div><b>正式開服保留</b></div>
        <div class="beta-collection">${items.map(item => `<article class="beta-souvenir ${betaOwns(item.id) ? "is-owned" : ""}">
            <div class="beta-souvenir-art">${item.id === "beta-founder"
                ? `<span class="beta-art-title"><img src="asset/ui/beta/${item.file}" alt=""><b>${item.title}</b></span>`
                : `<img src="asset/ui/beta/${item.file}" alt="${item.title}" loading="lazy">`}</div>
            <small>${item.kind}</small><h4>${item.title}</h4><p>${item.rule}</p><span class="beta-owned-state">${betaOwns(item.id) ? "已收藏 · 永久保留" : "尚未解鎖"}</span>${item.action}</article>`).join("")}</div>
        <div class="beta-collection-claim">${betaClaimButton("memorial", "領取徽章與頭像框", betaEventActive() && !state.memorial, state.memorial)}</div>`;
}
function pageBetaEvent() {
    if (betaEventVisit() === false) return '<p>活動進度無法同步。請確認儲存空間，並重新載入遊戲後再開啟活動。</p>';
    const state = betaEventState, today = taipeiDateKey(), active = betaEventActive();
    const remaining = active ? Math.max(0, 14 - checkinDateGap(state.start, today)) : 0;
    const dailyDone = state.daily.includes(today), supplyDone = state.supply.includes(today);
    const phase = betaEventPhase();
    const overview = `<section class="beta-overview">
        <div class="beta-daily"><div><small>DAILY FREE SUMMON</small><h3>每日免費十連</h3><p>今天的冒險，從十位夥伴開始。</p></div><img src="asset/items/summon-ticket-ten.svg" alt="十抽招募券 ×1">
            ${betaClaimButton("daily", "領取今日十連", active && !dailyDone, dailyDone)}</div>
        <div class="beta-quick-rewards">
            <article><img src="asset/ui/beta/material-chest.svg" alt=""><div><h4>首次參加贈禮</h4><p>十抽招募券 ×2</p></div>${betaClaimButton("welcome", "領取 20 抽", active && !state.claimed.includes("welcome"), state.claimed.includes("welcome"))}</article>
            <article><img src="asset/ui/beta/stamina.svg" alt=""><div><h4>每日體力補給</h4><p>額外體力 ×${BETA_DAILY_STAMINA}</p></div>${betaClaimButton("supply", "領取補給", active && !supplyDone, supplyDone)}</article>
        </div>
        <div class="beta-buff-strip"><span><b>×2</b>培養經驗</span><span><b>×2</b>戰鬥金幣</span><span><b>×2</b>素材數量</span><small>${active ? "封測加成生效中" : "封測加成已結束"}</small></div>
        <div class="beta-section-heading"><div><small>FIVE-STAR GUARANTEE</small><h3>把新的五星夥伴帶回家</h3></div></div>
        <div class="beta-ticket-panel"><img src="asset/ui/beta/five-star-ticket.svg" alt="常駐五星召喚券"><div><h4>常駐五星召喚券</h4><p>優先未擁有 · 均等機率 · 排除限定</p><small>第 7、14 天各一張 · 持有 ${state.tickets} 張</small></div>
            <button type="button" class="beta-claim" onclick="useBetaFiveStarTicket()" ${!state.tickets || betaEventBusy || phase !== "beta" ? "disabled" : ""}>使用一張</button></div>
        ${state.lastSummon ? `<p class="beta-summon-result" role="status">${esc(state.lastSummon)}</p>` : ""}
        ${betaEventLoginHTML()}
    </section>`;
    const rules = `<section class="beta-rules"><h3>活動規則</h3><p>首次開啟活動頁起算 14 個台灣日曆日，之後每日進入主頁登記累積登入。每日十連與體力補給於台灣時間 00:00 更新，需手動領取，未領取的每日獎勵不累積。</p><p>十連共 140 抽、首次 20 抽、任務合計 30 抽。14 日登入資源與兩張五星券另計。已領過的舊版五星券及十連進度會保留。</p><h3>封測加成</h3><p>使用經驗水晶的角色培養經驗 ×2；波利塔金幣、角色碎片與素材、境界 BOSS 素材、資源副本通關金幣及經驗素材數量 ×2。虹彩石、招募券、商店售價及活動發獎不翻倍。</p><h3>五星券規則</h3><p>未持有常駐五星優先，池內均等機率；全部集齊才抽取重複五星並依原有規則補償。不影響一般卡池保底。活動結束仍可使用已領券，正式開服重置後封測券不保留。</p><h3>正式開服資料處理</h3><p>正式開服版本啟用時，封測角色、抽卡、金幣、素材與關卡進度會重置。已解鎖的紀念徽章、異界開拓者頭像框與創世見證者稱號隨帳號保留。封測期間不執行清檔。</p></section>`;
    const panels = { overview, login:betaEventLoginHTML(), missions:betaEventMissionsHTML(), memorial:betaEventMemorialHTML(), rules };
    return `<section class="beta-event">
        <header class="beta-hero"><div class="beta-hero-copy"><small>PINBALL REALMS · CLOSED BETA</small><span class="beta-season-tag">${phase === "beta" ? "14 日封測限定" : "開服紀念典藏"}</span><h2>異界開拓祭</h2><p>一起成為異界的開拓者</p><div class="beta-hero-total"><strong>190</strong><span>抽招募機會<br>＋2 張常駐五星券</span></div></div>
            <div class="beta-hero-status"><span>${active ? `尚餘 ${remaining} 個活動日` : "封測領獎期已結束"}</span><b>累積登入 ${state.logins.length} / 14</b></div></header>
        <nav class="beta-nav" role="tablist" aria-label="封測活動分類">${[["overview","活動總覽"],["login","14 日登入"],["missions","挑戰任務"],["memorial","限定紀念"],["rules","活動說明"]].map(([id, label]) => `<button type="button" role="tab" id="beta-tab-${id}" aria-selected="${betaEventTab === id}" aria-controls="beta-panel" onclick="setBetaEventTab('${id}')">${label}</button>`).join("")}</nav>
        <div class="beta-toolbar"><span>${active ? "準備好領取今天的驚喜了嗎？" : "已收藏的紀念品可繼續套用"}</span><button type="button" class="beta-claim" onclick="claimAllBetaEventRewards()" ${!active || betaEventBusy ? "disabled" : ""}>一鍵領取</button></div>
        <div class="beta-content" id="beta-panel" role="tabpanel" aria-labelledby="beta-tab-${betaEventTab}">${panels[betaEventTab]}</div>
    </section>`;
}
async function runBetaEventAction(action) {
    if (betaEventBusy || GATE_MODE) return;
    betaEventBusy = true;
    const execute = () => {
        const saved = saveStore.read();
        if (saved.ok && JSON.stringify(BetaEvent.normalize(saved.data.betaEventState)) !== JSON.stringify(BetaEvent.normalize(betaEventState))) {
            hmToast("活動進度已在其他頁面更新，請重新載入遊戲。");
            return;
        }
        const previous = structuredClone({ betaEventState, summonTicketSingle, summonTicketTen, roster, teamIds,
            cultivationMaterials, highGradeExperienceCrystals, gold, stamina, staminaTickAt, towerMaterials, breakthroughStones });
        try {
            const message = action();
            if (!message) return;
            betaEventState = BetaEvent.normalize(betaEventState);
            if (!saveGame()) throw new Error("儲存失敗，獎勵尚未領取");
            homeSig = "";
            hmToast(message);
        } catch (error) {
            ({ betaEventState, summonTicketSingle, summonTicketTen, roster, teamIds, cultivationMaterials,
                highGradeExperienceCrystals, gold, stamina, staminaTickAt, towerMaterials, breakthroughStones } = previous);
            syncTeamField();
            hmToast(error.message);
        }
    };
    const scrollTop = document.getElementById("pg-body")?.scrollTop || 0;
    try {
        if (navigator.locks) await navigator.locks.request("pinball-beta-event-rewards", execute);
        else execute();
    } finally {
        betaEventBusy = false;
        updateUI();
        if (homeTabOn === "beta") {
            renderPage();
            document.getElementById("pg-body").scrollTop = scrollTop;
        }
    }
}
function grantBetaLoginReward(reward) {
    gold = Math.min(9999999999, gold + (reward.gold || 0));
    stamina = Math.min(9999999, stamina + (reward.stamina || 0));
    cultivationMaterials += reward.experience || 0;
    highGradeExperienceCrystals += reward.highExperience || 0;
    breakthroughStones.fourStar += reward.breakthrough || 0;
    betaEventState.tickets += reward.tickets || 0;
    for (const key of ["jelly", "blockScrap", "monsterCrystal"]) towerMaterials[key] += reward[key] || 0;
    if (reward.bossMaterials) {
        for (const key of ["dragonWing", "shellfishTail", "garudaBeak", "thunderCore"]) towerMaterials[key] += reward.bossMaterials;
    }
}
function grantBetaEventClaim(id) {
    if (!betaEventActive()) return false;
    const state = betaEventState, today = taipeiDateKey();
    if (id === "daily" || id === "supply") {
        const dates = id === "daily" ? state.daily : state.supply;
        if (dates.includes(today)) return false;
        dates.push(today);
        if (id === "daily") summonTicketTen++;
        else stamina = Math.min(9999999, stamina + BETA_DAILY_STAMINA);
        return true;
    }
    if (state.claimed.includes(id)) return false;
    if (id === "welcome") summonTicketTen += 2;
    else if (/^login([1-9]|1[0-4])$/.test(id)) {
        const day = Number(id.slice(5));
        if (state.logins.length < day) return false;
        grantBetaLoginReward(BETA_LOGIN_REWARDS[day - 1]);
    } else if (/^mission[0-3]$/.test(id)) {
        const mission = betaEventMissions()[Number(id.slice(7))];
        if (mission.value < mission.goal) return false;
        summonTicketSingle += mission.draws;
    } else if (id === "memorial") state.memorial = true;
    else return false;
    state.claimed.push(id);
    return true;
}
function claimBetaEvent(id) {
    return runBetaEventAction(() => grantBetaEventClaim(id) ? "封測獎勵已領取並保存。" : "");
}
function claimAllBetaEventRewards() {
    return runBetaEventAction(() => {
        const ids = ["daily", "supply", "welcome", ...Array.from({ length:14 }, (_, i) => "login" + (i + 1)),
            ...Array.from({ length:4 }, (_, i) => "mission" + i), "memorial"];
        const count = ids.reduce((total, id) => total + Number(grantBetaEventClaim(id)), 0);
        return count ? `已領取 ${count} 項封測獎勵。` : "";
    });
}
function toggleBetaBadge() {
    return runBetaEventAction(() => {
        if (!betaOwns("beta-pioneer")) return;
        betaEventState.badgeEquipped = !betaEventState.badgeEquipped;
        return betaEventState.badgeEquipped ? "已展示封測先行者徽章。" : "已隱藏封測先行者徽章。";
    });
}
function useBetaFiveStarTicket() {
    return runBetaEventAction(() => {
        if (!betaEventState?.tickets || gachaAnimation?.busy || betaEventPhase() !== "beta") return;
        const pool = CHAR_IDS.filter(id => CHAR_TABLE[id].rarity === 5 && CHAR_TABLE[id].summonCategory === "permanent");
        const id = BetaEvent.pick(pool, new Set(CHAR_IDS.filter(id => roster[id].unlocked)));
        if (!id) throw new Error("常駐五星召喚池目前沒有角色");
        const result = summonUnlock(id);
        if (!result) throw new Error("召喚失敗，召喚券已保留");
        betaEventState.tickets--;
        betaEventState.lastSummon = `獲得 ${CHAR_TABLE[id].name}${result === "new" ? " · NEW" : result === "material" ? " · 重複補償經驗水晶 ×1" : ` · 重複補償碎片 ×${SUMMON_DUPLICATE_FRAGMENTS}`}`;
        return betaEventState.lastSummon;
    });
}
