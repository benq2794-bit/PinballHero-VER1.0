const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let disk = null, saveFails = false, multiplier = 1, actionDialog = null;
const ctx = {
    structuredClone, navigator:{}, GATE_MODE:false, rankLv:150,
    document:{
        addEventListener() {}, querySelector() { return null; },
        getElementById(id) {
            if (id === 'app-frame') return { appendChild(element) { actionDialog = element; } };
            return id === 'growth-action-dialog' ? actionDialog : null;
        },
        createElement() {
            return {
                addEventListener() {}, setAttribute() {}, showModal() {}, close() {},
                querySelector() { return { focus() {} }; }
            };
        }
    },
    addEventListener() {}, $:() => null, renderPage() {}, updateUI() {}, log() {}, hmToast() {},
    roster:{}, growthExpReserve:0, cultivationMaterials:1000, highGradeExperienceCrystals:10, gold:1234,
    CHAR_TABLE:{ hero:{ id:'hero', name:'Hero', title:'Hero', element:'wind', type:'knight', unit:'hero', atk:20, hp:150, powerScale:1, rarity:5 } },
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
ctx.shardTotal = 0;
ctx.towerMaterials = {};
ctx.breakthroughStones = {};
ctx.unitFace = () => '';
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
    ch.lvl = 20;
    ch.exp = 50;
    ch.nextExp = ctx.growthExpNeed(ch.lvl);
    ch.baseAtk += 30;
    ch.maxHp += 150;
    ch.hp = ch.maxHp;
    ch.growthLedger = { version:1, complete:false, experience:0, gold:0, resets:0,
        baseAtk:ch.baseAtk, baseHp:ch.maxHp, talentBudgetFloor:0 };
    ctx.normalizeCharacterGrowth(ch);
    const estimatedInvestment = Array.from({ length:19 }, (_, i) => ctx.growthExpNeed(i + 1))
        .reduce((sum, amount) => sum + amount, 50);
    assert.equal(ch.growthLedger.complete, true, 'legacy investment is estimated only when the old ledger is missing');
    assert.equal(ch.growthLedger.estimated, true);
    assert.equal(ch.growthLedger.experience, estimatedInvestment);
    assert.equal(ch.growthLedger.gold, 0, 'legacy cultivation never spent gold');
    assert.equal(ch.growthLedger.baseAtk, 20, 'legacy reset restores base attack');
    assert.equal(ch.growthLedger.baseHp, 150, 'legacy reset restores base health');
    vm.runInContext("growthFor='hero'", ctx);
    const resetPage = ctx.renderGrowthPage();
    const resetButton = resetPage.match(/<button type="button" onclick="openGrowthActionDialog\('hero','reset'\)"([^>]*)>/);
    assert.ok(resetButton);
    assert.doesNotMatch(resetButton[1], /\sdisabled(?:\s|$)/, 'legacy level reset button is enabled when estimated');
    assert.match(resetPage, /重置等級（3\/3）/);
    const legacyQuote = ctx.growthResetQuote(ch);
    assert.equal(legacyQuote.experience, Math.floor(estimatedInvestment * .8));
    assert.equal(legacyQuote.remaining, 3);
    ctx.saveGame();
    ctx.openGrowthActionDialog('hero', 'reset');
    assert.match(actionDialog.innerHTML, /重置等級/);
    assert.match(actionDialog.innerHTML, /依角色等級估算/);
    assert.match(actionDialog.innerHTML, /3 → 2/);
    await ctx.confirmGrowthAction();
    assert.equal(ch.lvl, 1, 'confirming the legacy reset dialog resets the character');
    assert.equal(ch.growthLedger.resets, 1, 'confirming the dialog consumes one reset');
    assert.equal(ch.growthLedger.estimated, false, 'later resets use exact post-migration tracking');
    assert.equal(ctx.growthExpReserve, legacyQuote.experience, 'legacy reset grants the estimated 80% refund');
    assert.equal(ch.baseAtk, 20);
    assert.equal(ch.maxHp, 150);
    ctx.saveGame();
    await ctx.upgradeGrowthLevels('hero', 1);
    assert.equal(ch.lvl, 2, 'legacy accounts can still upgrade after reset');
    const invalidLedgerCharacter = fixture();
    invalidLedgerCharacter.lvl = 20;
    invalidLedgerCharacter.growthLedger.version = 2;
    ctx.normalizeCharacterGrowth(invalidLedgerCharacter);
    assert.equal(invalidLedgerCharacter.growthLedger.complete, false, 'corrupt ledgers are not converted into estimates');
    assert.match(ctx.growthResetQuote(invalidLedgerCharacter).error, /舊存檔/);
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
    assert.equal(restored.roster.hero.growthLedger.complete, true, 'old saves receive a level-based investment estimate');
    assert.equal(restored.roster.hero.growthLedger.estimated, true, 'old-save estimate remains explicitly marked');
    assert.equal(restored.roster.hero.lvl, 2);
    ch = fixture();
    await ctx.upgradeGrowthLevels('hero', 1);
    await ctx.resetGrowthLevel('hero', stamp());
    const persisted = { picked:true, ...disk, teamIds:['hero'] };
    const reloaded = ctx.SaveSystem.restore(persisted, { hero:ctx.newChar('hero', false) }, rules);
    assert.equal(reloaded.growthExpReserve, ctx.growthExpReserve);
    assert.equal(reloaded.roster.hero.growthLedger.resets, 1);
    console.log('PASS batch levels, real input refunds, bonus exclusion, 3 resets, legacy estimate and dialog, corrupt-ledger protection, talent preservation, rollback and stale tabs');
}
test().catch(error => { console.error(error); process.exitCode = 1; });
