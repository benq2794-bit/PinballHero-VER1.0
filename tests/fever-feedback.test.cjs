const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), path = require('node:path');
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const functions = html.slice(html.indexOf('function paintFeverFlippers()'), html.indexOf('// 只攔正在下落的球'));
const classes = new Set(), node = { classList: { add: x => classes.add(x), remove: (...xs) => xs.forEach(x => classes.delete(x)) } };
let gold = 0, starts = 0, clears = 0;
const energyMember = { ch: { gauge: 50 } };
const ctx = { FEVER: { active: false, value: 0, maxValue: 1000, times: 0 }, FEVER_MS: 10000,
    FEVER_BASE: 1000, FEVER_STEP: 500, FEVER_CAP: 3000, feverCombo: 0,
    $: () => node, setFlipperGold: value => { gold = value; }, spawnFeverPads: () => starts++,
    clearFeverPads: () => clears++, SFX: { feverStart() {} }, log() {},
    typeEffects: { feverStartGauge: () => 3 }, aliveMembers: () => [energyMember], queueReadySkill() {} };
ctx.window=ctx; ctx.PF={}; vm.createContext(ctx); vm.runInContext(functions, ctx);
assert.equal(ctx.feverAdd(18), 18); assert.equal(ctx.FEVER.value, 18); assert.equal(gold, .018);
ctx.FEVER.value = 995; assert.equal(ctx.feverAdd(18), 5); assert.equal(starts, 1);
assert.equal(ctx.FEVER.left, 10000); assert.equal(classes.has('fever-on'), true);
assert.equal(energyMember.ch.gauge, 53, '共鳴脈衝在 FEVER 發動時補全隊能量');
assert.equal(ctx.feverAdd(18), 0, 'cannot collect twice during active FEVER');
assert.equal(energyMember.ch.gauge, 53, 'FEVER 期間不重複補能');
ctx.feverUpdate(4000); assert.equal(ctx.FEVER.left, 6000); assert.equal(gold, .6);
ctx.feverUpdate(6000); assert.equal(ctx.FEVER.active, false); assert.equal(ctx.FEVER.value, 0);
assert.equal(ctx.FEVER.maxValue, 1500); assert.equal(clears, 1); assert.equal(classes.has('fever-on'), false);
ctx.FEVER.times = 99; ctx.feverEnd(); assert.equal(ctx.FEVER.maxValue, 3000);
console.log('PASS: FEVER credit, threshold activation, start energy, flipper feedback, countdown, cleanup and capped next threshold.');
