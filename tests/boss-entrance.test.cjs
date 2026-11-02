const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.resolve(__dirname, '..');
function element() {
    const classes = new Set();
    return { style: { setProperty() {}, removeProperty() {} }, offsetWidth: 300,
        classList: { add: (...xs) => xs.forEach(x => classes.add(x)), remove: (...xs) => xs.forEach(x => classes.delete(x)),
            contains: x => classes.has(x), toggle: (x, v) => v ? classes.add(x) : classes.delete(x) },
        setAttribute() {} };
}
const elements = Object.fromEntries(['boss-entrance', 'boss-entrance-title', 'boss-entrance-floor', 'boss-entrance-name', 'boss-entrance-element', 'boss-entrance-image', 'pf-frame'].map(id => [id, element()]));
let time = 0, gate = false, tones = 0;
const ctx = { window: null, W: 430, H: 760, performance: { now: () => time }, setTimeout: () => 0,
    GATE: { id: null, t0: 0 }, $: id => elements[id], stage: 20,
    PF: { foeSeq: 2, ready: true, running: true, paused: false, el: element(), nextCastAt: 5000,
        members: [], burns: [], foe: { x: 215, y: 300, r: 44, node: element(), ball: element() } },
    enemy: { boss: true, hp: 100, maxHp: 100, element: 'fire', name: '原始名稱', battleSkinUrl: 'asset/monster/ro/angeling.png' },
    ELEMENTS: { fire: { label: '火', color: '#ff4757' } }, gateOn: () => gate,
    gateOf: () => ({ gate: '炎之門' }), partyPilot: () => null,
    FX: { sparks() {} }, SFX: { tone() { tones++; }, noise() {} } };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'asset/battle-lifecycle.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'asset/boss-entrance.js'), 'utf8') + ';this.intro=BOSS_ENTRANCE;', ctx);
const step = ms => { time += ms; ctx.updateBossEntrance(ms); };
elements['pf-frame'].offsetWidth = 0;
ctx.queueBossEntrance(); step(5000); assert.equal(ctx.intro.pending, true); assert.equal(tones, 0);
elements['pf-frame'].offsetWidth = 300; step(0);
assert.equal(ctx.intro.pending, false); assert.equal(ctx.bossEntranceFreezesBattle(), true);
assert.equal(elements['boss-entrance-name'].textContent, '天使波利');
step(819); assert.equal(ctx.intro.data.phase, 0); step(1); assert.equal(ctx.intro.data.phase, 1);
assert.equal(elements['boss-entrance'].classList.contains('on'), false);
ctx.PF.paused = true; const elapsed = ctx.intro.elapsed; step(5000); assert.equal(ctx.intro.elapsed, elapsed);
ctx.PF.paused = false; step(467); assert.equal(ctx.intro.data.touchedDown, undefined);
step(1); assert.equal(ctx.intro.data.touchedDown, true); assert.equal(elements['boss-entrance'].classList.contains('on'), true);
step(512); assert.equal(ctx.intro.data.phase, 2); step(760);
assert.equal(ctx.intro.data, null); assert.equal(ctx.bossEntranceFreezesBattle(), false);
const sounds = tones; step(1000); assert.equal(tones, sounds, 'completed intros do not replay');
ctx.enemy.boss = false; ctx.queueBossEntrance(); assert.equal(ctx.intro.pending, false);
ctx.enemy.boss = true; gate = true; ctx.GATE.id = 'fire'; ctx.GATE.t0 = time;
ctx.enemy.name = '赤焰龍・焚原'; ctx.enemy.battleSkinUrl = 'nidhogg.webp';
ctx.queueBossEntrance(); step(0); assert.equal(elements['boss-entrance-floor'].textContent, '炎之門');
const started = ctx.GATE.t0, deadline = ctx.PF.nextCastAt; step(2560);
assert.equal(ctx.GATE.t0, started + 2560); assert.equal(ctx.PF.nextCastAt, deadline + 2560);
ctx.queueBossEntrance(); step(820); ctx.PF.foeSeq++; step(1000);
assert.equal(ctx.intro.data, null, 'changing encounters cancels pending landing');
console.log('PASS: hidden/pause guards, intro phases, frame-timed landing, HP charging, clock restoration, cancellation and no replay.');
