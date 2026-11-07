const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const path = require("node:path");

const HOUR = 3600000, DAY = 24 * HOUR, TOTAL = 336 * HOUR;
const taipei = (y, m, d, h = 0, mi = 0) => Date.UTC(y, m - 1, d, h, mi) - 8 * HOUR;
const keyOf = ms => new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Taipei", year:"numeric", month:"2-digit", day:"2-digit" })
    .format(new Date(ms));

const context = {
    GAME_DATA: { betaEvent: { phase:"beta", launchVersion:"launch-1" } },
    document: { getElementById() { return null; }, querySelector() { return null; } },
    structuredClone, navigator: {}, GATE_MODE: false, homeTabOn: "other", gachaAnimation: null,
    CHAR_IDS: ["owned", "missing", "limited"],
    CHAR_TABLE: {
        owned: { rarity: 5, summonCategory: "permanent", name: "Owned" },
        missing: { rarity: 5, summonCategory: "permanent", name: "Missing" },
        limited: { rarity: 5, summonCategory: "limited", name: "Limited" }
    },
    roster: {}, teamIds: [], squads: [], accountAvatarFrameId: "title", titleOn: "novice",
    summonTicketSingle: 0, summonTicketTen: 0, cultivationMaterials: 0, highGradeExperienceCrystals: 0,
    gold: 0, stamina: 0, staminaTickAt: 0, homeSig: "", kills: 0, bossWin: {}, expeditionNormalClearCount: 0,
    towerMaterials: { jelly:0, blockScrap:0, monsterCrystal:0, dragonWing:0, shellfishTail:0, garudaBeak:0, thunderCore:0 },
    breakthroughStones: { fourStar:0, fiveStar:0 }, SUMMON_DUPLICATE_FRAGMENTS: 10,
    updateUI() {}, syncTeamField() {}, renderPage() {}, esc: text => String(text), toasts: []
};
let disk = null, failSave = false;
context.window = context;
context.hmToast = message => context.toasts.push(message);
context.taipeiDateKey = () => keyOf(context.clockMs);
context.checkinDateGap = (from, to) => (Date.parse(to) - Date.parse(from)) / DAY;
context.saveStore = { read: () => disk ? { ok: true, data: disk } : { ok: false } };
context.saveGame = () => {
    if (failSave) return false;
    disk = structuredClone({ betaEventState: context.betaEventState });
    return true;
};
context.summonUnlock = id => {
    const character = context.roster[id];
    if (character.unlocked) { character.shards += 10; return "duplicate"; }
    character.unlocked = true;
    return "new";
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../asset/beta-event.js"), "utf8"), context);
// 假時鐘要和模組同一個 realm：模組裡每一處 Date.now() 都讀這個可變值。
vm.runInContext("Date.now = () => clockMs;", context);

const T0 = taipei(2026, 11, 7, 10);
function reset(now) {
    Object.assign(context, {
        gold: 0, stamina: 0, staminaTickAt: 0, kills: 0, bossWin: {}, expeditionNormalClearCount: 0,
        summonTicketSingle: 0, summonTicketTen: 0, cultivationMaterials: 0, highGradeExperienceCrystals: 0,
        breakthroughStones: { fourStar:0, fiveStar:0 }, accountAvatarFrameId: "title", titleOn: "novice",
        towerMaterials: { jelly:0, blockScrap:0, monsterCrystal:0, dragonWing:0, shellfishTail:0, garudaBeak:0, thunderCore:0 },
        roster: {
            owned: { unlocked: true, lvl: 1, shards: 0 },
            missing: { unlocked: false, lvl: 1, shards: 0 },
            limited: { unlocked: false, lvl: 1, shards: 0 }
        },
        GAME_DATA: { betaEvent: { phase:"beta", launchVersion:"launch-1" } }
    });
    context.clockMs = now;
    disk = null; failSave = false; context.toasts.length = 0;
    context.betaEventState = context.BetaEvent.normalize(null);
}
const at = ms => { context.clockMs = ms; };
const state = () => context.betaEventState;

async function test() {
    // 一、只打開活動頁、只看獎勵：倒數不得啟動
    reset(T0);
    assert.equal(context.betaEventVisit(), true);
    assert.equal(state().startedAt, null);
    assert.equal(context.betaEventStarted(), false);
    assert.equal(context.betaEventStatusText(), "尚未啟動");
    assert.equal(context.betaEventDay(), 0);
    assert.equal(context.betaExperienceAmount(100), 100, "尚未啟動不給 ×2");
    const intro = context.pageBetaEvent();
    assert.match(intro, /id="beta-countdown"/);
    assert.match(intro, /尚未啟動/);
    assert.match(intro, /領取並啟動倒數/);
    assert.match(intro, /啟動後可領/);
    assert.match(intro, /先領第 1 天登入獎勵，336 小時倒數隨即開始。/);
    assert.match(intro, /<b>第 0 \/ 14 天<\/b>/, "未啟動時不謊稱已進行");
    await context.claimBetaEvent("daily");
    await context.claimBetaEvent("supply");
    await context.claimBetaEvent("welcome");
    await context.claimBetaEvent("login2");
    await context.claimBetaEvent("mission3");
    await context.claimBetaEvent("memorial");
    assert.equal(state().startedAt, null, "任何非第 1 天的動作都不能啟動倒數");
    assert.equal(context.summonTicketTen, 0);
    assert.equal(disk, null, "沒領到東西就不會寫存檔");

    // 二、領下第 1 天獎勵的那一刻才寫時間戳
    await context.claimBetaEvent("login1");
    assert.equal(state().startedAt, T0);
    assert.equal(state().start, "2026-11-07", "日期鏡像跟著時間戳一起落盤");
    assert.equal(typeof state().baseline, "object");
    assert.equal(context.gold, 50000);
    assert.equal(disk.betaEventState.startedAt, T0, "時間戳要寫進帳號存檔");
    assert.equal(context.betaEventStatusText(), "剩餘 14 天 00:00:00");
    assert.equal(context.betaEventDay(), 1);
    assert.equal(context.betaExperienceAmount(100), 200);
    assert.ok(context.toasts.includes("第 1 天獎勵已入帳，336 小時倒數正式開始。"));
    await context.claimBetaEvent("login1");
    assert.equal(state().startedAt, T0, "重領不會把倒數往後推");
    assert.equal(state().claimed.length, 1);

    // 三、重新整理／換裝置：讀回同一個時間戳
    at(T0 + 3 * HOUR);
    context.betaEventState = context.BetaEvent.normalize(disk.betaEventState);
    assert.equal(context.betaEventVisit(), true);
    assert.equal(state().startedAt, T0, "重新載入不重置倒數");
    assert.equal(context.betaEventStatusText(), "剩餘 13 天 21:00:00");

    // 四、離線數天：依本人倒數解鎖，未到期的一天領不到
    at(T0 + 3 * DAY + 5 * HOUR);
    assert.equal(context.betaEventDay(), 4);
    assert.equal(context.betaEventStatusText(), "剩餘 10 天 19:00:00");
    assert.equal(context.betaLoginReady(4), true);
    assert.equal(context.betaLoginReady(5), false);
    await context.claimBetaEvent("login5");
    assert.equal(state().claimed.includes("login5"), false);
    assert.equal(context.gold, 50000);
    await context.claimBetaEvent("login4");
    assert.equal(context.gold, 150000);
    await context.claimBetaEvent("login7");
    assert.equal(state().tickets, 0, "第 7 天提前領取＝拒絕");
    assert.match(context.betaEventLoginHTML(), /第 5 天解鎖/);

    // 五、336 小時一到立即結束：未領失效、加成歸零
    at(T0 + 335 * HOUR);
    assert.equal(context.betaEventActive(), true);
    await context.claimBetaEvent("login8");
    assert.equal(context.gold, 300000);
    at(T0 + TOTAL);
    assert.equal(context.betaEventActive(), false);
    assert.equal(context.betaEventExpired(), true);
    assert.equal(context.betaEventStatusText(), "封測活動已結束");
    assert.equal(context.betaExperienceAmount(100), 100, "結束後 ×2 失效");
    const over = context.pageBetaEvent();
    assert.match(over, /封測加成已結束/);
    assert.match(over, /claimAllBetaEventRewards\(\)" disabled>/);
    assert.match(context.betaEventLoginHTML(), /活動已結束/);
    const held = structuredClone(state().claimed), goldAtEnd = context.gold;
    await context.claimBetaEvent("daily");
    await context.claimBetaEvent("supply");
    await context.claimBetaEvent("welcome");
    await context.claimBetaEvent("login9");
    await context.claimAllBetaEventRewards();
    assert.deepEqual(Array.from(state().claimed), held, "結束後一項都領不到");
    assert.equal(context.gold, goldAtEnd);
    assert.equal(context.summonTicketTen, 0);
    assert.ok(context.toasts.includes("封測活動已結束，未領取的獎勵已失效。"));
    at(T0 + TOTAL + 99 * DAY);
    assert.equal(context.betaEventExpired(), true, "結束後不能再度啟動");

    // 六、已取得的常駐五星券結束後仍依原規則使用
    at(T0 + 7 * DAY);
    await context.claimBetaEvent("login7");
    assert.equal(state().tickets, 1);
    at(T0 + TOTAL + HOUR);
    await context.useBetaFiveStarTicket();
    assert.equal(state().tickets, 0);
    assert.equal(context.roster.missing.unlocked, true);

    // 七、一鍵領取：繞不過啟動條件，也不重複發放
    reset(T0);
    await context.claimAllBetaEventRewards();
    assert.equal(state().startedAt, T0, "一鍵領取只能透過第 1 天獎勵啟動");
    assert.deepEqual(Array.from(state().claimed), ["login1", "memorial"]);
    assert.equal(state().tickets, 0);
    assert.equal(context.summonTicketTen, 0);
    context.kills = 100;
    for (let i = 0; i < 10; i++) context.recordBetaEventBattle();
    context.bossWin.fire = 1; context.expeditionNormalClearCount = 1; context.roster.owned.lvl = 20;
    assert.equal(context.saveGame(), true, "戰鬥計數先落盤，才不会誤觸舊分頁保護");
    assert.equal(state().battles, 10);
    await context.claimAllBetaEventRewards();
    assert.equal(context.summonTicketTen, 3, "當日十連＋見面禮 2 張");
    for (let day = 2; day <= 14; day++) {
        at(T0 + (day - 1) * DAY);
        await context.claimAllBetaEventRewards();
        await context.claimAllBetaEventRewards();
    }
    assert.equal(state().startedAt, T0, "跑完 14 天時間戳沒被改寫");
    assert.equal(context.summonTicketTen, 16, "14 次每日十連＋20 抽見面禮");
    assert.equal(context.summonTicketSingle, 30, "四項任務共 30 抽");
    assert.equal(state().tickets, 2, "第 7、14 天各一張");
    assert.equal(state().claimed.length, 20, "14 天＋4 任務＋見面禮＋紀念");
    assert.equal(context.gold, 500000);
    assert.equal(context.stamina, 2980, "登入體力 1300＋每日補給 120×14");
    assert.equal(context.cultivationMaterials, 80);
    assert.equal(context.highGradeExperienceCrystals, 15);
    assert.equal(context.breakthroughStones.fourStar, 20);
    assert.equal(context.towerMaterials.jelly, 60);
    assert.equal(context.towerMaterials.dragonWing, 2);
    assert.equal(context.betaOwns("beta-founder"), true);
    assert.equal(context.betaOwns("beta-pioneer"), true);
    assert.equal(context.betaOwns("beta-frame"), true);
    await context.claimAllBetaEventRewards();
    assert.equal(context.gold, 500000, "一鍵領取可重複點擊，不會多發");
    assert.equal(context.summonTicketTen, 16);

    // 八、存檔失敗：不倒數、不發獎
    reset(T0);
    failSave = true;
    await context.claimBetaEvent("login1");
    assert.equal(state().startedAt, null, "儲存失敗時時間戳不得留下");
    assert.equal(context.gold, 0);
    assert.ok(context.toasts.includes("儲存失敗，獎勵尚未領取"));
    failSave = false;
    await context.claimBetaEvent("login1");
    assert.equal(state().startedAt, T0);
    assert.equal(context.gold, 50000);

    // 九、舊存檔只有日期：相容換算，不重發 14 天
    reset(taipei(2026, 11, 5, 10));
    context.betaEventState = context.BetaEvent.normalize({ start:"2026-11-01", claimed:["login1", "login7"], daily:["2026-11-01"], memorial:true });
    assert.equal(state().startedAt, taipei(2026, 11, 1), "舊日期一律對到該日台灣 00:00");
    assert.equal(state().start, "2026-11-01", "開始日期不被清除或重置");
    assert.equal(context.betaEventDay(), 5);
    assert.equal(context.betaEventStatusText(), "剩餘 9 天 14:00:00");
    assert.equal(context.betaOwns("beta-pioneer"), true, "舊紀念品保留");
    await context.claimBetaEvent("login1");
    assert.equal(state().startedAt, taipei(2026, 11, 1), "已領過第 1 天也不會重新啟動");
    assert.equal(context.gold, 0, "已領取的獎勵不重複發放");
    await context.claimBetaEvent("login6");
    assert.equal(state().claimed.includes("login6"), false, "第 6 天尚未到期");
    await context.claimBetaEvent("login5");
    assert.equal(context.stamina, 300);

    // 十、只存時間戳、沒有日期的存檔：自動補回鏡像
    reset(T0);
    context.betaEventState = context.BetaEvent.normalize({ startedAt: T0 - 2 * DAY });
    assert.equal(state().start, "2026-11-05");
    assert.equal(context.betaEventDay(), 3);

    // 十一、不同玩家各自計算，互不共用
    reset(T0);
    await context.claimBetaEvent("login1");
    const playerA = structuredClone(state());
    reset(T0 + 2 * DAY);
    await context.claimBetaEvent("login1");
    const playerB = structuredClone(state());
    assert.equal(playerA.startedAt, T0);
    assert.equal(playerB.startedAt, T0 + 2 * DAY);
    assert.equal(context.BetaEvent.dayNumber(playerA, T0 + 5 * DAY), 6);
    assert.equal(context.BetaEvent.dayNumber(playerB, T0 + 5 * DAY), 4);
    assert.equal(context.BetaEvent.isActive(playerB, T0 + 5 * DAY), true);
    assert.equal(context.BetaEvent.isActive(playerA, T0 + 14 * DAY), false);
    assert.equal(context.BetaEvent.startMs(context.BetaEvent.normalize(null)), null, "新帳號沒有開始時間");

    // 十二、其他分頁動過存檔：舊分頁不能蓋掉新進度
    reset(T0);
    await context.claimBetaEvent("login1");
    await context.claimBetaEvent("memorial");
    disk.betaEventState.badgeEquipped = false;
    await context.toggleBetaBadge();
    assert.equal(state().badgeEquipped, true, "探到更新存檔就中止，不改本頁狀態");
    assert.ok(context.toasts.includes("活動進度已在其他頁面更新，請重新載入遊戲。"));
    disk.betaEventState.badgeEquipped = true;
    await context.toggleBetaBadge();
    assert.equal(state().badgeEquipped, false, "沒有衝突時照常切換");

    // 十三、每日欄位爆量也不會擠掉「今天」
    reset(T0);
    context.betaEventState = context.BetaEvent.normalize({
        startedAt: T0, daily: Array.from({ length: 39 }, (_, i) => keyOf(T0 - (i + 1) * DAY)) });
    assert.equal(state().daily.length, 32, "只留最近 32 筆");
    await context.claimBetaEvent("daily");
    assert.equal(context.summonTicketTen, 1);
    assert.equal(state().daily.includes("2026-11-07"), true);
    await context.claimBetaEvent("daily");
    assert.equal(context.summonTicketTen, 1, "同日不能重複領十連");
    assert.equal(state().daily.length, 32);

    // 十四、正式開服遷移：時間戳原封不動帶過去
    reset(T0);
    await context.claimBetaEvent("login1");
    await context.claimBetaEvent("memorial");
    const oldSave = { v:6, accountName:"Tester", gold:500000, roster:structuredClone(context.roster),
        betaEventState:structuredClone(state()) };
    const launched = context.BetaEvent.prepareLaunchSave(oldSave, "launch-1");
    assert.equal(launched.gold, undefined);
    assert.equal(launched.roster, undefined);
    assert.equal(launched.betaEventState.startedAt, T0, "遷移不能把開始時間退回該日 00:00");
    assert.equal(launched.betaEventState.start, "2026-11-07");
    assert.equal(launched.betaEventState.tickets, 0);
    assert.equal(launched.betaEventState.souvenirs.length, 2);
    assert.equal(launched.accountAvatarFrameId, "beta-frame");
    assert.equal(launched.titleOn, "novice");
    assert.equal(context.BetaEvent.prepareLaunchSave(launched, "launch-1"), launched, "遷移只跑一次");
    assert.equal(oldSave.gold, 500000, "遷移不改動原存檔");
    const unstarted = { gold:1, betaEventState:{ start:"" } };
    assert.equal(context.BetaEvent.prepareLaunchSave(unstarted, "launch-1"), unstarted, "沒啟動過的帳號不遷移");
    context.GAME_DATA.betaEvent.phase = "launch";
    assert.equal(context.betaExperienceAmount(100), 100, "phase 切換也視為結束");
    assert.equal(context.betaEventStatusText(), "封測活動已結束");

    // 十五、雲端存檔往來不丟時間戳
    vm.runInContext(fs.readFileSync(path.join(__dirname, "../asset/save-system.js"), "utf8"), context);
    const fresh = id => ({ id, unlocked:false, lvl:1, maxHp:100, gauge:0 });
    const rules = {
        characterIds:context.CHAR_IDS, characters:context.CHAR_TABLE, titleIds:["novice", "beta-founder"], gateIds:["fire"],
        maxRank:150, teamMax:3, bossEvery:10, normalFloorWaves:3, bossFloorSeconds:90, normalFloorSeconds:60,
        rankExpNeed:() => 100, normalizeTalentRanks:() => ({}), talentSpent:() => 0,
        normalizeCharacterGrowth() {}, newCharacter:fresh
    };
    const restored = context.SaveSystem.restore(oldSave, context.roster, rules);
    assert.equal(restored.betaEventState.startedAt, T0);
    assert.equal(restored.betaEventState.start, "2026-11-07");
    assert.equal(restored.accountAvatarFrameId, "beta-frame");

    // 十六、角色培養的 ×2 只在自己那 336 小時內生效
    const growth = fs.readFileSync(path.join(__dirname, "../asset/character-growth.js"), "utf8");
    vm.runInContext(growth.slice(growth.indexOf("function cultivateGrowthChar("), growth.indexOf("// 解放時用獨立覆蓋 Canvas")), context);
    const experience = [];
    Object.assign(context, {
        growthCap:() => 80, hpMax:() => 100, atkOf:() => 10, charName:() => "Owned",
        gainGrowthExp(character, amount) { experience.push(amount); return 0; },
        refreshGrowthAfterPurchase() {}, log() {}
    });
    reset(T0);
    await context.claimBetaEvent("login1");
    context.cultivationMaterials = 4;
    context.highGradeExperienceCrystals = 4;
    context.cultivateGrowthChar("owned");
    context.cultivateGrowthCharWithHighCrystal("owned");
    at(T0 + TOTAL);
    context.cultivateGrowthChar("owned");
    context.cultivateGrowthCharWithHighCrystal("owned");
    assert.deepEqual(experience, [200, 2000, 100, 1000], "到點後培養經驗回到基礎值");

    // 十七、五星券池只挑常駐、優先未擁有
    assert.equal(context.BetaEvent.pick(["a", "b"], new Set(["a"]), 0), "b");
    assert.equal(context.BetaEvent.pick([], new Set()), null);
    console.log("PASS 336 小時個人倒數：啟動條件、離線推進、到期失效、舊檔相容、一鍵領取與遷移");
}

test().catch(error => { console.error(error); process.exitCode = 1; });
