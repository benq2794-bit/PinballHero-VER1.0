const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), path = require('node:path');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

// 1. Verify DOM Elements in index.html
assert.ok(html.includes('id="pf-fever"'), 'FEVER text element exists');
assert.ok(html.includes('id="pf-fever-gauge"'), 'FEVER gauge container exists');
assert.ok(html.includes('id="pf-fever-bar-fill"'), 'FEVER bar fill exists');
assert.ok(html.includes('class="fever-bar-glint"'), 'FEVER shimmer glint exists');
assert.ok(html.includes('id="pf-fever-bar-flash"'), 'FEVER flash burst overlay exists');

// 2. Verify CSS Styling in index.html
assert.ok(html.includes('.pf-center .fever-gauge'), 'fever-gauge CSS rules exist');
assert.ok(html.includes('.pf-center .fever-bar-frame'), 'fever-bar-frame CSS rules exist');
assert.ok(html.includes('.pf-center .fever-bar-fill'), 'fever-bar-fill CSS rules exist');
assert.ok(html.includes('.pf-center .fever-bar-glint'), 'fever-bar-glint CSS rules exist');
assert.ok(html.includes('.pf-center .fever-gauge.flash'), 'flash animation CSS exists');
assert.ok(html.includes('.pf-center .fever-gauge.active-fever'), 'active-fever CSS exists');

const feverCssBlock = html.slice(html.indexOf('/* FEVER 能量條：青白色像素風'), html.indexOf('@keyframes feverGaugeBurst') + 150);
assert.ok(feverCssBlock.includes('#041019'), 'Dark inner groove background color exists');
assert.ok(feverCssBlock.includes('#a5f3fc'), 'Cyan-white pixel border color exists');
assert.ok(!feverCssBlock.includes('purple') && !feverCssBlock.includes('#800080') && !feverCssBlock.includes('#b98bff'), 'No purple color in fever-gauge styles');

// 3. Test Full Lifecycle of Fever UI Transitions
const functions = html.slice(html.indexOf('function paintFeverFlippers()'), html.indexOf('// 只攔正在下落的球'));

const classesMap = {
    'pf': new Set(),
    'pf-fever': new Set(),
    'pf-fever-gauge': new Set(),
    'pf-fever-bar-fill': new Set(),
    'pf-fever-combo': new Set()
};
const stylesMap = {
    'pf-fever-bar-fill': { width: '' }
};

function getNode(id) {
    if (!classesMap[id]) classesMap[id] = new Set();
    if (!stylesMap[id]) stylesMap[id] = {};
    return {
        id,
        classList: {
            add: (...xs) => xs.forEach(x => classesMap[id].add(x)),
            remove: (...xs) => xs.forEach(x => classesMap[id].delete(x)),
            contains: x => classesMap[id].has(x),
            toggle: (x, val) => val ? classesMap[id].add(x) : classesMap[id].delete(x)
        },
        style: stylesMap[id]
    };
}

let flipperGoldVal = 0;
const energyMember = { ch: { gauge: 50 } };
const ctx = {
    FEVER: { active: false, value: 0, maxValue: 1000, times: 0, left: 0 },
    FEVER_MS: 10000,
    FEVER_BASE: 1000,
    FEVER_STEP: 500,
    FEVER_CAP: 3000,
    feverCombo: 0,
    $: id => getNode(id),
    setFlipperGold: val => { flipperGoldVal = val; },
    spawnFeverPads() {},
    clearFeverPads() {},
    SFX: { feverStart() {} },
    log() {},
    clearPassiveFX() {},
    typeEffects: { active: () => false, feverStartGauge: () => 3 },
    aliveMembers: () => [energyMember],
    queueReadySkill() {}
};
ctx.window = ctx;
ctx.PF = {};

vm.createContext(ctx);
vm.runInContext(functions, ctx);

// Test 0%
ctx.FEVER.value = 0;
ctx.paintFeverFlippers();
assert.equal(stylesMap['pf-fever-bar-fill'].width, '0.0%', '0% UI has 0.0% width');
assert.equal(classesMap['pf-fever-gauge'].has('active-fever'), false, '0% does not have active-fever class');

// Test 25%
ctx.feverAdd(250);
assert.equal(ctx.FEVER.value, 250);
assert.equal(stylesMap['pf-fever-bar-fill'].width, '25.0%', '25% UI has 25.0% width');
assert.equal(ctx.FEVER.active, false, 'FEVER is not active at 25%');

// Test 50%
ctx.feverAdd(250);
assert.equal(ctx.FEVER.value, 500);
assert.equal(stylesMap['pf-fever-bar-fill'].width, '50.0%', '50% UI has 50.0% width');
assert.equal(ctx.FEVER.active, false, 'FEVER is not active at 50%');

// Test 75%
ctx.feverAdd(250);
assert.equal(ctx.FEVER.value, 750);
assert.equal(stylesMap['pf-fever-bar-fill'].width, '75.0%', '75% UI has 75.0% width');
assert.equal(ctx.FEVER.active, false, 'FEVER is not active at 75%');

// Test 100% -> Auto Trigger
ctx.feverAdd(250);
assert.equal(ctx.FEVER.active, true, 'FEVER automatically triggered at 100%');
assert.equal(stylesMap['pf-fever-bar-fill'].width, '100.0%', '100% UI has 100.0% width');
assert.equal(classesMap['pf-fever-gauge'].has('active-fever'), true, 'active-fever class applied');
assert.equal(classesMap['pf-fever-gauge'].has('flash'), true, 'flash class applied for instant flash');
assert.equal(classesMap['pf-fever'].has('on'), true, 'FEVER text has .on class for golden pulse');

// Test Countdown during FEVER
ctx.feverUpdate(3000); // 3 seconds elapsed, 7s left
assert.equal(stylesMap['pf-fever-bar-fill'].width, '70.0%', 'Bar is at 70.0% after 3s');

ctx.feverUpdate(4000); // another 4s elapsed, 3s left
assert.equal(stylesMap['pf-fever-bar-fill'].width, '30.0%', 'Bar is at 30.0% after 7s');

// Test FEVER End and Reset
ctx.feverUpdate(3000); // remaining 3s elapsed, FEVER ends
assert.equal(ctx.FEVER.active, false, 'FEVER ended');
assert.equal(ctx.FEVER.value, 0, 'FEVER value reset to 0');
assert.equal(stylesMap['pf-fever-bar-fill'].width, '0.0%', 'Bar reset to 0.0% width');
assert.equal(classesMap['pf-fever-gauge'].has('active-fever'), false, 'active-fever class removed');
assert.equal(classesMap['pf-fever'].has('on'), false, 'FEVER text .on removed');

// Test Re-accumulation after ending
assert.equal(ctx.FEVER.maxValue, 1500, 'Next FEVER threshold is 1500 (+500)');
ctx.feverAdd(450); // 450 / 1500 = 30%
assert.equal(stylesMap['pf-fever-bar-fill'].width, '30.0%', 'Bar re-accumulates smoothly to 30.0%');

console.log('PASS: All FEVER UI states (0%, 25%, 50%, 75%, 100%), auto-trigger, countdown, reset and re-accumulation verified.');
