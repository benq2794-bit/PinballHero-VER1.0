const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'asset/fx/power-flip.js'), 'utf8');

function setup(type, combo = 39) {
    const noop = () => {};
    const ball = { classList: { add: noop, remove: noop }, style: { setProperty: noop } };
    const body = { x: 210, y: 500, vx: 0, vy: -600, r: 20, ball };
    const ch = { id: 'leader', hp: 100, gauge: 42 };
    const member = { ch, body, down: false };
    const foe = { x: 210, y: 200, r: 30 };
    const hits = [];
    const ctx = { combo, comboAt: 1, teamIds: ['leader'], roster: { leader: ch },
        CHAR_TABLE: { leader: { type, element: 'fire' } }, ELEMENTS: { fire: { color: '#f00' } },
        PF: { running: true, paused: false, ready: true, members: [member], foe, extraFoes: [], foeSeq: 1 },
        enemy: { hp: 10000 }, CRIT_DMG: 1.5, rollCrit: () => false, atkOf: () => 100, talentRank: () => 0,
        deepElementMultiplier: () => 1, checkKill: noop, updateUI: noop, saveGame: noop,
        $: () => null, aliveMembers: () => [member], addCd: (m, n) => { m.ch.gauge += n; },
        FX: Object.fromEntries(['pop', 'art', 'bloom', 'laser'].map(k => [k, noop])),
        SFX: Object.fromEntries(['impact', 'critical', 'hit', 'powerFlip'].map(k => [k, noop])) };
    ctx.applyDamage = (who, damage, opt) => { hits.push({ who, damage, target: opt.target }); ctx.enemy.hp -= damage; ctx.combo += opt.combo || 0; };
    ctx.flipLevel = () => [9, 15, 39].filter(n => ctx.combo >= n).length;
    ctx.window = ctx; ctx.mainAccountJob = 'warrior';
    ctx.performance = { now: () => 0 }; ctx.elementMultiplier = () => 1;
    ctx.mainAccountBonus = () => ({ powerFlipDamage: 0 });
    ctx.showPowerFlipVFX = noop; ctx.showPassiveFX = noop;
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(root, 'asset/job-effects.js'), 'utf8'), ctx);
    ctx.jobEffects = ctx.JobEffects.create({ getJob: () => ctx.mainAccountJob, isActive: () => false,
        getStat: () => 1, getTalent: () => 0, isFever: () => false });
    vm.runInContext(fs.readFileSync(path.join(root, "asset/enemy-wave.js"), "utf8") + source + ';this.mode=POWER_FLIP;', ctx);
    return { ctx, member, body, hits };
}

for (const type of ['knight', 'fighter', 'ranger', 'special', 'supporter']) {
    for (const [combo, level] of [[9, 1], [15, 2], [39, 3]]) {
        const { ctx: c, member: m, body: b, hits } = setup(type, combo);
        c.launchPowerFlip(b);
        assert.equal(b.powerFlip.lv, level);
        assert.equal(c.combo, 0, 'combo consumed on launch');
        assert.equal(m.ch.gauge, 42, 'PF never consumes skill energy');
        if (type === 'knight') b.y = 230;
        if (type === 'fighter' || type === 'special') c.powerFlipContact(m, c.PF.foe);
        for (let i = 0; i < 30; i++) c.updatePowerFlip(70);
        if (type === 'supporter') {
            assert.equal(hits.length, 0);
            assert.equal(c.mode.buffPct, [0, .1, .15, .2][level]);
            assert.equal(m.ch.gauge, 42 + [0, 3, 5, 7][level]);
        } else {
            assert.ok(hits.length > 0, type + ' deals PF damage');
            assert.equal(m.ch.gauge, 42, 'damage does not refund skill energy');
            if (type === 'ranger' || type === 'special') assert.equal(hits.length, 1);
            else assert.equal(hits.length, 2 + level, 'bounded attack count');
        }
        assert.equal(b.powerFlip, null, 'charge clears after use/expiry');
    }
}

{
    const { ctx: c, body: b, hits } = setup('ranger', 8);
    c.launchPowerFlip(b); assert.equal(b.powerFlip, undefined); assert.equal(c.combo, 8);
    c.combo = 39; b.vy = 30; c.launchPowerFlip(b); assert.equal(c.combo, 39);
    b.vy = -600; c.launchPowerFlip(b); c.combo = 39;
    const first = b.powerFlip; c.launchPowerFlip(b); assert.equal(b.powerFlip, first); assert.equal(c.combo, 39);
    c.PF.paused = true; c.updatePowerFlip(5000); assert.equal(b.powerFlip.left, 1800); assert.equal(hits.length, 0);
    c.PF.paused = false; c.PF.foeSeq++; c.updatePowerFlip(16); assert.equal(hits.length, 0); assert.equal(b.powerFlip, null);
}
{
    const { ctx: c, body: b, hits } = setup('ranger');
    c.PF.foe.x = 20; c.launchPowerFlip(b); c.updatePowerFlip(16);
    assert.equal(hits.length, 1, 'beam aims at the nearest living target');
}
{
    const { ctx: c, body: b, hits } = setup('special');
    c.launchPowerFlip(b); c.updatePowerFlip(1801);
    assert.equal(hits.length, 0, 'no free damage if charge misses');
    c.mode.enabled = false; c.combo = 39;
    c.launchPowerFlip(b); assert.equal(c.combo, 39); assert.equal(b.powerFlip, null);
}
{
    const { ctx: c, body: b, hits } = setup('ranger');
    c.PF.extraFoes = [{ ...c.PF.foe, foeSeq: 1 }, { ...c.PF.foe, foeSeq: 1 }];
    c.launchPowerFlip(b); c.updatePowerFlip(16);
    assert.equal(hits.length, 3, 'beam hits each independently living enemy once');
}
{
    const { ctx: c, body: b, hits } = setup('ranger');
    c.talentRank = (ch, key) => key === 'pf' ? 3 : 0;
    c.launchPowerFlip(b); c.updatePowerFlip(16);
    assert.equal(hits[0].damage, Math.round(100 * 4.6 * 1.24), 'PF talent improves actual damage');
    const support = setup('supporter'); support.ctx.talentRank = () => 3;
    support.ctx.launchPowerFlip(support.body); support.ctx.updatePowerFlip(16);
    assert.equal(support.ctx.mode.buffPct, .20 * 1.24, 'PF talent improves support buff');
}
for (const file of ['asset/fx/power-flip.js', 'asset/fx/skill-signatures.js']) new Function(fs.readFileSync(path.join(root, file), 'utf8'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const block of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new Function(block[1]);
assert.match(html, /if \(swingingUp\)[\s\S]*launchPowerFlip\(b\)/);
assert.match(html, /powerFlipContact\(m, target\)/);
assert.match(html, /updatePowerFlip\(dt \* 1000\)/);
assert.match(html, /POWER_FLIP.enabled \? POWER_FLIP\.buffPct : 0/);
assert.ok(!html.includes('pp-power-flip') && !html.includes('togglePowerFlip'), 'no manual PF switch');
assert.ok(!html.includes('p.powerFlipOn'), 'old disabled preference cannot turn off automatic PF');
console.log('PASS: 5 classes × 3 levels; launch threshold, direction, cooldown, aim, pause, expiry, wave changes, independent targets, legacy mode, skill independence and syntax.');
