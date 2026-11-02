const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const ctx = { window: {} };
vm.createContext(ctx);
for (const file of ['asset/game-data.js', 'asset/skill-system.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx);
}
const { SkillSystem, GAME_DATA } = ctx.window;
function setup() {
    const member = { ch: { baseAtk: 100, hp: 100 }, body: { x: 200, y: 400 } };
    const ally = { ch: { hp: 100 }, body: { x: 150, y: 350 } };
    const down = { ch: { hp: 0 }, body: {}, down: true };
    const state = { members: [member, ally, down], foe: { x: 200, y: 200 } };
    const enemy = { hp: 1000 }, hits = [], repeats = [], cooldowns = [], heals = [];
    let dashes = 0;
    const runtime = SkillSystem.createRuntime({
        skillHit: (m, mult, opt) => hits.push({ m, mult, opt }),
        dashTo: () => dashes++,
        repeat: (m, seq, n, gap, fn) => repeats.push({ n, gap, fn }),
        talentRank: () => 2,
        applyHeal: (m, pct) => { heals.push({ m, pct }); return true; },
        cutCd: (m, n) => cooldowns.push({ m, n }),
        aliveMembers: () => [member, ally], getEnemy: () => enemy, getPartyState: () => state,
        pop: () => {}, now: () => 1000
    });
    return { runtime, member, ally, state, enemy, hits, repeats, cooldowns, heals, dashes: () => dashes };
}
for (const [role, expected] of [['knight', [2.2, 1]], ['fighter', [.8, .8, .8, .8]], ['ranger', [1.9, .75, .75]], ['special', [2.8]]]) {
    const t = setup();
    t.runtime.byRole[role](t.member, 7);
    for (const r of t.repeats) for (let i = 1; i < r.n; i++) r.fn(i);
    assert.deepEqual(t.hits.map(h => h.mult), expected, role + ' keeps its hit budget');
    if (role === 'knight') assert.equal(t.dashes(), 1);
    if (role === 'ranger') {
        assert.equal(t.hits[0].opt.beam.length, 640);
        assert.equal(t.hits[0].opt.beam.angle, -Math.PI / 2);
    }
    if (role === 'special') assert.equal(t.cooldowns[0].m, t.ally);
}
{
    const t = setup();
    t.runtime.byRole.supporter(t.member);
    assert.equal(t.hits.length, 0);
    assert.equal(t.heals.length, 2, 'downed members are not healed');
    assert.equal(t.heals[0].pct, .10400000000000001);
    assert.equal(t.state.buff.atk, 30);
    assert.equal(t.state.buff.until, 7000);
    assert.deepEqual(t.cooldowns, [{ m: t.ally, n: 3 }]);
}
{
    const t = setup();
    t.runtime.byUnit.alchemist(t.member, 7);
    t.repeats[0].fn(1);
    assert.deepEqual(t.hits.map(h => h.mult), [1.5, 1.3]);
    assert.equal(t.repeats[0].gap, 260);
    const catalog = SkillSystem.buildCatalog({
        characters: { alchemist: { type: 'special', element: 'fire' }, hero: { type: 'knight', element: 'water' } },
        signatures: { hero: { name: '專屬名稱' } }, config: GAME_DATA.skills,
        elements: { fire: { label: '火' }, water: { label: '水' } }, runtime: t.runtime
    });
    assert.equal(catalog.alchemist.cast, t.runtime.byUnit.alchemist);
    assert.equal(catalog.hero.cast, t.runtime.byRole.knight);
    assert.equal(catalog.hero.name, '專屬名稱');
    assert.equal(catalog.alchemist.desc, GAME_DATA.skills.unitDesc.alchemist);
}
console.log('PASS: five skill roles, delayed hit budgets, healing, recharge, beam direction and per-character overrides.');
