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

// 無盡遠征還沒戰場：台子全留空位，不假裝有榜單、週期與成績。
{
    const { ctx } = setup({ weekFloor: 84, weekAt: "18:42" });
    ctx.setTowerLbMode("rogue");
    const rogue = ctx.pageTowerLeaderboard();
    assert.ok(rogue.includes('class="on" onclick="setTowerLbMode(\'rogue\')"'), "遠征那顆要亮起來");
    assert.equal((rogue.match(/lb-pod p\d void/g) || []).length, 3, "遠征前三名都還是空位");
    assert.ok(!rogue.includes("lb-clock"), "沒有戰場就不掛本週倒數");
    assert.ok(!rogue.includes("lb-tabs"), "沒有戰場就不掛本週／生涯分頁");
    assert.ok(!rogue.includes("lb-board") && !rogue.includes("lb-self"), "空榜不鋪榜單與自己那一列");
    assert.ok(rogue.includes("還沒開放") && rogue.includes("前往出發冒險"), "要講清楚是戰場未開放，並給既有入口");

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

console.log("tower-leaderboard: 週起始／本週紀錄／版面分支／模式切換／轉義 全部通過");
