const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const path = require("node:path");

const context = {
    GAME_DATA: { betaEvent: { phase:"beta", launchVersion:"launch-1" } },
    document: { getElementById() { return null; } },
    structuredClone, navigator: {}, GATE_MODE: false, homeTabOn: "other", gachaAnimation: null,
    CHAR_IDS: ["owned", "missing", "limited"],
    CHAR_TABLE: {
        owned: { rarity: 5, summonCategory: "permanent", name: "Owned" },
        missing: { rarity: 5, summonCategory: "permanent", name: "Missing" },
        limited: { rarity: 5, summonCategory: "limited", name: "Limited" }
    },
    roster: {
        owned: { unlocked: true, lvl: 1, shards: 0 },
        missing: { unlocked: false, lvl: 1, shards: 0 },
        limited: { unlocked: false, lvl: 1, shards: 0 }
    },
    teamIds: [], summonTicketSingle: 0, summonTicketTen: 0, cultivationMaterials: 0,
    highGradeExperienceCrystals:0, gold:0, stamina:0, staminaTickAt:0, homeSig:"",
    towerMaterials:{ jelly:0, blockScrap:0, monsterCrystal:0, dragonWing:0, shellfishTail:0, garudaBeak:0, thunderCore:0 },
    breakthroughStones:{ fourStar:0, fiveStar:0 },
    kills: 0, bossWin: {}, expeditionNormalClearCount: 0, SUMMON_DUPLICATE_FRAGMENTS: 10,
    updateUI() {}, syncTeamField() {}, hmToast() {}
};
let today = "2026-11-07", disk = null, failSave = false;
context.window = context;
context.taipeiDateKey = () => today;
context.checkinDateGap = (from, to) => (Date.parse(to) - Date.parse(from)) / 86400000;
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
context.betaEventState = context.BetaEvent.normalize(null);

async function test() {
    context.betaEventVisit();
    await context.claimBetaEvent("welcome");
    await context.claimBetaEvent("welcome");
    for (let day = 7; day <= 20; day++) {
        today = "2026-11-" + String(day).padStart(2, "0");
        context.betaEventVisit();
        await context.claimBetaEvent("daily");
        await context.claimBetaEvent("daily");
    }
    assert.equal(context.summonTicketTen, 16);
    assert.equal(context.betaEventState.logins.length, 14);
    await context.claimBetaEvent("login7");
    await context.claimBetaEvent("login14");
    await context.claimBetaEvent("login14");
    assert.equal(context.betaEventState.tickets, 2);
    context.kills = 100;
    context.betaEventState.battles = 10;
    context.bossWin.fire = 1;
    context.expeditionNormalClearCount = 1;
    context.roster.owned.lvl = 20;
    context.saveGame();
    for (let i = 0; i < 4; i++) {
        await context.claimBetaEvent("mission" + i);
        await context.claimBetaEvent("mission" + i);
    }
    assert.equal(context.summonTicketSingle, 30);
    assert.equal(context.betaOwns("beta-founder"), true);
    await context.claimAllBetaEventRewards();
    assert.equal(context.gold, 500000);
    assert.equal(context.stamina, 1420);
    assert.equal(context.cultivationMaterials, 80);
    assert.equal(context.highGradeExperienceCrystals, 15);
    assert.equal(context.breakthroughStones.fourStar, 20);
    assert.equal(context.towerMaterials.dragonWing, 2);
    assert.equal(context.betaOwns("beta-frame"), true);
    assert.equal(context.betaOwns("beta-pioneer"), true);
    await context.claimAllBetaEventRewards();
    assert.equal(context.gold, 500000, "batch claims are idempotent");
    assert.equal(context.stamina, 1420);
    today = "2026-11-21";
    await context.claimBetaEvent("daily");
    assert.equal(context.summonTicketTen, 16);
    failSave = true;
    await context.useBetaFiveStarTicket();
    assert.equal(context.betaEventState.tickets, 2);
    assert.equal(context.roster.missing.unlocked, false);
    failSave = false;
    await context.useBetaFiveStarTicket();
    assert.equal(context.roster.missing.unlocked, true);
    assert.equal(context.betaEventState.tickets, 1);
    await context.useBetaFiveStarTicket();
    assert.equal(context.betaEventState.tickets, 0);
    assert.equal(context.roster.limited.unlocked, false);
    assert.equal(context.roster.owned.shards + context.roster.missing.shards, 10);
    assert.equal(context.BetaEvent.pick(["a", "b"], new Set(["a"]), 0), "b");
    assert.equal(context.BetaEvent.pick([], new Set()), null);
    disk.betaEventState.badgeEquipped = false;
    await context.toggleBetaBadge();
    assert.equal(context.betaEventState.badgeEquipped, true, "stale tab cannot overwrite a newer save");
    const legacy = context.BetaEvent.normalize({ start:"2026-11-07", claimed:["login7", "login14"], memorial:true });
    assert.equal(legacy.claimed.length, 2);
    assert.equal(legacy.souvenirs.includes("beta-frame"), true);
    const oldSave = { v:6, accountName:"Tester", gold:500000, roster:structuredClone(context.roster),
        betaEventState:structuredClone(context.betaEventState) };
    const launched = context.BetaEvent.prepareLaunchSave(oldSave, "launch-1");
    assert.equal(launched.gold, undefined);
    assert.equal(launched.roster, undefined);
    assert.equal(launched.betaEventState.tickets, 0);
    assert.equal(launched.betaEventState.souvenirs.length, 3);
    assert.equal(launched.accountAvatarFrameId, "beta-frame");
    assert.equal(launched.titleOn, "beta-founder");
    assert.equal(context.BetaEvent.prepareLaunchSave(launched, "launch-1"), launched, "launch migration runs once");
    assert.equal(oldSave.gold, 500000, "migration does not mutate the original save");
    today = "2026-11-07";
    assert.equal(context.betaExperienceAmount(100), 200);
    context.GAME_DATA.betaEvent.phase = "launch";
    assert.equal(context.betaExperienceAmount(100), 100);
    vm.runInContext(fs.readFileSync(path.join(__dirname, "../asset/save-system.js"), "utf8"), context);
    const fresh = id => ({ id, unlocked:false, lvl:1, maxHp:100, gauge:0 });
    const rules = {
        characterIds:context.CHAR_IDS, characters:context.CHAR_TABLE, titleIds:["novice", "beta-founder"], gateIds:["fire"],
        maxRank:150, teamMax:3, bossEvery:10, normalFloorWaves:3, bossFloorSeconds:90, normalFloorSeconds:60,
        rankExpNeed:() => 100, normalizeTalentRanks:() => ({}), talentSpent:() => 0,
        normalizeCharacterGrowth() {}, newCharacter:fresh
    };
    const restored = context.SaveSystem.restore(oldSave, context.roster, rules);
    assert.equal(restored.gold, 0);
    assert.equal(restored.roster.owned.lvl, 1, "cloud migration recreates fresh characters from live grown roster");
    assert.equal(restored.roster.owned.unlocked, false);
    assert.equal(restored.accountAvatarFrameId, "beta-frame");
    assert.equal(restored.titleOn, "beta-founder");
    restored.roster.owned.unlocked = true;
    restored.roster.owned.lvl = 12;
    const newSave = { ...restored, picked:true, teamIds:["owned"], squads:[["owned"]], betaEventState:restored.betaEventState };
    const reloaded = context.SaveSystem.restore(newSave, context.roster, rules);
    assert.equal(reloaded.roster.owned.lvl, 12, "normal post-launch reload preserves new progress");
    const growth = fs.readFileSync(path.join(__dirname, "../asset/character-growth.js"), "utf8");
    vm.runInContext(growth.slice(growth.indexOf("function cultivateGrowthChar("), growth.indexOf("// 解放時用獨立覆蓋 Canvas")), context);
    const experience = [];
    Object.assign(context, {
        growthCap:() => 80, hpMax:() => 100, atkOf:() => 10, charName:() => "Owned",
        gainGrowthExp(character, amount) { experience.push(amount); return 0; },
        refreshGrowthAfterPurchase() {}, log() {}
    });
    context.document.querySelector = () => null;
    context.cultivationMaterials = 4;
    context.highGradeExperienceCrystals = 4;
    context.GAME_DATA.betaEvent.phase = "beta";
    context.cultivateGrowthChar("owned");
    context.cultivateGrowthCharWithHighCrystal("owned");
    today = "2026-11-21";
    context.cultivateGrowthChar("owned");
    context.cultivateGrowthCharWithHighCrystal("owned");
    assert.deepEqual(experience, [200, 2000, 100, 1000]);
    console.log("PASS beta rewards, 190 draws, two five-star tickets, expiry, rollback and stale-tab protection");
}

test().catch(error => { console.error(error); process.exitCode = 1; });
