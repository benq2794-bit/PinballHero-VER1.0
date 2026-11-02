const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const start = html.indexOf('function syncBossHpPlacement()');
const end = html.indexOf('\nfunction render()', start);
assert.ok(start >= 0 && end > start, 'boss HP placement function is present');

function node() {
    const value = { style: {}, classes: new Set(), parentElement: null,
        classList: { toggle(name, on) { on ? this.owner.classes.add(name) : this.owner.classes.delete(name); }, contains(name) { return this.owner.classes.has(name); } },
        appendChild(child) { child.parentElement = this; }, insertBefore(child) { child.parentElement = this; },
        querySelector() { return null; } };
    value.classList.owner = value;
    return value;
}
const bar = node();
const weak = node(), field = node(), hud = node(), gauge = node(), result = node(), fail = node();
bar.parentElement = hud; weak.parentElement = hud;
const elements = { 'foe-bar': bar, 'pf-field': field, 'weak-bar': weak, 'boss-down-gauge': gauge,
    'pf-result': result, 'deep-fail': fail };
const ctx = {
    $: id => elements[id], document: { querySelector: () => hud }, enemy: { boss: false },
    PF: { foe: { x: 210, y: 160, r: 40 } }, W: 430,
    clamp: (value, min, max) => Math.max(min, Math.min(max, value))
};
vm.createContext(ctx);
vm.runInContext(html.slice(start, end), ctx);
ctx.syncBossHpPlacement();
assert.equal(bar.style.display, 'none', 'regular wave progress HUD stays hidden');
assert.equal(bar.parentElement, hud, 'hidden wave HUD remains in its normal DOM position');

ctx.enemy = { boss: true, battleSkinAlpha: false };
ctx.syncBossHpPlacement();
assert.equal(bar.style.display, '', 'boss HP HUD remains visible');
assert.equal(bar.parentElement, field, 'boss HP HUD is positioned in the battle field');
assert.ok(bar.classes.has('boss-hp-ui'));
console.log('PASS: normal wave HUD hidden while the boss HP HUD remains visible and follows its boss layer.');
