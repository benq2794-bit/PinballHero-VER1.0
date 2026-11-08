const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let disk = null, saveFails = false, multiplier = 1;
const ctx = {
    structuredClone, navigator:{}, GATE_MODE:false, rankLv:150,
    document:{ addEventListener() {}, querySelector() { return null; } },
    addEventListener() {}, $:() => null, renderPage() {}, updateUI() {}, log() {}, hmToast() {},
    roster:{}, growthExpReserve:0, cultivationMaterials:1000, highGradeExperienceCrystals:10, gold:1234,
    CHAR_TABLE:{ hero:{ type:'knight', atk:20, hp:150, powerScale:1, rarity:5 } },
    betaExperienceAmount:n => n * multiplier, charName:() => 'Hero',
    atkOf:ch => ch.baseAtk, hpMax:ch => ch.maxHp,
    saveStore:{ read:() => disk ? { ok:true, data:disk } : { ok:false } },
    saveGame() {
        if (saveFails) return false;
        disk = structuredClone({ roster:ctx.roster, growthExpReserve:ctx.growthExpReserve,
            cultivationMaterials:ctx.cultivationMaterials, highGradeExperienceCrystals:ctx.highGradeExperienceCrystals, gold:ctx.gold });
        return true;
    }
};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'asset/game-data.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'asset/character-growth.js'), 'utf8'), ctx);
vm.runInContext(html.slice(html.indexOf('function newChar('), html.indexOf('let roster =')), ctx);
const stamp = () => ctx.growthResourceKey(ctx.roster.hero, ctx.growthCurrentWallet());
function fixture() {
    ctx.roster.hero = ctx.newChar('hero', true);
    ctx.growthExpReserve = 0;
    ctx.cultivationMaterials = 10000;
    ctx.highGradeExperienceCrystals = 10;
    ctx.gold = 1234;
    saveFails = false;
    multiplier = 1;
    ctx.saveGame();
    return ctx.roster.hero;
}
async function test() {
    let ch = fixture();
    await ctx.upgradeGrowthLevels('hero', 10);
    assert.equal(ch.lvl, 11);
    assert.equal(ch.growthLedger.experience, Array.from({ length:10 }, (_, i) => ctx.growthExpNeed(i + 1)).reduce((a, b) => a + b, 0));
    assert.equal(ctx.gold, 1234, 'existing cultivation has no gold fee');
    ch.breakthrough = 1;
    ch.talents = { skill:2, pf:1, survival:0 };
    ctx.saveGame();
    const budget = ctx.talentBudget(ch), spent = ch.growthLedger.experience;
    const quote = ctx.growthResetQuote(ch), key = stamp();
    await Promise.all([ctx.resetGrowthLevel('hero', key), ctx.resetGrowthLevel('hero', key)]);
    assert.equal(ch.lvl, 1);
    assert.equal(ch.baseAtk, 20);
    assert.equal(ch.maxHp, 150);
    assert.equal(ch.breakthrough, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(ch.talents)), { skill:2, pf:1, survival:0 });
    assert.equal(ctx.talentBudget(ch), budget);
    assert.equal(ctx.growthExpReserve, Math.floor(spent * .8));
    assert.equal(quote.gold, 0);
    assert.equal(ch.growthLedger.resets, 1);
    ctx.normalizeCharacterGrowth(ch);
    assert.equal(ch.talents.skill, 2, 'reload normalization preserves talents after reset');
    ctx.saveGame();
    for (let i = 0; i < 2; i++) {
        await ctx.upgradeGrowthLevels('hero', 1);
        await ctx.resetGrowthLevel('hero', stamp());
    }
    assert.equal(ch.growthLedger.resets, 3);
    await ctx.upgradeGrowthLevels('hero', 1);
    const fourth = JSON.stringify(disk);
    await ctx.resetGrowthLevel('hero', stamp());
    assert.equal(JSON.stringify(disk), fourth, 'fourth reset cannot issue another refund');

    ch = fixture();
    const before = structuredClone(disk);
    saveFails = true;
    await ctx.upgradeGrowthLevels('hero', 10);
    assert.equal(ch.lvl, 1);
    assert.equal(ctx.cultivationMaterials, before.cultivationMaterials);
    assert.equal(JSON.stringify(disk), JSON.stringify(before));
    saveFails = false;
    await ctx.upgradeGrowthLevels('hero', 1);
    ctx.saveGame();
    const beforeReset = structuredClone(disk);
    saveFails = true;
    await ctx.resetGrowthLevel('hero', stamp());
    assert.equal(ch.lvl, beforeReset.roster.hero.lvl);
    assert.equal(ch.growthLedger.resets, 0);
    assert.equal(ctx.growthExpReserve, 0);
    saveFails = false;
    disk.growthExpReserve = 99;
    assert.equal(await ctx.upgradeGrowthLevels('hero', 1), false, 'stale tab cannot overwrite resource changes');

    ch = fixture();
    multiplier = 2;
    ctx.cultivationMaterials = 1;
    ctx.saveGame();
    await ctx.cultivateGrowthChar('hero');
    assert.equal(ch.growthLedger.experience, 100, 'bonus experience is not recorded as paid resources');
    assert.equal(ctx.growthResetQuote(ch).experience, 80);
    await ctx.resetGrowthLevel('hero', stamp());
    assert.equal(ctx.growthExpReserve, 80);

    ch = fixture();
    ctx.cultivationMaterials = 0;
    ctx.highGradeExperienceCrystals = 1;
    ctx.saveGame();
    await ctx.upgradeGrowthLevels('hero', 1);
    assert.equal(ch.lvl, 2);
    assert.equal(ctx.highGradeExperienceCrystals, 0);
    assert.equal(ctx.growthExpReserve, 900, 'unused crystal denomination is preserved');
    assert.equal(ch.growthLedger.experience, 100);
    assert.equal(ctx.growthUpgradeQuote(ch, 'cap'), null, 'max upgrade requires enough resources');

    ch = fixture();
    ctx.cultivationMaterials = 1000000;
    ctx.saveGame();
    const capQuote = ctx.growthUpgradeQuote(ch, 'cap');
    assert.ok(capQuote);
    await ctx.upgradeGrowthLevels('hero', 'cap');
    assert.equal(ch.lvl, ctx.growthCap(ch), 'one-click upgrade reaches the current unlocked cap');
    assert.equal(ch.growthLedger.experience, capQuote.spent);
    assert.equal(ctx.gold, 1234);

    ch = fixture();
    delete ch.growthLedger;
    ch.lvl = 20;
    ctx.normalizeCharacterGrowth(ch);
    assert.match(ctx.growthResetQuote(ch).error, /舊存檔/);
    ctx.saveGame();
    await ctx.upgradeGrowthLevels('hero', 1);
    assert.equal(ch.lvl, 21, 'legacy accounts can still upgrade');
    assert.equal(ch.growthLedger.complete, false, 'new records never guess the missing old investment');
    vm.runInContext(fs.readFileSync(path.join(root, 'asset/gate-enhancement.js'), 'utf8'), ctx);
    vm.runInContext(fs.readFileSync(path.join(root, 'asset/save-system.js'), 'utf8'), ctx);
    const rules = {
        characterIds:['hero'], characters:ctx.CHAR_TABLE, titleIds:['novice'], gateIds:[],
        maxRank:150, teamMax:3, bossEvery:10, normalFloorWaves:3, bossFloorSeconds:90, normalFloorSeconds:60,
        rankExpNeed:() => 100, normalizeTalentRanks:() => ({}), talentSpent:() => 0,
        normalizeCharacterGrowth:ctx.normalizeCharacterGrowth
    };
    const oldCharacter = structuredClone(ch);
    delete oldCharacter.growthLedger;
    const legacySave = { picked:true, roster:{ hero:oldCharacter }, teamIds:['hero'] };
    const restored = ctx.SaveSystem.restore(legacySave, { hero:ctx.newChar('hero', false) }, rules);
    assert.equal(restored.roster.hero.growthLedger.complete, false, 'old saves never inherit a fresh-character ledger');
    assert.equal(restored.roster.hero.lvl, 21);
    ch = fixture();
    await ctx.upgradeGrowthLevels('hero', 1);
    await ctx.resetGrowthLevel('hero', stamp());
    const persisted = { picked:true, ...disk, teamIds:['hero'] };
    const reloaded = ctx.SaveSystem.restore(persisted, { hero:ctx.newChar('hero', false) }, rules);
    assert.equal(reloaded.growthExpReserve, ctx.growthExpReserve);
    assert.equal(reloaded.roster.hero.growthLedger.resets, 1);
    console.log('PASS batch levels, real input refunds, bonus exclusion, 3 resets, talent preservation, legacy lock, rollback and stale tabs');
}
test().catch(error => { console.error(error); process.exitCode = 1; });
