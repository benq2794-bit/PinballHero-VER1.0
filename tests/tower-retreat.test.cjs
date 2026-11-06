const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), path = require('node:path');
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const source = html.slice(html.indexOf('function retreatDeepTenFloors()'), html.indexOf('function nextEnemy()'));
function setup(stage) {
    const visible = new Set(['on']); let saves = 0, spawns = 0;
    const character = { hp: 0, gauge: 100, lvl: 25, shards: 18, exp: 130, talents: { skill: 3 }, breakthrough: 2 };
    const member = { ch: character, down: true, respawnAt: 999 };
    const ctx = { stage, deepTimeLeft: 0, floorWins: 2, tickCounter: 4, combo: 20, comboAt: 100,
        BOSS_EVERY: 10, NORMAL_FLOOR_SECONDS: 60, BOSS_FLOOR_SECONDS: 90, FEVER_BASE: 1000,
        shardTotal: 123, deepPerks: { damage: 2 },
        PF: { paused: true, running: false, members: [member], foeSeq: 8, cut: {}, vfx: {},
            el: { classList: { remove() {} }, querySelectorAll: () => [] }, skillQueue: [member], skillCastWait: 300, buff: {}, cutTimer: 99 },
        FEVER: { active: true, value: 1000, times: 3 }, POWER_FLIP: { lockMs: 150, buffMs: 2000, buffPct: .2 },
        COLLISION_TRIAL: { dashLeft: 800 }, FX: { clearPops() {} }, clearTimeout() {},
        $: () => ({ classList: { contains: key => visible.has(key), remove: key => visible.delete(key) } }),
        gateOn: () => false, hpMax: () => 500, attachBall: m => { m.body = {}; }, hideOver() {},
        feverEnd: () => { ctx.FEVER.active = false; }, setPaused: v => { ctx.PF.paused = v; },
        nextEnemy: () => { spawns++; ctx.PF.foeSeq++; }, saveGame: () => saves++, log() {} };
    ctx.window = ctx;
    ctx.cancelSkillCinematic = () => {}; ctx.hideBossEntrance = () => {};
    ctx.clearWeak = () => {}; ctx.clearField = () => {};
    ctx.clearPowerFlip = () => {}; ctx.clearRangerPierce = () => {};
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(require('node:path').resolve(__dirname, '../asset/battle-lifecycle.js'), 'utf8'), ctx);
    ctx.battleLifecycle = ctx.BattleLifecycle.create({ getState: () => ctx.PF, now: () => 0 });
    vm.runInContext(html.slice(html.indexOf('function resetBattleTransient()'), html.indexOf('function el(tag, cls)')), ctx);
    vm.runInContext(source, ctx);
    return { ctx, character, visible, counts: () => ({ saves, spawns }) };
}
for (const [from, to, seconds] of [[27, 17, 60], [20, 10, 90], [10, 1, 60], [8, 1, 60], [1, 1, 60]]) {
    const { ctx: c, character: ch, visible, counts } = setup(from);
    c.retreatDeepTenFloors();
    assert.equal(c.stage, to); assert.equal(c.deepTimeLeft, seconds); assert.equal(c.floorWins, 0);
    assert.equal(c.tickCounter, 0); assert.equal(c.PF.paused, false); assert.equal(c.PF.running, true);
    assert.equal(ch.hp, 500); assert.equal(ch.gauge, 0); assert.equal(c.PF.members[0].down, false);
    assert.equal(ch.lvl, 25); assert.equal(ch.exp, 130); assert.equal(ch.shards, 18); assert.equal(ch.breakthrough, 2); assert.equal(ch.talents.skill, 3);
    assert.equal(c.shardTotal, 123); assert.equal(c.deepPerks.damage, 2);
    assert.equal(c.FEVER.value, 0); assert.equal(c.FEVER.active, false); assert.equal(c.FEVER.maxValue, 1000);
    assert.equal(c.POWER_FLIP.buffPct, 0); assert.equal(c.COLLISION_TRIAL.dashLeft, 0); assert.equal(c.PF.skillQueue.length, 0);
    assert.equal(visible.has('on'), false); assert.deepEqual(counts(), { saves: 1, spawns: 1 });
    c.retreatDeepTenFloors(); assert.equal(c.stage, to); assert.equal(counts().spawns, 1, 'double click ignored');
}
for (const from of [99, 20, 8, 1]) {
    const { ctx: c, character: ch, counts } = setup(from);
    c.restartDeepFromFirst();
    assert.equal(c.stage, 1); assert.equal(c.floorWins, 0); assert.equal(c.deepTimeLeft, 60);
    assert.equal(ch.hp, 500); assert.equal(ch.lvl, 25); assert.equal(ch.shards, 18);
    assert.equal(c.shardTotal, 123); assert.equal(c.deepPerks.damage, 2);
    assert.equal(c.PF.paused, false); assert.deepEqual(counts(), { saves: 1, spawns: 1 });
    c.restartDeepFromFirst(); assert.equal(counts().spawns, 1);
}
for (const mode of ['gate', 'not-failed', 'not-paused', 'hidden']) {
    const { ctx: c, visible, counts } = setup(27);
    if (mode === 'gate') c.gateOn = () => true;
    if (mode === 'not-failed') c.deepTimeLeft = 20;
    if (mode === 'not-paused') c.PF.paused = false;
    if (mode === 'hidden') visible.clear();
    c.retreatDeepTenFloors(); c.restartDeepFromFirst(); assert.equal(c.stage, 27); assert.equal(counts().saves, 0);
}
for (const b of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new Function(b[1]);
assert.match(html, /id="deep-retreat" onclick="retreatDeepTenFloors\(\)"/);
assert.match(html, /id="deep-restart-first" onclick="restartDeepFromFirst\(\)"/);
console.log('PASS: exact 10-floor retreat, floor-one minimum, boss/normal timers, full recovery, combat reset, preserved progression/resources/blessings, save and double-click/invalid-state guards.');
