const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ctx = { window: null };
ctx.window = ctx;
vm.createContext(ctx);
for (const file of ['asset/progression-formulas.js', 'asset/character-growth.js', 'asset/job-talents.js', 'asset/save-system.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx);
}
const { SaveSystem } = ctx;
const copy = value => JSON.parse(JSON.stringify(value));
ctx.CHAR_TABLE = {
    hero: { type: 'knight', atk: 20, hp: 150 },
    ally: { type: 'ranger', atk: 30, hp: 120 },
    locked: { type: 'supporter', atk: 10, hp: 180 }
};
vm.runInContext(html.slice(html.indexOf('function newChar('), html.indexOf('let roster =')), ctx);
const ids = Object.keys(ctx.CHAR_TABLE);
const defaults = Object.fromEntries(ids.map(id => [id, ctx.newChar(id, false)]));
const rules = {
    characterIds: ids, characters: ctx.CHAR_TABLE,
    jobs: { warrior: {}, mage: {}, priest: {}, thief: {}, archer: {} },
    roleToJob: { knight: 'warrior', ranger: 'archer', supporter: 'priest' },
    statKeys: ['str', 'agi', 'vit', 'int', 'dex', 'luk'],
    titleIds: ['novice', 'master'], gateIds: ['fire', 'water'],
    maxRank: 150, teamMax: 3, bossEvery: 10, normalFloorWaves: 3,
    bossFloorSeconds: 90, normalFloorSeconds: 60,
    rankExpNeed: level => ctx.ProgressionFormulas.rankExpNeed(level),
    normalizeTalentRanks: ctx.normalizeJobTalentRanks,
    talentSpent: ranks => ctx.jobTalentSpent(null, ranks),
    normalizeCharacterGrowth: ctx.normalizeCharacterGrowth
};
function fixture() {
    const roster = copy(defaults);
    Object.assign(roster.hero, { unlocked: true, lvl: 17, baseAtk: 68, maxHp: 470, exp: 200, hp: 5, gauge: 88,
        talents: { skill: 2, pf: 1, survival: 0 } });
    roster.ally.unlocked = true;
    return {
        picked: true, accountCreated: true, accountGender: 'female', accountName: '玩家',
        mainAccountJob: 'warrior', accountStats: { str: 10, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 },
        accountStatPoints: 4, jobTalentPoints: 0, jobTalentRanks: { warrior: { warrior_recovery: 2 } },
        jobPassiveActive: false, tutorialSeen: true, stage: 5, rankLv: 10, rankExp: 50,
        kills: 12, floorWins: 1, deepTimeLeft: 37, shardTotal: 80, teamIds: ['hero'],
        unisonMap: { hero: 'ally' }, titleOn: 'master', bossWin: { fire: 2 }, shakeOn: false, roster
    };
}
const values = new Map();
let writes = 0;
const storage = {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => { writes++; values.set(key, value); },
    removeItem: key => values.delete(key)
};
const key = 'wf_local_save_v5';
const store = SaveSystem.createStore({ key, getStorage: () => storage });
{
    const state = fixture(), snapshot = SaveSystem.createSnapshot(state, ids);
    assert.equal(snapshot.v, 6, 'keep the existing save version');
    assert.equal(snapshot.roster.hero.growthVersion, 2);
    assert.equal('hp' in snapshot.roster.hero, false, 'do not persist temporary combat HP');
    assert.equal('gauge' in snapshot.roster.hero, false);
    state.accountStats.str = 99; state.roster.hero.talents.skill = 8;
    assert.equal(snapshot.accountStats.str, 10, 'snapshot is independent of live data');
    assert.equal(snapshot.roster.hero.talents.skill, 2);
    assert.equal(store.write(snapshot).ok, true);
    assert.deepEqual(copy(store.read().data), copy(snapshot));
    const before = copy(defaults);
    const restored = SaveSystem.restore(store.read().data, defaults, rules);
    assert.equal(restored.accountName, '玩家');
    assert.equal(restored.stage, 5); assert.equal(restored.rankLv, 10);
    assert.equal(restored.roster.hero.lvl, 17);
    assert.equal(restored.roster.hero.hp, 470); assert.equal(restored.roster.hero.gauge, 0);
    assert.equal(restored.roster.hero.talents.skill, 2);
    assert.equal(restored.jobTalentPoints, 0, 'recompute milestones minus learned ranks');
    assert.equal(restored.shakeOn, false);
    assert.deepEqual(copy(restored.unisonMap), { hero: 'ally' });
    assert.deepEqual(copy(defaults), before, 'restoration does not mutate live roster');
}
{
    const p = { v: 6, picked: true, kills: 27, roster: { ally: { unlocked: true } }, mainAccountJob: 'ranger' };
    const restored = SaveSystem.restore(p, defaults, rules);
    assert.equal(restored.stage, 10, 'legacy stage comes from kills');
    assert.equal(restored.rankLv, 10, 'legacy Rank comes from stage');
    assert.equal(restored.accountCreated, true);
    assert.equal(restored.tutorialSeen, true);
    assert.equal(restored.mainAccountJob, 'archer', 'migrate old role names');
    assert.equal(restored.accountStatPoints, 24);
    assert.equal(restored.deepTimeLeft, 90); assert.equal(restored.floorWins, 0);
    assert.deepEqual(copy(restored.teamIds), ['ally']);
}
{
    const p = SaveSystem.createSnapshot(fixture(), ids);
    p.rankLv = 149; p.rankExp = 100000; p.accountStats.str = 999; p.accountStats.agi = -10;
    p.stage = 10; p.floorWins = 2; p.deepTimeLeft = 999; p.bossWin.unknown = 100;
    p.unisonMap = { hero: 'locked' }; p.teamIds = ['removed', 'locked', 'hero'];
    const restored = SaveSystem.restore(p, defaults, rules);
    assert.equal(restored.rankLv, 150); assert.equal(restored.rankExp, 0);
    assert.equal(restored.accountStats.str, 99); assert.equal(restored.accountStats.agi, 0);
    assert.equal(restored.floorWins, 0); assert.equal(restored.deepTimeLeft, 90);
    assert.deepEqual(copy(restored.teamIds), ['hero']);
    assert.deepEqual(copy(restored.unisonMap), {});
    assert.deepEqual(copy(restored.bossWin), { fire: 2 });
    const old = copy(p); old.roster.hero.growthVersion = 1; old.roster.hero.legacyCap = 100;
    const migrated = SaveSystem.restore(old, defaults, rules);
    assert.equal(migrated.roster.hero.growthVersion, 2);
    assert.equal(migrated.roster.hero.breakthrough, 4, 'keep legacy growth migration');
    const empty = SaveSystem.restore({ v: 6, picked: true, teamIds: ['removed'] }, defaults, rules);
    assert.equal(empty.starterPicked, false);
}
{
    for (const raw of ['{bad json', 'null', '[]']) {
        values.set(key, raw);
        assert.equal(store.read().note, SaveSystem.parseFailure);
        assert.equal(values.get(key), raw, 'failed read never deletes an existing save');
    }
    values.set(key, JSON.stringify({ v: 5 }));
    assert.match(store.read().note, /v5/);
    const blocked = SaveSystem.createStore({ key, getStorage: () => { throw Error('blocked'); } });
    assert.equal(blocked.read().ok, false); assert.equal(blocked.write({}).ok, false);
    assert.equal(blocked.remove(), false);
}
// Exercise the actual main-page integration, including failure before the state commit.
{
    let spawns = 0;
    Object.assign(ctx, {
        SAVE_KEY: key, localStorage: storage, GATE_MODE: false, roster: copy(defaults),
        CHAR_IDS: ids, ACCOUNT_JOBS: rules.jobs, ROLE_TO_ACCOUNT_JOB: rules.roleToJob,
        ACCOUNT_STATS: rules.statKeys.map(key => ({ key })), TITLE_TABLE: rules.titleIds.map(id => ({ id })),
        BOSS_STAGES: rules.gateIds.map(id => ({ id })), MAX_RANK: 150, TEAM_MAX: 3,
        BOSS_EVERY: 10, NORMAL_FLOOR_WAVES: 3, BOSS_FLOOR_SECONDS: 90, NORMAL_FLOOR_SECONDS: 60,
        rankExpNeed: rules.rankExpNeed, FX: {}, spawnEnemy: () => spawns++, log: () => {},
        stage: 1, rankLv: 1, starterPicked: false, accountCreated: false, accountGender: 'male',
        accountName: '', mainAccountJob: 'warrior', tutorialSeen: false, kills: 0, rankExp: 0,
        floorWins: 0, deepTimeLeft: 60, shardTotal: 0, teamIds: [], accountStats: {},
        accountStatPoints: 6, unisonMap: {}, titleOn: 'novice', bossWin: {}
    });
    vm.runInContext(html.slice(html.indexOf('// ===== 存檔：'), html.indexOf('function resetSave()')), ctx);
    const malformed = SaveSystem.createSnapshot(fixture(), ids);
    malformed.teamIds = 'invalid';
    values.set(key, JSON.stringify(malformed));
    const before = copy(ctx.roster);
    assert.equal(ctx.loadGame(), false);
    assert.equal(ctx.rankLv, 1); assert.equal(ctx.stage, 1); assert.equal(spawns, 0);
    assert.deepEqual(copy(ctx.roster), before, 'failed load cannot partially replace characters');
    values.set(key, JSON.stringify(SaveSystem.createSnapshot(fixture(), ids)));
    assert.equal(ctx.loadGame(), true); assert.equal(spawns, 1);
    assert.equal(ctx.rankLv, 10); assert.equal(ctx.roster.hero.lvl, 17);
    assert.equal(vm.runInContext("jobTalentRanks.warrior.warrior_recovery", ctx), 2);
    ctx.saveGame(); assert.equal(store.read().data.accountName, '玩家');
    const previousWrites = writes;
    ctx.GATE_MODE = 'fire'; ctx.saveGame();
    assert.equal(writes, previousWrites, 'gate instance cannot overwrite the main save');
}
console.log('PASS: save round trips, legacy growth/roles, Rank cap, talent budgets, invalid data, storage errors, atomic load and gate write protection.');
