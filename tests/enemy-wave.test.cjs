const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.resolve(__dirname, '..'), html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const source = fs.readFileSync(path.join(root, 'asset/enemy-wave.js'), 'utf8');
function setup(count = 3, budget = 90) {
    const units = Array.from({ length: count }, (_, i) => ({ x: [100, 160, 340][i] || 400, y: 200, r: 20,
        fixed: i > 0, node: { remove() { this.removed = true; } }, fighter: { timer: null, fx: {} } }));
    let rewards = 0;
    const noop = () => {};
    const ctx = { bossEntranceFreezesBattle: () => false, PF: { foe: units[0], extraFoes: units.slice(1), enemyUnits: [], foeSeq: 1, waveResolvedSeq: -1,
        breakUntil: 0, weak: null, burns: [], burn: null }, enemy: { hp: budget, maxHp: budget, boss: count === 1 },
        enemyF: units[0].fighter, clearTimeout: noop, dmgTotal: 0, DMG_SCALE: 1, BREAK_TAKEN: 1.8,
        performance: { now: () => 1000 }, deepPerk: () => 0, shieldOf: () => null,
        FX: Object.fromEntries(['pop', 'hit', 'bloom', 'sparks', 'flash', 'shake'].map(k => [k, noop])),
        CHAR_TABLE: { hero: { element: 'fire' } }, ELEMENTS: { fire: { color: '#f00' } },
        fmt: String, playFighter: noop, bumpCombo: noop, breakOneWeak: noop,
        killFoe: () => rewards++, deepElementMultiplier: () => 1, rollCrit: () => false,
        talentRank: () => 0, atkOf: () => 10, CRIT_DMG: 1.5, SFX: { critical: noop }, applyElemStatus: noop };
    vm.createContext(ctx); vm.runInContext(source, ctx); ctx.initializeEnemyWave();
    const damageCode = html.slice(html.indexOf('function applyDamage('), html.indexOf('// 暴擊率＝'));
    const skillCode = html.slice(html.indexOf('function skillHit('), html.indexOf('// 多段技：'));
    vm.runInContext(damageCode + skillCode, ctx);
    return { c: ctx, units, rewards: () => rewards };
}
for (const n of [1, 3, 4, 5, 6]) {
    const { c, units } = setup(n, 47);
    assert.equal(units.reduce((sum, u) => sum + u.hp, 0), 47);
    assert.equal(c.enemy.hp, 47); assert.equal(c.enemy.maxHp, 47);
    assert.equal(c.liveEnemies().length, n);
}
{
    const { c, units: [a, b, d], rewards } = setup();
    const hero = { id: 'hero' };
    assert.equal(c.applyDamage(hero, 10, { target: b }), 10);
    assert.deepEqual([a.hp, b.hp, d.hp], [30, 20, 30]); assert.equal(c.enemy.hp, 80);
    assert.equal(c.applyDamage(hero, 999, { target: a }), 30);
    assert.deepEqual([a.hp, b.hp, d.hp], [0, 20, 30]); assert.equal(c.enemy.hp, 50);
    assert.equal(a.node.removed, true); assert.equal(c.PF.foe, b); assert.equal(c.PF.foeSeq, 1);
    assert.equal(c.PF.extraFoes.length, 1); assert.equal(b.fixed, false);
    assert.equal(c.checkKill(), false); assert.equal(rewards(), 0, 'one death never clears wave');
    assert.equal(c.applyDamage(hero, 999, { target: a }), 0); assert.equal(c.enemy.hp, 50, 'overkill cannot spill to another unit');
    c.applyDamage(hero, 20, { target: b }); assert.equal(c.checkKill(), false); assert.equal(c.PF.foe, d);
    c.applyDamage(hero, 30, { target: d }); assert.equal(c.checkKill(), true); assert.equal(rewards(), 1);
    c.checkKill(); assert.equal(rewards(), 1, 'wave rewards issued once'); assert.equal(c.dmgTotal, 90, 'only actual HP loss counted');
    c.PF.foeSeq++; assert.equal(c.applyDamage(hero, 10, { target: b }), 0, 'old wave cannot take damage');
}
{
    const { c, units: [a, b, d] } = setup();
    const member = { ch: { id: 'hero' }, down: false };
    assert.equal(c.enemyTargetsOnRay(0, 200, 0, 240, 1).length, 2);
    c.skillHit(member, 1, { target: a, areaRadius: 60 });
    assert.deepEqual([a.hp, b.hp, d.hp], [20, 20, 30], 'AoE only affects units in range');
    c.skillHit(member, 1, { beam: { x: 0, y: 200, angle: 0, length: 240, width: 1 } });
    assert.deepEqual([a.hp, b.hp, d.hp], [10, 10, 30], 'beam affects each intersected unit once');
    c.skillHit(member, 1, { target: b, dot: true }); assert.deepEqual([a.hp, b.hp, d.hp], [10, 0, 30]);
    c.skillHit(member, 1, { target: b, dot: true }); assert.deepEqual([a.hp, b.hp, d.hp], [10, 0, 30], 'DOT cannot retarget after its victim dies');
}
{
    const { c, units: [a, b] } = setup();
    Object.assign(c, { BURN_TICKS: 5, BURN_GAP: 400, BURN_MULT: .3 });
    vm.runInContext(html.slice(html.indexOf('function applyElemStatus('), html.indexOf('// ===== 傷害模型：')), c);
    const m = { ch: { id: 'hero' } };
    c.applyElemStatus(m, a); c.applyElemStatus(m, b);
    assert.equal(c.PF.burns.length, 2); assert.equal(c.PF.burns[0].target, a); assert.equal(c.PF.burns[1].target, b);
    c.applyElemStatus(m, a); assert.equal(c.PF.burns.length, 2, 'refresh does not duplicate DOT on one victim');
}
{
    const { c, units: [boss], rewards } = setup(1, 200);
    c.applyDamage({ id: 'hero' }, 50); assert.equal(boss.hp, 150); assert.equal(c.enemy.hp, 150);
    c.applyDamage({ id: 'hero' }, 150); c.checkKill(); c.checkKill(); assert.equal(rewards(), 1);
}
new Function(source);
for (const b of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new Function(b[1]);
assert.match(html, /setHpBar\(g, g.hp \/ g.maxHp\)/);
assert.match(html, /liveEnemies\(\).length/);
console.log('PASS: independent HP, wave budget, targeted damage, no overkill spill, dead removal, live promotion, clear-all/reward-once, AoE/ray/DOT targeting, per-victim burns, boss compatibility and HP UI.');
