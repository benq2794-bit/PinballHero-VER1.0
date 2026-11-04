const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ctx = { window: null, addEventListener() {}, document: { addEventListener() {}, hidden: false } };
ctx.window = ctx;
vm.createContext(ctx);
for (const file of ['asset/game-data.js', 'asset/progression-formulas.js', 'asset/character-growth.js', 'asset/type-talents.js', 'asset/save-system.js']) {
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
    statKeys: ['str', 'agi', 'vit', 'int', 'dex', 'luk'],
    titleIds: ['novice', 'master'], gateIds: ['fire', 'water'], elementIds: ['fire', 'water'],
    maxRank: 150, teamMax: 3, bossEvery: 10, normalFloorWaves: 3,
    bossFloorSeconds: 90, normalFloorSeconds: 60,
    rankExpNeed: level => ctx.ProgressionFormulas.rankExpNeed(level),
    normalizeTalentRanks: ctx.normalizeTypeTalentRanks,
    talentSpent: ranks => ctx.typeTalentSpent(null, ranks),
    normalizeCharacterGrowth: ctx.normalizeCharacterGrowth
};
// 舊存檔以職業（warrior）為車道 key，對不到新的攻擊型態樹，讀入即歸零。
const LEGACY_RANKS = { warrior: { warrior_recovery: 2 } };
// 新格式：車道 key 是五種攻擊型態，節點 id 帶型態前綴。
const TYPE_RANKS = { knight: { knight_recovery: 2 } };
function fixture(ranks = LEGACY_RANKS) {
    const roster = copy(defaults);
    Object.assign(roster.hero, { unlocked: true, lvl: 17, baseAtk: 68, maxHp: 470, exp: 200, hp: 5, gauge: 88,
        talents: { skill: 2, pf: 1, survival: 0 } });
    roster.ally.unlocked = true;
    return {
        picked: true, accountCreated: true, accountName: '玩家', accountAvatarId: 'hero',
        typeTalentPoints: 0, typeTalentRanks: ranks,
        tutorialSeen: true, stage: 5, rankLv: 10, rankExp: 50,
        kills: 12, floorWins: 1, deepTimeLeft: 37, shardTotal: 80, teamIds: ['hero'],
        unisonMap: { hero: 'ally' }, titleOn: 'master', bossWin: { fire: 2 }, shakeOn: false,
        gateRecord: { fire: { ms: 9500, score: 4200 } }, cultivationMaterials: 7, limitedSummonCount: 3, roster
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
    state.accountName = '改掉'; state.roster.hero.talents.skill = 8;
    assert.equal(snapshot.accountName, '玩家', 'snapshot is independent of live data');
    assert.equal(snapshot.roster.hero.talents.skill, 2);
    assert.equal(store.write(snapshot).ok, true);
    assert.deepEqual(copy(store.read().data), copy(snapshot));
    const before = copy(defaults);
    const restored = SaveSystem.restore(store.read().data, defaults, rules);
    assert.equal(restored.accountName, '玩家');
    assert.equal(restored.accountAvatarId, 'hero', '頭像角色跟著存檔來回');
    assert.equal(restored.stage, 5); assert.equal(restored.rankLv, 10);
    assert.equal(restored.roster.hero.lvl, 17);
    assert.equal(restored.roster.hero.hp, 470); assert.equal(restored.roster.hero.gauge, 0);
    assert.equal(restored.roster.hero.talents.skill, 2);
    assert.equal(restored.typeTalentPoints, 2, 'Rank 10 給 2 點，舊職業車道歸零後全額返還');
    assert.deepEqual(copy(restored.typeTalentRanks), { knight: {}, fighter: {}, ranger: {}, supporter: {}, special: {} },
        '以職業為 key 的舊等級不會進到新型態樹');
    assert.equal(restored.shakeOn, false);
    assert.deepEqual(copy(restored.unisonMap), { hero: 'ally' });
    // 最佳紀錄／養料／限定招募：新欄位都要讀得回來。
    assert.deepEqual(copy(restored.gateRecord), { fire: { ms: 9500, score: 4200 }, water: { ms: 0, score: 0 } });
    assert.equal(restored.cultivationMaterials, 7);
    assert.equal(restored.limitedSummonCount, 3);
    assert.deepEqual(copy(defaults), before, 'restoration does not mutate live roster');
}
{
    // 新格式車道 key 用攻擊型態，已學點數要從 Rank 里程碑裡扣掉。
    const restored = SaveSystem.restore(SaveSystem.createSnapshot(fixture(TYPE_RANKS), ids), defaults, rules);
    assert.equal(restored.typeTalentRanks.knight.knight_recovery, 2, '保留新型態節點');
    assert.equal(restored.typeTalentPoints, 0, '2 點里程碑扣掉已學的 2 點');
    assert.equal(ctx.typeTalentSpent(null, restored.typeTalentRanks), 2);
}
{
    const p = { v: 6, picked: true, kills: 27, roster: { ally: { unlocked: true } } };
    const restored = SaveSystem.restore(p, defaults, rules);
    assert.equal(restored.stage, 10, 'legacy stage comes from kills');
    assert.equal(restored.rankLv, 10, 'legacy Rank comes from stage');
    assert.equal(restored.accountCreated, true);
    assert.equal(restored.tutorialSeen, true);
    assert.equal('accountStats' in restored, false, '帳號屬性系統已移除，不會從舊存檔復活');
    assert.equal(restored.deepTimeLeft, 90); assert.equal(restored.floorWins, 0);
    assert.deepEqual(copy(restored.teamIds), ['ally']);
    assert.equal(restored.typeTalentPoints, 2, '缺天賦欄位時依 Rank 補發');
}
{
    const p = SaveSystem.createSnapshot(fixture(), ids);
    p.rankLv = 149; p.rankExp = 100000; p.shardTotal = -5; p.cultivationMaterials = 1e9;
    p.stage = 10; p.floorWins = 2; p.deepTimeLeft = 999; p.bossWin.unknown = 100;
    p.unisonMap = { hero: 'locked' }; p.teamIds = ['removed', 'locked', 'hero'];
    const restored = SaveSystem.restore(p, defaults, rules);
    assert.equal(restored.rankLv, 150); assert.equal(restored.rankExp, 0);
    assert.equal(restored.shardTotal, 0); assert.equal(restored.cultivationMaterials, 999999);
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
    // 配隊1–4：舊存檔只有 teamIds 時鋪進配隊1，髒資料要逐隊過濾。
    const legacy = SaveSystem.restore({ v: 6, picked: true, roster: { hero: { unlocked: true } }, teamIds: ['hero'] }, defaults, rules);
    assert.deepEqual(copy(legacy.squads), [['hero'], [], [], []], '舊存檔的出戰名單變成配隊1');
    assert.equal(legacy.squadOn, 0); assert.deepEqual(copy(legacy.teamIds), ['hero']);

    const p = fixture();
    p.squads = [['hero', 'ghost'], ['ally'], ['locked'], []];
    p.squadOn = 2;
    const mixed = SaveSystem.restore(SaveSystem.createSnapshot(p, ids), defaults, rules);
    assert.deepEqual(copy(mixed.squads), [['hero'], ['ally'], [], []], '未解鎖與不存在角色不會留在配隊裡');
    assert.equal(mixed.squadOn, 0, '指定的配隊3 被清空後退回第一支有人的一隊');
    assert.deepEqual(copy(mixed.teamIds), ['hero'], '戰場隊伍永遠跟實戰那一隊一致');
    p.squadOn = 1;
    const battle2 = SaveSystem.restore(SaveSystem.createSnapshot(p, ids), defaults, rules);
    assert.equal(battle2.squadOn, 1); assert.deepEqual(copy(battle2.teamIds), ['ally']);
    assert.deepEqual(copy(SaveSystem.createSnapshot(mixed, ids).squads), copy(mixed.squads), '配隊會寫進存檔快照');
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
        CHAR_IDS: ids, DEV_MODE: true,
        TITLE_TABLE: rules.titleIds.map(id => ({ id })),
        BOSS_STAGES: rules.gateIds.map(id => ({ id })), MAX_RANK: 150, TEAM_MAX: 3,
        OPEN_EL: rules.elementIds,
        BOSS_EVERY: 10, NORMAL_FLOOR_WAVES: 3, BOSS_FLOOR_SECONDS: 90, NORMAL_FLOOR_SECONDS: 60,
        rankExpNeed: rules.rankExpNeed, staminaMaxAtRank: () => 60, FX: {}, spawnEnemy: () => spawns++, log: () => {},
        stage: 1, rankLv: 1, starterPicked: false, accountCreated: false, accountAvatarId: '',
        accountName: '', tutorialSeen: false, kills: 0, rankExp: 0,
        floorWins: 0, deepTimeLeft: 60, shardTotal: 0, teamIds: [],
        towerBestStage: 1, stamina: 60, staminaTickAt: Date.now(), typeTalentPoints: 0, typeTalentRanks: {},
        squads: [[], [], [], []], squadOn: 0, gateRecord: {}, cultivationMaterials: 0,
        highGradeExperienceCrystals: 0, breakthroughStones: { fourStar: 0, fiveStar: 0 },
        limitedSummonCount: 0, summonTicketSingle: 0, summonTicketTen: 0,
        unisonMap: {}, titleOn: 'novice', bossWin: {}
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
    assert.equal(vm.runInContext("typeTalentPoints", ctx), 2, '舊職業車道歸零後點數全額返還');
    assert.equal(vm.runInContext("typeTalentRanks.warrior === undefined", ctx), true, '不再承認職業 key');
    assert.equal(vm.runInContext("Object.keys(typeTalentRanks).join(',')", ctx), 'knight,fighter,ranger,supporter,special');
    // loadGame 把存檔欄位交還給全域：少一顆全域就會被 catch 吞掉、整份存檔讀不進來。
    assert.equal(vm.runInContext("gateRecord.fire.ms", ctx), 9500);
    assert.equal(vm.runInContext("[cultivationMaterials, limitedSummonCount].join(',')", ctx), '7,3');
    ctx.saveGame(); assert.equal(store.read().data.accountName, '玩家');
    const previousWrites = writes;
    ctx.GATE_MODE = 'fire'; ctx.saveGame();
    assert.equal(writes, previousWrites, 'gate instance cannot overwrite the main save');
}
console.log('PASS: save round trips, type-tree legacy reset with point refund, Rank cap, invalid data, storage errors, atomic load and gate write protection.');
