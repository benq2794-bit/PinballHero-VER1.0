const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'asset/fx/battle-bounds.js'), 'utf8');
let field = { top: 100, width: 860 }, hud = { bottom: 340, height: 200 }, combo = { bottom: 440, height: 60 };
const ctx = { PF: { el: { offsetWidth: 430, getBoundingClientRect: () => field, querySelector: () => ({ getBoundingClientRect: () => hud }) } },
    $: () => ({ getBoundingClientRect: () => combo }), PHYS: { wallRest: .66 } };
vm.createContext(ctx); vm.runInContext(code + ';this.bounds=BATTLE_BOUNDS;', ctx);
ctx.refreshBattleBounds(); assert.equal(ctx.bounds.top, 178, 'HUD bounds converted from 2x zoom');
field = { top: 10, width: 215 }; hud = { bottom: 115, height: 70 }; combo = { bottom: 90, height: 20 };
ctx.refreshBattleBounds(); assert.equal(ctx.bounds.top, 218, 'small screens and expanded HUD');
field.width = 0; ctx.refreshBattleBounds(); assert.equal(ctx.bounds.top, 218, 'hidden scene retains valid boundary');
for (const [r, flags] of [[21, []], [24, []], [26, []], [34, []], [44, ['boss']], [44, ['boss', 'frames']], [44, ['boss', 'alpha-art']]]) {
    const b = { x: 210, y: 0, r, vx: 100, vy: -1000, ky: -200, ball: { classList: { contains: x => flags.includes(x) } } };
    ctx.enforceBattleCeiling(b);
    assert.ok(b.y - r - 12 >= ctx.bounds.top, 'sprite and HP bar stay below protected strip');
    if (flags.includes('frames')) assert.ok(b.y - r - 26 >= ctx.bounds.top, 'oversized artwork clearance');
    if (flags.includes('alpha-art')) assert.ok(b.y - r * 3.2 >= ctx.bounds.top, 'full-height dragon art and lifted HP bar clearance');
    assert.equal(b.vy, 660); assert.equal(b.ky, 0); assert.equal(b.vx, 100);
    const y = b.y; ctx.enforceBattleCeiling(b); assert.equal(b.y, y); assert.equal(b.vy, 660, 'no repeated bounce');
    b.y = y + 80; b.vy = -300; ctx.enforceBattleCeiling(b); assert.equal(b.vy, -300, 'free movement within arena');
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const b of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new Function(b[1]);
assert.match(html, /rowTop = Math.max\(250/);
assert.match(html, /e.y = e.homeY/);
assert.ok(!html.includes('mk.body.homeY = 200'));
console.log('PASS: responsive HUD/combo boundary, hidden scene, all unit sizes, health bars, oversized bosses, upward bounce, safe movement and lower spawn/reset positions.');
