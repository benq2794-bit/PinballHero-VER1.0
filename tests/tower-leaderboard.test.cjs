const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), path = require('node:path');
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const source = html.slice(html.indexOf('const TOWER_WEEK_KEY'), html.indexOf('const SUMMON_RULES'));

function setup({ weekFloor = 0, weekAt = "", best = 84, current = 84, name = "見習勇者" } = {}) {
    const store = new Map();
    if (weekFloor) {
        // 用同一支週起始算出本週的鍵，避免測試自己寫死日期。
        const ctx0 = vm.createContext({ localStorage: fakeStorage(store) });
        vm.runInContext(source, ctx0);
        store.set("wf_tower_week_v1", JSON.stringify({ week: ctx0.towerWeekStart(), floor: weekFloor, at: weekAt }));
    }
    const ctx = {
        localStorage: fakeStorage(store), DEV_MODE: false,
        accountName: name, towerBestStage: best, stage: current, kills: 612,
        renderPage() {}, enterBattle() {}, openAdventureEntry() {}
    };
    vm.createContext(ctx);
    vm.runInContext(source, ctx);
    // 地獄模式的本週快取住在榜單切片外面（12660 行），這裡只給空榜當基準。
    ctx.expeditionHellWeekRecord = () => ({ week: ctx.towerWeekStart(), rows: [] });
    return { ctx, store };
}
function fakeStorage(store) {
    return { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
}

// 週起始一律回到週一 00:00（含週日要回到「上週一」，不是下週一）。
const localDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
for (const [iso, expect] of [
    ["2026-11-04T13:00:00", ["2026-11-02", "11/2–11/8"]],
    ["2026-11-08T23:59:59", ["2026-11-02", "11/2–11/8"]],
    ["2026-11-09T00:00:01", ["2026-11-09", "11/9–11/15"]]
]) {
    const { ctx } = setup();
    const start = new Date(ctx.towerWeekStart(new Date(iso).getTime()));
    assert.equal(localDay(start), expect[0], `週起始 ${iso}`);
    assert.equal(start.getHours(), 0);
    assert.equal(ctx.towerWeekLabel(start.getTime()), expect[1], `週標籤 ${iso}`);
}

// 倒數只講「天＋小時」，且過期不給負數。
{
    const { ctx } = setup();
    assert.match(ctx.towerWeekCountdown(ctx.towerWeekStart()), /^\d+ 天 \d+ 小時$/);
    assert.equal(ctx.towerWeekCountdown(ctx.towerWeekStart() - 8 * 864e5), "0 天 0 小時");
}

// 本週紀錄：只有爬得更高才寫，跨週第一次讀就歸零。
{
    const { ctx, store } = setup({ weekFloor: 50, weekAt: "18:42" });
    ctx.towerWeekCommit(40);
    assert.equal(JSON.parse(store.get("wf_tower_week_v1")).floor, 50, "較低的層數不覆蓋本週紀錄");
    ctx.towerWeekCommit(60);
    const written = JSON.parse(store.get("wf_tower_week_v1"));
    assert.equal(written.floor, 60);
    assert.match(written.at, /^\d{2}:\d{2}$/);
    // vm 裡長出來的物件跟測試端不同原型，逐欄位比對。
    const same = (rows, want, label) => {
        assert.equal(rows.length, want.length, `${label}：列數`);
        rows.forEach((r, i) => {
            for (const key of Object.keys(want[i])) assert.equal(r[key], want[i][key], `${label}：${key} @${i}`);
        });
    };
    same(ctx.towerLbRows(), [{ name: "見習勇者", floor: 60, at: written.at, me: true }], "本週一筆");

    store.set("wf_tower_week_v1", JSON.stringify({ week: ctx.towerWeekStart() - 7 * 864e5, floor: 999, at: "10:00" }));
    assert.equal(ctx.towerWeekRecord().floor, 0, "上週的紀錄不能沿用");
    same(ctx.towerLbRows(), [], "本週沒成績就是空榜");

    ctx.setTowerLbScope("life");
    same(ctx.towerLbRows(), [{ name: "見習勇者", floor: 84, at: "", me: true }], "生涯那格讀 towerBestStage");
}

// 版面分支：≤3 筆走資料源說明（不鋪假名字），>3 筆才出現榜單與釘底的自己。
{
    const single = setup({ weekFloor: 84, weekAt: "18:42" }).ctx.pageTowerLeaderboard();
    assert.ok(single.includes("榜單目前只有你這一筆"), "一筆時要講資料源現況");
    assert.ok(!single.includes("lb-self"), "只有你時不再重複列一次自己");
    assert.equal((single.match(/lb-pod p\d void/g) || []).length, 2, "2、3 名留空位");
    assert.ok(single.includes("見習勇者") && single.includes("18:42 抵達"));
    assert.ok(single.includes("lb-cta") && single.includes("繼續挑戰波利塔"));

    const none = setup().ctx.pageTowerLeaderboard();
    assert.ok(none.includes("本週還沒上塔"), "本週空榜的引導文案");
    assert.equal((none.match(/lb-pod p\d void/g) || []).length, 3);
    assert.ok(!none.includes("18:42"), "空榜不殘留時間戳");

    const many = setup({ weekFloor: 84, weekAt: "18:42" }).ctx;
    many.towerLbRows = () => Array.from({ length: 13 }, (_, i) => ({ name: `勇者${i + 1}`, floor: 150 - i * 6, at: "18:20", me: i === 11 }));
    const board = many.pageTowerLeaderboard();
    assert.ok(board.includes("lb-board") && board.includes("lb-dots"), "超過 10 筆要有榜單與省略號");
    assert.ok(board.includes('<span class="rk">12</span>'), "自己那一列的名次取實際位置");
    assert.ok(board.includes("勇者12"), "自己那一列照名字原樣輸出，不再加前綴");
    assert.ok(!board.includes("lb-note"), "有榜單時不再顯示資料源說明");
}

// 無盡遠征（地獄模式）那塊板：本週沒成績就明講空榜，不鋪台子、不假裝有榜單。
{
    const { ctx } = setup({ weekFloor: 84, weekAt: "18:42" });
    ctx.setTowerLbMode("rogue");
    const rogue = ctx.pageTowerLeaderboard();
    assert.ok(rogue.includes('class="on" onclick="setTowerLbMode(\'rogue\')"'), "遠征那顆要亮起來");
    assert.ok(rogue.includes("本週還沒有地獄模式成績"), "空榜要講清楚是還沒跑過");
    assert.ok(rogue.includes("lb-clock") && rogue.includes("本週倒數"), "遠征榜同样掛本週倒數");
    assert.equal((rogue.match(/lb-pod p\d/g) || []).length, 0, "遠征榜不鋪前三名台子");
    assert.ok(!rogue.includes("lb-tabs"), "遠征榜沒有本週／生涯分頁");
    assert.ok(!rogue.includes("lb-board") && !rogue.includes("lb-self"), "空榜不鋪榜單與自己那一列");
    assert.ok(rogue.includes("每週一 00:00 結算") && rogue.includes("前往出發冒險"), "要給結算規則與既有入口");

    ctx.setTowerLbMode("tower");
    const back = ctx.pageTowerLeaderboard();
    assert.ok(back.includes('class="on" onclick="setTowerLbMode(\'tower\')"'), "選中的模式要掛 on");
    assert.ok(back.includes("lb-clock") && back.includes("lb-tabs") && back.includes("見習勇者"), "切回波利塔要恢復原本的版面");
    assert.equal((back.match(/lb-pod p\d void/g) || []).length, 2, "波利塔仍只缺 2、3 名");

    ctx.setTowerLbMode("gate");
    assert.ok(ctx.pageTowerLeaderboard().includes("本週前段"), "不認識的模式退回波利塔");

    // 選中那一顆的底色必須由這支樣式檔搶回來，否則會被 theme 的 `button:not(.gold)` 壓回白漸層。
    const css = fs.readFileSync(path.resolve(__dirname, "../asset/tower-leaderboard.css"), "utf8");
    for (const sel of [".lb-modes button.on", ".lb-tabs button.on"]) {
        assert.ok(css.includes(sel), `排行榜樣式缺 ${sel}`);
    }
    assert.ok(/button\.on[\s\S]{0,240}background:linear-gradient\(180deg,#dff7ff,#9ee5f7\) !important/.test(css), "選中分頁的青色要帶 !important");
}

// 本週倒數只屬於本週榜，而且掛在小節標題右側，不再多佔一列。
{
    const { ctx } = setup({ weekFloor: 84, weekAt: "18:42" });
    const week = ctx.pageTowerLeaderboard();
    assert.ok(/<h3>本週前段・[\d/–]+<\/h3><span class="lb-clock"/.test(week), "倒數要掛在小節標題右側");
    assert.ok(!week.includes("lb-top"), "模式分頁那一列不再塞倒數");
    ctx.setTowerLbScope("life");
    const life = ctx.pageTowerLeaderboard();
    assert.ok(!life.includes("本週倒數") && !life.includes("lb-clock"), "生涯不掛週期");
    assert.ok(life.includes("<span>本機紀錄</span>"), "生涯那格留資料源");
}

// 帳號名要逃過 HTML 注入。
{
    const { ctx } = setup({ weekFloor: 30, weekAt: "09:05", name: `<script>"&'` });
    const page = ctx.pageTowerLeaderboard();
    assert.ok(page.includes("&lt;script&gt;"), "名字裡的尖括號被轉義");
    assert.ok(!page.includes("<script>"), "不會長出真的 script 標籤");
}

// 全服榜的同步守門：進榜單那頁就補送、雲端較高不覆寫、查不到基準寧可不送。
function cloudSetup({ weekFloor = 40, best = 40, name = "測試勇者", own = {}, readFails = false } = {}) {
    const store = new Map();
    const probe = vm.createContext({ localStorage: fakeStorage(store) });
    vm.runInContext(source, probe);
    store.set("wf_tower_week_v1", JSON.stringify({ week: probe.towerWeekStart(), floor: weekFloor, at: "18:42" }));
    const writes = [], reads = [];
    const ctx = {
        localStorage: fakeStorage(store), DEV_MODE: false, accountName: name,
        towerBestStage: best, stage: best, kills: 0, cloudUser: { id: "u-1" },
        renderPage() {}, enterBattle() {}, openAdventureEntry() {},
        SupabaseCloud: {
            available: true,
            readOwnLeaderboard: async scope => {
                reads.push(scope);
                if (readFails) throw new Error("讀不到基準");
                return own[scope] || null;
            },
            writeLeaderboard: async entry => { writes.push({ scope: entry.scope, floor: entry.floor, weekStart: entry.weekStart }); return true; },
            readLeaderboard: async () => []
        }
    };
    vm.createContext(ctx);
    vm.runInContext(source, ctx);
    ctx.expeditionHellWeekRecord = () => ({ week: ctx.towerWeekStart(), rows: [] });
    return { ctx, writes, reads, bucket: ctx.towerWeekBucket(), flush: () => new Promise(done => setTimeout(done, 5)) };
}
(async () => {
    // 雲端還沒有自己那筆：本週＋生涯兩榜都要送，週期鑰值用 UTC 星期一（跨時區才對得到同一份）。
    const fresh = cloudSetup();
    fresh.ctx.pageTowerLeaderboard();
    await fresh.flush();
    assert.deepEqual(fresh.writes, [
        { scope: "tower_week", floor: 40, weekStart: fresh.bucket },
        { scope: "tower_life", floor: 40, weekStart: undefined }
    ], "進榜單那頁就把本機最佳補送兩榜");
    assert.ok(fresh.bucket % 864e5 === 0 && new Date(fresh.bucket).getUTCDay() === 1, "週期鑰值要落在週一的 UTC 零點");

    // 同一組數字再進一次不再打資料庫。
    const again = fresh.ctx.pageTowerLeaderboard();
    await fresh.flush();
    assert.equal(fresh.writes.length, 2, "送過的數字不重複送");
    assert.ok(again.includes("測試勇者"), "榜上還是看得到自己那一筆");

    // 雲端比自己高：一個字都不能送出去（換裝置、清過瀏覽器會踩到）。
    const higher = cloudSetup({ own: { tower_week: { floor: 99, weekStart: fresh.bucket }, tower_life: { floor: 99 } } });
    higher.ctx.reportTowerScores();
    await higher.flush();
    assert.equal(higher.writes.length, 0, "雲端較高時不覆寫");
    const legacyWeek = cloudSetup({ own: { tower_week: { floor:99, weekStart:fresh.bucket - 8 * 3600000 }, tower_life:{ floor:99 } } });
    legacyWeek.ctx.reportTowerScores();
    await legacyWeek.flush();
    assert.equal(legacyWeek.writes.length, 0, "舊版台灣週起始的較高成績也必須保留");
    assert.equal(fresh.ctx.towerWeekBucket(Date.parse("2026-11-08T15:59:59Z")), Date.parse("2026-11-02T00:00:00Z"));
    assert.equal(fresh.ctx.towerWeekBucket(Date.parse("2026-11-08T16:00:00Z")), Date.parse("2026-11-09T00:00:00Z"));
    assert.deepEqual(higher.reads, ["tower_week", "tower_life"], "兩榜各查一次基準");

    // 只有其中一榜較高：另一榜照樣要送得出去。
    const mixed = cloudSetup({ own: { tower_week: { floor: 30, weekStart: fresh.bucket }, tower_life: { floor: 99 } } });
    mixed.ctx.reportTowerScores();
    await mixed.flush();
    assert.deepEqual(mixed.writes.map(w => w.scope), ["tower_week"], "本週那筆較低才補送，生涯維持雲端較高");

    // 上週那筆不能擋這週：雲端還掛舊週期時照送本週數字。
    const stale = cloudSetup({ own: { tower_week: { floor: 99, weekStart: fresh.bucket - 7 * 864e5 }, tower_life: { floor: 99 } } });
    stale.ctx.reportTowerScores();
    await stale.flush();
    assert.deepEqual(stale.writes.map(w => w.scope), ["tower_week"], "舊週期那筆當它不存在");

    // 基準查不到就不送，避免斷線時拿小數字蓋掉線上成績。
    const offline = cloudSetup({ readFails: true });
    offline.ctx.reportTowerScores();
    await offline.flush();
    assert.equal(offline.writes.length, 0, "查不到基準時不覆寫");

    // 名字還沒設定好不送，免得榜上留「見習勇者」。
    const unnamed = cloudSetup({ name: "" });
    unnamed.ctx.pageTowerLeaderboard();
    await unnamed.flush();
    assert.equal(unnamed.writes.length, 0, "沒名字不進榜");
    const guest = setup({ weekFloor:0 });
    vm.runInContext(`towerLbCloud = { key:towerLbCacheKey(), state:"online", rows:[
        {userId:"a",name:"玩家甲",floor:40},{userId:"b",name:"玩家乙",floor:30},
        {userId:"c",name:"玩家丙",floor:20},{userId:"d",name:"玩家丁",floor:10}
    ] }`, guest.ctx);
    const guestMarkup = guest.ctx.pageTowerLeaderboard();
    assert.ok(guestMarkup.includes("玩家丁"));
    assert.ok(guestMarkup.includes("目前尚無你的本週成績"), "尚未上榜的訪客也能讀取全服榜單");

    console.log("tower-leaderboard: 週起始／本週紀錄／版面分支／模式切換／轉義／雲端同步守門 全部通過");
})().catch(error => { console.error(error); process.exit(1); });
