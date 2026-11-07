const BETA_SOUVENIRS = ["beta-pioneer", "beta-frame", "beta-founder"];
const BETA_DAILY_STAMINA = 120;
const BETA_EVENT_HOURS = 336;
const BETA_EVENT_TOTAL_MS = BETA_EVENT_HOURS * 60 * 60 * 1000;
const BETA_EVENT_DAY_MS = 24 * 60 * 60 * 1000;
const BETA_DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
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

// 時間戳是唯一的啟動依據：日期欄位只是它的鏡像，供正式開服遷移判定使用。
function betaLegacyStartMs(start) {
    if (!BETA_DATE_KEY.test(String(start || ""))) return null;
    const [year, month, day] = String(start).split("-").map(Number);
    // 舊存檔只有日期、沒有精確時間，一律對到該日台灣 00:00：寧可少給幾小時，也不能重發 14 天。
    return Date.UTC(year, month - 1, day) - 8 * 60 * 60 * 1000;
}
function betaDateKeyFrom(ms) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(new Date(ms)).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
}

window.BetaEvent = Object.freeze({
    normalize(raw) {
        const source = raw && typeof raw === "object" ? raw : {};
        // 只留最近 32 筆：截太早會把「今天」那筆擠掉，等於讓玩家同一日再領一次。
        const dates = value => [...new Set((Array.isArray(value) ? value : [])
            .filter(day => BETA_DATE_KEY.test(day)))].sort().slice(-32);
        const allowed = ["welcome", "memorial", ...Array.from({ length:14 }, (_, i) => "login" + (i + 1)),
            ...Array.from({ length:4 }, (_, i) => "mission" + i)];
        const claimed = [...new Set((Array.isArray(source.claimed) ? source.claimed : []).filter(id => allowed.includes(id)))];
        const souvenirs = new Set((Array.isArray(source.souvenirs) ? source.souvenirs : []).filter(id => BETA_SOUVENIRS.includes(id)));
        if (source.memorial === true || claimed.includes("memorial")) {
            souvenirs.add("beta-pioneer");
            souvenirs.add("beta-frame");
        }
        if ([0,1,2,3].every(i => claimed.includes("mission" + i))) souvenirs.add("beta-founder");
        const stored = Math.floor(Number(source.startedAt));
        const startedAt = Number.isFinite(stored) && stored > 0 ? stored : betaLegacyStartMs(source.start);
        const start = BETA_DATE_KEY.test(String(source.start || "")) ? source.start : (startedAt === null ? "" : betaDateKeyFrom(startedAt));
        return {
            start, startedAt,
            daily: dates(source.daily), supply: dates(source.supply), claimed,
            tickets: Math.max(0, Math.min(2, Math.floor(Number(source.tickets) || 0))),
            battles: Math.max(0, Math.min(10, Math.floor(Number(source.battles) || 0))),
            baseline: source.baseline && typeof source.baseline === "object" ? source.baseline : null,
            memorial: souvenirs.has("beta-pioneer"), souvenirs: [...souvenirs],
            badgeEquipped: source.badgeEquipped !== false,
            launchVersion: typeof source.launchVersion === "string" ? source.launchVersion.slice(0, 40) : "",
            lastSummon: typeof source.lastSummon === "string" ? source.lastSummon.slice(0, 100) : ""
        };
    },
    startMs(state) {
        const stored = Math.floor(Number(state && state.startedAt));
        return Number.isFinite(stored) && stored > 0 ? stored : betaLegacyStartMs(state && state.start);
    },
    elapsedMs(state, now) {
        const start = this.startMs(state);
        return start === null ? null : Math.max(0, now - start);
    },
    remainingMs(state, now) {
        const elapsed = this.elapsedMs(state, now);
        return elapsed === null ? null : Math.max(0, BETA_EVENT_TOTAL_MS - elapsed);
    },
    isActive(state, now) { return (this.remainingMs(state, now) ?? 0) > 0; },
    // 第 N 天由倒數進度決定，不再看「今天有沒有開啟遊戲」。
    dayNumber(state, now) {
        const elapsed = this.elapsedMs(state, now);
        return elapsed === null ? 0 : Math.min(14, Math.floor(elapsed / BETA_EVENT_DAY_MS) + 1);
    },
    countdownText(ms) {
        const seconds = Math.max(0, Math.floor(ms / 1000));
        const pad = value => String(value).padStart(2, "0");
        return `${Math.floor(seconds / 86400)} 天 ${pad(Math.floor(seconds / 3600) % 24)}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`;
    },
    pick(pool, owned, random = Math.random()) {
        const missing = pool.filter(id => !owned.has(id));
        const candidates = missing.length ? missing : pool;
        return candidates[Math.min(candidates.length - 1, Math.floor(Math.max(0, Math.min(.999999999, random)) * candidates.length))] || null;
    },
    prepareLaunchSave(save, version) {
        const state = this.normalize(save.betaEventState);
        if (state.startedAt === null || state.launchVersion === version) return save;
        return {
            v:save.v, picked:false, accountCreated:save.accountCreated, accountName:save.accountName,
            accountAvatarFrameId:state.souvenirs.includes("beta-frame") ? "beta-frame" : "title",
            titleOn:state.souvenirs.includes("beta-founder") ? "beta-founder" : "novice",
            shakeOn:save.shakeOn,
            betaEventState:this.normalize({ start:state.start, startedAt:state.startedAt, souvenirs:state.souvenirs,
                badgeEquipped:state.badgeEquipped, launchVersion:version })
        };
    }
});

let betaEventBusy = false;
let betaEventTab = "overview";

function betaEventPhase() { return GAME_DATA.betaEvent?.phase || "beta"; }
function betaOwns(id) { return BetaEvent.normalize(betaEventState).souvenirs.includes(id); }
// 打開頁面、登入、看獎勵都不算開始；只有領下第 1 天登入獎勵那一刻才寫時間戳。
function betaEventStarted() { return BetaEvent.startMs(betaEventState) !== null; }
// 336 小時一到：領取入口與全部 ×2 加成同時失效，已入帳的資源、角色與紀念品留著。
function betaEventActive() { return betaEventPhase() === "beta" && betaEventStarted() && BetaEvent.isActive(betaEventState, Date.now()); }
function betaEventExpired() { return betaEventPhase() === "beta" && betaEventStarted() && !BetaEvent.isActive(betaEventState, Date.now()); }
function betaEventDay() { return betaEventStarted() ? BetaEvent.dayNumber(betaEventState, Date.now()) : 0; }
function betaEventStatusText() {
    if (betaEventPhase() !== "beta") return "封測活動已結束";
    if (!betaEventStarted()) return "尚未啟動";
    const remaining = BetaEvent.remainingMs(betaEventState, Date.now());
    return remaining > 0 ? `剩餘 ${BetaEvent.countdownText(remaining)}` : "封測活動已結束";
}
// 倒數啟動只這一條路：時間戳、日期鏡像、任務基準同一次寫入，之後換裝置也不會重置。
function betaEventStart() {
    const now = Date.now();
    betaEventState.startedAt = now;
    betaEventState.start = betaDateKeyFrom(now);
    betaEventState.baseline = betaEventBaseline();
}
function betaExperienceAmount(amount) { return amount * (betaEventActive() ? 2 : 1); }
function recordBetaEventBattle() {
    if (!GATE_MODE && betaEventActive()) betaEventState.battles = Math.min(10, (betaEventState.battles || 0) + 1);
}
function betaEventBaseline() {
    return { kills, bosses:Object.values(bossWin).reduce((sum, n) => sum + n, 0),
        expedition:expeditionNormalClearCount,
        levels:Object.fromEntries(CHAR_IDS.map(id => [id, roster[id].lvl])) };
}
// 只負責比對其他分頁有沒有動過存檔；這頁本身不再寫入任何活動進度。
function betaEventVisit() {
    if (GATE_MODE || betaEventPhase() !== "beta") return true;
    const saved = saveStore.read();
    if (saved.ok && JSON.stringify(BetaEvent.normalize(saved.data.betaEventState)) !== JSON.stringify(BetaEvent.normalize(betaEventState))) return false;
    betaEventState = BetaEvent.normalize(betaEventState);
    return true;
}
function betaEventMissions() {
    const baseline = betaEventState?.baseline || betaEventBaseline();
    // 倒數還沒啟動前不把既有成果算進任務，否則一開始就頂滿進度。
    const progress = value => betaEventStarted() ? Math.max(0, value) : 0;
    return [
        { name:"完成 10 次戰鬥", detail:"波利塔每波／副本通關皆計入", value:progress(betaEventState?.battles || 0), goal:10, draws:5 },
        { name:"擊破 1 次境界 BOSS", detail:"四屬性境界任選一位", value:progress(Object.values(bossWin).reduce((sum, n) => sum + n, 0) - baseline.bosses), goal:1, draws:5 },
        { name:"完成普通巴風特連擊", detail:"成功通關 1 次", value:progress(expeditionNormalClearCount - baseline.expedition), goal:1, draws:10 },
        { name:"培養 1 名角色至 Lv.20", detail:"已達等級的角色也符合資格", value:progress(Math.max(0, ...CHAR_IDS.filter(id => roster[id].unlocked).map(id => roster[id].lvl))), goal:20, draws:10 }
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
// 不能領的時候要講是哪一種：還沒啟動，還是 336 小時已經跑完。
function betaGateLabel(text) {
    if (betaEventActive()) return text;
    return betaEventPhase() === "beta" && !betaEventStarted() ? "啟動後可領" : "活動已結束";
}
function betaLoginReady(day) {
    if (betaEventPhase() !== "beta" || betaEventState.claimed.includes("login" + day)) return false;
    if (!betaEventStarted()) return day === 1;
    return betaEventActive() && BetaEvent.dayNumber(betaEventState, Date.now()) >= day;
}
function setBetaEventTab(tab) {
    if (!["overview", "login", "missions", "memorial", "rules"].includes(tab)) return;
    betaEventTab = tab;
    renderPage();
    document.querySelector('.beta-nav [aria-selected="true"]')?.focus({ preventScroll:true });
}
function betaEventLoginHTML() {
    const started = betaEventStarted(), active = betaEventActive(), day = betaEventDay();
    return `<div class="beta-section-heading"><div><small>LOGIN REWARDS</small><h3>14 日登入獎勵</h3></div><b>第 ${day} / 14 天</b></div>
        <p class="beta-copy">${started ? "各天依 336 小時倒數依次解鎖，離線也照常推進。" : "領取第 1 天獎勵即啟動每位玩家獨立的 336 小時倒數。"}每日十連另行領取；第 7、14 天各有一張常駐五星券。</p>
        <div class="beta-login-grid">${BETA_LOGIN_REWARDS.map((reward, i) => {
            const number = i + 1, done = betaEventState.claimed.includes("login" + number), ready = betaLoginReady(number);
            const text = ready ? (number === 1 && !started ? "領取並啟動倒數" : "領取獎勵")
                : betaEventPhase() !== "beta" || (started && !active) ? "活動已結束"
                : started ? `第 ${number} 天解鎖` : "啟動後解鎖";
            return `<article class="beta-day${reward.tickets ? " is-special" : ""}${ready ? " is-ready" : ""}${done ? " is-claimed" : ""}">
                <div class="beta-day-top"><b>DAY ${String(number).padStart(2, "0")}</b><span>${done ? "✓" : reward.tickets ? "五星保證" : ""}</span></div>
                <img src="${betaRewardIcon(reward)}" alt="" loading="lazy"><h4>${reward.name}</h4>
                <div class="beta-reward-lines">${betaRewardLines(reward).map(line => `<span>${line}</span>`).join("")}</div>
                ${betaClaimButton("login" + number, text, ready, done)}
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
    const dailyDone = state.daily.includes(today), supplyDone = state.supply.includes(today);
    const phase = betaEventPhase();
    const overview = `<section class="beta-overview">
        <div class="beta-daily"><div><small>DAILY FREE SUMMON</small><h3>每日免費十連</h3><p>今天的冒險，從十位夥伴開始。</p></div><img src="asset/items/summon-ticket-ten.svg" alt="十抽招募券 ×1">
            ${betaClaimButton("daily", betaGateLabel("領取今日十連"), active && !dailyDone, dailyDone)}</div>
        <div class="beta-quick-rewards">
            <article><img src="asset/ui/beta/material-chest.svg" alt=""><div><h4>首次參加贈禮</h4><p>十抽招募券 ×2</p></div>${betaClaimButton("welcome", betaGateLabel("領取 20 抽"), active && !state.claimed.includes("welcome"), state.claimed.includes("welcome"))}</article>
            <article><img src="asset/ui/beta/stamina.svg" alt=""><div><h4>每日體力補給</h4><p>額外體力 ×${BETA_DAILY_STAMINA}</p></div>${betaClaimButton("supply", betaGateLabel("領取補給"), active && !supplyDone, supplyDone)}</article>
        </div>
        <div class="beta-buff-strip"><span><b>×2</b>培養經驗</span><span><b>×2</b>戰鬥金幣</span><span><b>×2</b>素材數量</span><small>${active ? "封測加成生效中" : betaEventStarted() ? "封測加成已結束" : "尚未啟動，領獎後生效"}</small></div>
        <div class="beta-section-heading"><div><small>FIVE-STAR GUARANTEE</small><h3>把新的五星夥伴帶回家</h3></div></div>
        <div class="beta-ticket-panel"><img src="asset/ui/beta/five-star-ticket.svg" alt="常駐五星召喚券"><div><h4>常駐五星召喚券</h4><p>優先未擁有 · 均等機率 · 排除限定</p><small>第 7、14 天各一張 · 持有 ${state.tickets} 張</small></div>
            <button type="button" class="beta-claim" onclick="useBetaFiveStarTicket()" ${!state.tickets || betaEventBusy || phase !== "beta" ? "disabled" : ""}>使用一張</button></div>
        ${state.lastSummon ? `<p class="beta-summon-result" role="status">${esc(state.lastSummon)}</p>` : ""}
        ${betaEventLoginHTML()}
    </section>`;
    const rules = `<section class="beta-rules"><h3>活動規則</h3><p>領取第 1 天登入獎勵的那一刻起算 336 小時（14 天），每位玩家各自計算；只打開活動頁、登入遊戲或查看獎勵都不會啟動倒數。倒數啟動後離線、未登入、未領獎都照常推進，重新整理、重新登入或換裝置都不會重置。</p><p>336 小時一到活動立即結束，未領取的每日十連、體力補給、登入獎勵、挑戰任務與紀念獎勵全部失效，之後也不能再度啟動；已入帳的資源、角色與紀念品保留，已取得的常駐五星召喚券仍可依原本規則使用。</p><p>每日十連與體力補給於台灣時間 00:00 更新，需手動領取，未領取的每日獎勵不累積。各天登入獎勵依本人倒數進度依次解鎖。</p><p>十連共 140 抽、首次 20 抽、任務合計 30 抽。14 日登入資源與兩張五星券另計。已領過的舊版五星券及十連進度會保留。</p><h3>封測加成</h3><p>使用經驗水晶的角色培養經驗 ×2；波利塔金幣、角色碎片與素材、境界 BOSS 素材、資源副本通關金幣及經驗素材數量 ×2。虹彩石、招募券、商店售價及活動發獎不翻倍。加成只在本人倒數的 336 小時內生效，結束即刻恢復正常倍率。</p><h3>五星券規則</h3><p>未持有常駐五星優先，池內均等機率；全部集齊才抽取重複五星並依原有規則補償。不影響一般卡池保底。活動結束仍可使用已領券，正式開服重置後封測券不保留。</p><h3>正式開服資料處理</h3><p>正式開服版本啟用時，封測角色、抽卡、金幣、素材與關卡進度會重置。已解鎖的紀念徽章、異界開拓者頭像框與創世見證者稱號隨帳號保留。封測期間不執行清檔。</p></section>`;
    const panels = { overview, login:betaEventLoginHTML(), missions:betaEventMissionsHTML(), memorial:betaEventMemorialHTML(), rules };
    return `<section class="beta-event">
        <header class="beta-hero"><div class="beta-hero-copy"><small>PINBALL REALMS · CLOSED BETA</small><span class="beta-season-tag">${phase === "beta" ? "14 日封測限定" : "開服紀念典藏"}</span><h2>異界開拓祭</h2><p>一起成為異界的開拓者</p><div class="beta-hero-total"><strong>190</strong><span>抽招募機會<br>＋2 張常駐五星券</span></div></div>
            <div class="beta-hero-status"><span id="beta-countdown">${betaEventStatusText()}</span><b>${betaEventStarted() ? `已進行第 ${betaEventDay()} / 14 天` : "倒數尚未啟動"}</b></div></header>
        <nav class="beta-nav" role="tablist" aria-label="封測活動分類">${[["overview","活動總覽"],["login","14 日登入"],["missions","挑戰任務"],["memorial","限定紀念"],["rules","活動說明"]].map(([id, label]) => `<button type="button" role="tab" id="beta-tab-${id}" aria-selected="${betaEventTab === id}" aria-controls="beta-panel" onclick="setBetaEventTab('${id}')">${label}</button>`).join("")}</nav>
        <div class="beta-toolbar"><span>${active ? "準備好領取今天的驚喜了嗎？" : betaEventStarted() ? "已收藏的紀念品可繼續套用" : "先領第 1 天登入獎勵，336 小時倒數隨即開始。"}</span><button type="button" class="beta-claim" onclick="claimAllBetaEventRewards()" ${phase !== "beta" || (!active && betaEventStarted()) || betaEventBusy ? "disabled" : ""}>一鍵領取</button></div>
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
    // 336 小時一到，未領取項目全部失效；直接丟錯，舊分頁上的按鈕不會按了沒反應，還讓人以為卡住。
    if (betaEventExpired()) throw new Error("封測活動已結束，未領取的獎勵已失效。");
    if (betaEventPhase() !== "beta") return false;
    const state = betaEventState, today = taipeiDateKey();
    // 從「尚未啟動」跨進倒數的唯一入口，就是第 1 天登入獎勵本身；一鍵領取也繞不過這條判定。
    if (!betaEventStarted() && !(id === "login1" && !state.claimed.includes("login1"))) return false;
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
        if (!betaEventStarted()) betaEventStart();
        else if (BetaEvent.dayNumber(state, Date.now()) < day) return false;
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
    return runBetaEventAction(() => {
        const wasStarted = betaEventStarted();
        if (!grantBetaEventClaim(id)) return "";
        return !wasStarted && betaEventStarted() ? "第 1 天獎勵已入帳，336 小時倒數正式開始。" : "封測獎勵已領取並保存。";
    });
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
