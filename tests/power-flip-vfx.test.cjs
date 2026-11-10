const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

let scheduledFrame = null, drawCalls = 0;
const gradient = { addColorStop() {} };
const context = new Proxy({
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    drawImage: () => { drawCalls++; }
}, {
    get(target, key) {
        if (key in target) return target[key];
        return () => {};
    },
    set(target, key, value) { target[key] = value; return true; }
});
const canvas = {
    className: '',
    style: { cssText: '' },
    isConnected: false,
    setAttribute() {},
    getContext: () => context,
    remove() { this.isConnected = false; }
};
const container = { appendChild(node) { node.isConnected = true; } };
const window = { devicePixelRatio: 1 };
const document = {
    createElement: () => canvas,
    getElementById: id => id === 'pf-vfx' ? container : null
};
class FakeImage {
    constructor() { this.complete = true; this.naturalWidth = 3072; this.width = 3072; this.height = 1152; }
    set src(value) { this._src = value; }
}
const contextObject = {
    window, document, Image: FakeImage,
    GAME_DATA: null,
    performance: { now: () => 0 },
    requestAnimationFrame: callback => { scheduledFrame = callback; return 1; },
    cancelAnimationFrame: () => { scheduledFrame = null; },
    console
};
window.GAME_DATA = null;
vm.createContext(contextObject);
vm.runInContext(fs.readFileSync(path.join(root, 'asset/game-data.js'), 'utf8'), contextObject);
vm.runInContext(fs.readFileSync(path.join(root, 'asset/fx/power-flip-vfx.js'), 'utf8'), contextObject);

const renderer = window.PowerFlipVFX;
const classes = ['knight', 'fighter', 'ranger', 'special', 'supporter'];
assert.deepEqual(Object.keys(renderer.catalog), classes);
for (const type of classes) assert.equal(renderer.catalog[type].length, 3, `${type} has PF1-PF3`);

for (const type of classes) {
    for (const level of [1, 2, 3]) {
        assert.equal(renderer.play(type, 210, 300, .35, level), true, `${type} PF${level} is renderable`);
    }
}
assert.equal(renderer.activeCount(), 15);
assert.ok(scheduledFrame, 'one shared animation frame services all 15 variants');
scheduledFrame(1000);
assert.ok(drawCalls > 0, 'embedded sprite atlases are drawn through the live canvas layer');
assert.equal(renderer.activeCount(), 15);
scheduledFrame(1300);
assert.equal(renderer.activeCount(), 15, 'swordsman fade tails and fighter combo wind-down remain visible through their preview timelines');
scheduledFrame(5000);
assert.equal(renderer.activeCount(), 0, 'completed effects are removed');
assert.equal(canvas.isConnected, false, 'the temporary overlay canvas is removed after its last effect');

const source = fs.readFileSync(path.join(root, 'asset/fx/power-flip-vfx.js'), 'utf8');
assert.match(source, /fx\.level === 3 && t < 1\.35/);
assert.match(source, /active && fx\.level === 3/);
const combat = fs.readFileSync(path.join(root, 'asset/fx/power-flip.js'), 'utf8');
assert.match(combat, /showPowerFlipVFX\('fighter', target\.x, target\.y, angle, state\.lv\)/);
assert.match(combat, /showPowerFlipVFX\('supporter', b\.x, b\.y, 0, state\.lv\)/);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.match(html, /asset\/fx\/power-flip-vfx\.js/);
assert.match(html, /return window\.PowerFlipVFX\.play/);
assert.doesNotMatch(html, /const PF_FX =/);
const liveRenderer = html.match(/function showPowerFlipVFX\([\s\S]*?\n\}/)?.[0] || '';
assert.doesNotMatch(liveRenderer, /background-image|\.animate\(/);

console.log('PASS: all 15 class-level variants render, atlas effects draw, PF3-only supporter seal/leaves stay gated, and the canvas cleans up.');
