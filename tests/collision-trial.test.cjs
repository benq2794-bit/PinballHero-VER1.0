const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'asset/fx/collision-trial.js'), 'utf8');
function setup() {
    const noop = () => {};
    const b = { x: 200, y: 400, r: 20, vx: 0, vy: -500, ball: { classList: { add: noop, remove: noop } } };
    const m = { ch: { gauge: 42 }, body: b, down: false };
    const frame = { style: { display: '' } };
    const ctx = { W: 430, H: 760, PF: { ready: true, running: true, paused: false, foeSeq: 1, members: [m], foe: { x: 200, y: 200, r: 30 }, extraFoes: [], weak: null },
        enemy: { hp: 100 }, $: id => id === 'pf-frame' ? frame : null,
        FX: { sparks: noop }, SFX: { launch: noop }, saveGame: noop, aliveMembers: () => [m], partyMovers: () => [m] };
    vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(root, "asset/enemy-wave.js"), "utf8") + source + ';this.mode=COLLISION_TRIAL;', ctx);
    return { c: ctx, b, m, frame };
}
for (const side of ['l', 'r']) {
    const { c, b } = setup();
    b.r = 24; b.x = side === 'l' ? 15 : 415; b.y = 660; b.vx = side === 'l' ? -800 : 800; b.vy = 30;
    const qx = side === 'l' ? 20 : 410, qy = 650, f = { side, rad: 10 };
    c.stabilizeFlipperExit(b, f, qx, qy, 0, -1, true);
    assert.ok(b.x >= b.r + 13 && b.x <= 430 - b.r - 13);
    assert.ok(b.y < qy && Math.hypot(b.x - qx, b.y - qy) >= b.r + f.rad + 1.99, 'fully outside paddle near wall');
    assert.ok(b.vy <= -680 && b.vy >= -1100);
    assert.ok(side === 'l' ? b.vx > 0 : b.vx < 0, 'launch away from wall');
}
{
    const { c, b } = setup(); b.vx = b.vy = 0;
    c.stabilizeFlipperExit(b, { side: 'l', rad: 10 }, b.x, b.y + 5, 0, -1, false);
    assert.ok(b.vy < 0 && b.vx > 0, 'resting slow ball escapes upward and inward');
}
{
    const { c, b, m } = setup();
    const t = { x: 200, y: 200, r: 30, vx: 0, vy: 0, fixed: true };
    b.x = 200; b.y = 160; b.vy = 500;
    assert.equal(c.collideEnemyTrial(m, t, true, 0).canDamage, true);
    assert.ok(b.vy < 0);
    b.y = 160;
    assert.equal(c.collideEnemyTrial(m, t, true, 500).canDamage, false, 'persistent overlap never farms hits');
    b.y = 145; assert.equal(c.collideEnemyTrial(m, t, true, 600), null);
    b.y = 160; assert.equal(c.collideEnemyTrial(m, t, true, 700).canDamage, true);
    b.y = 145; c.collideEnemyTrial(m, t, true, 710);
    b.y = 160; assert.equal(c.collideEnemyTrial(m, t, true, 720).canDamage, false, 'fast contact jitter has a cooldown');
    b.x = t.x; b.y = t.y; b.vx = b.vy = 0;
    c.collideEnemyTrial(m, t, true, 1000);
    assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y));
    assert.ok(Math.hypot(b.x - t.x, b.y - t.y) >= 50, 'coincident centers separate');
    c.PF.foeSeq++; b.y = t.y - 40;
    assert.equal(c.collideEnemyTrial(m, t, true, 1020).canDamage, true, 'new wave discards old contact state');
}
{
    const normal = setup(), boss = setup();
    const t1 = { x: 200, y: 200, r: 30 }, t2 = { ...t1 };
    normal.b.y = boss.b.y = 160;
    normal.c.collideEnemyTrial(normal.m, t1, false, 0);
    boss.c.collideEnemyTrial(boss.m, t2, true, 0);
    assert.ok(t1.y > 200, 'ordinary enemy yields'); assert.equal(t2.y, 200, 'boss holds position');
}
{
    const { c, b, m, frame } = setup();
    c.PF.weak = { nodes: [{ x: 300, y: 300, hit: false }] };
    b.vy = 200;
    assert.equal(c.triggerAirDash(), true); assert.ok(b.vx > 0 && b.vy < 0, 'dash aims at nearby weak point');
    assert.ok(Math.abs(Math.hypot(b.vx, b.vy) - 1050) < .001);
    assert.equal(m.ch.gauge, 42, 'dash does not spend/refund skill energy');
    assert.equal(c.triggerAirDash(), false);
    c.PF.paused = true; c.updateCollisionTrial(5000); assert.equal(c.mode.dashLeft, 1200);
    c.PF.paused = false; c.updateCollisionTrial(1200); assert.equal(c.mode.dashLeft, 0); assert.equal(b.dashActiveMs, 0);
    b.y = 700; assert.equal(c.triggerAirDash(), false); assert.equal(c.mode.dashLeft, 0, 'failed dash does not spend cooldown');
    b.y = 400; frame.style.display = 'none'; assert.equal(c.triggerAirDash(), false);
    frame.style.display = ''; c.mode.enabled = false; assert.equal(c.triggerAirDash(), false);
}
{
    const { c, b } = setup();
    b.vy = 200;
    c.updateCollisionTrial(16);
    assert.equal(c.mode.dashLeft, 1200, 'falling ball automatically dashes without input');
    assert.ok(b.vy < 0);
    c.updateCollisionTrial(100);
    assert.equal(c.mode.dashLeft, 1100, 'cannot retrigger during cooldown');
}
{
    const { c, b } = setup();
    c.updateCollisionTrial(16);
    assert.equal(c.mode.dashLeft, 0, 'already on course: no wasted dash');
    b.vy = 200; b.powerFlip = {};
    c.updateCollisionTrial(16);
    assert.equal(c.mode.dashLeft, 0, 'does not interrupt a charged power flip');
    b.powerFlip = null; b.exitLockMs = 100;
    c.updateCollisionTrial(16);
    assert.equal(c.mode.dashLeft, 0, 'does not interrupt a fresh flipper launch');
    b.exitLockMs = 0; c.PF.foe.y = 500;
    c.updateCollisionTrial(16);
    assert.equal(c.mode.dashLeft, 0, 'does not automatically dash downward');
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
new Function(source);
for (const block of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new Function(block[1]);
assert.match(html, /if \(!COLLISION_TRIAL.enabled \|\| n.canDamage\) \{/);
assert.match(html, /if \(!COLLISION_TRIAL.enabled \|\| contact.canDamage\) hitFoe/);
assert.match(html, /updateCollisionTrial\(dt \* 1000\)/);
assert.ok(!html.includes('pp-collision-trial') && !html.includes('toggleCollisionTrial'), 'no manual collision/auto-dash switch');
assert.ok(!html.includes('p.collisionTrialOn'), 'old disabled preference cannot turn off automatic dash');
assert.ok(!html.includes('btn-air-dash') && !html.includes('e.code === "KeyD"'), 'manual dash button and shortcut removed');
console.log('PASS: mirrored paddle/wall exit, resting escape, bounce, contact debouncing, re-entry, zero distance, wave reset, boss stability, dash aim/speed/cooldown/pause/airborne guard, skill independence and syntax.');
