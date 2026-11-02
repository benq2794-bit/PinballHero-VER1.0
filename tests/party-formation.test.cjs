const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const formation = fs.readFileSync(path.join(root, 'asset/party-formation.js'), 'utf8');
const collisions = fs.readFileSync(path.join(root, 'asset/fx/collision-trial.js'), 'utf8');
function body(x = 200, y = 500) {
    const classes = new Set();
    return { x, y, r: 21, vx: 0, vy: -600, spin: 0, ball: { classList: {
        add: k => classes.add(k), remove: k => classes.delete(k),
        toggle: (k, value) => value ? classes.add(k) : classes.delete(k), contains: k => classes.has(k)
    } } };
}
function setup(count = 3) {
    const members = Array.from({ length: count }, (_, i) => ({ ch: { id: String(i), hp: 100, gauge: 25 + i }, body: body(100 + i * 70, 500), down: false }));
    const strikes = [];
    const ctx = { W: 430, H: 760, teamIds: members.map(m => m.ch.id),
        PF: { members, foeSeq: 1, running: true, ready: true, paused: false, foe: { x: 200, y: 200, r: 30 }, extraFoes: [], weak: null }, enemy: { hp: 100 },
        enforceBattleCeiling: b => { b.y = Math.max(176 + b.r + 12, b.y); },
        clearPowerFlip: b => { b.powerFlip = null; }, aliveMembers: () => ctx.PF.members.filter(m => !m.down && m.body), hpMax: () => 100,
        memberStrike: (m, damage) => { strikes.push(m.ch.id); m.ch.hp -= damage; if (m.ch.hp <= 0) { m.down = true; m.body = null; } },
        attachBall: m => { m.body = body(); }, $: () => ({ style: { display: '' } }),
        FX: { sparks() {} }, SFX: { launch() {} } };
    ctx.enforceHeroBattleCeiling = ctx.enforceBattleCeiling;
    vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(root, "asset/enemy-wave.js"), "utf8") + formation + collisions + ';this.formation=PARTY_FORMATION;this.dash=COLLISION_TRIAL;', ctx);
    return { c: ctx, members, strikes };
}
{
    const { c, members } = setup(); const head = members[0].body;
    c.syncPartyFormation(); assert.equal(c.partyMovers().length, 1); assert.equal(c.partyPilot(), members[0]);
    for (let y = 500; y >= 300; y -= 10) { head.y = y; c.syncPartyFormation(); }
    assert.equal(members[1].body.y, 342); assert.equal(members[2].body.y, 384);
    assert.equal(members[1].body.vy, head.vy); assert.equal(members[1].ch.gauge, 26, 'own energy retained');
    head.vx = 600; head.vy = 0;
    for (let x = 100; x <= 300; x += 10) { head.x = x; c.syncPartyFormation(); }
    assert.equal(members[1].body.x, 258); assert.equal(members[2].body.x, 216, 'follow curved history by path distance');
    assert.equal(c.partyMotionBody(members[2]), head, 'member movement skills steer the pilot');
    head.x = 15; head.y = 190; c.syncPartyFormation();
    for (const m of members.slice(1)) { assert.ok(m.body.x >= m.body.r + 13); assert.ok(m.body.y >= 176 + m.body.r + 12); }
    assert.ok(c.formation.points.length <= 128);
}
{
    const { c, members } = setup();
    c.syncPartyFormation(); members[0].down = true; members[0].body = null;
    c.syncPartyFormation(); assert.equal(c.partyPilot(), members[1]); assert.equal(members[1].body.partyFollower, false);
    members[0].down = false; members[0].body = body(); c.syncPartyFormation();
    assert.equal(c.partyPilot(), members[0]); assert.equal(members[1].body.partyFollower, true);
    c.teamIds = ['2', '1', '0']; c.syncPartyFormation(); assert.equal(c.partyPilot(), members[2], 'captain swap');
    members.forEach(m => { m.down = true; m.body = null; }); c.syncPartyFormation(); assert.equal(c.partyPilot(), null); assert.equal(c.formation.points.length, 0);
}
{
    const { c, members } = setup(); c.syncPartyFormation();
    const follower = members[1], b = follower.body, t = { x: b.x, y: b.y - 20, r: 30, vx: 0, vy: 0 };
    const before = [b.x, b.y, b.vx, b.vy, t.x, t.y];
    assert.equal(c.collideEnemyTrial(follower, t, false, 0).canDamage, true);
    assert.deepEqual([b.x, b.y, b.vx, b.vy, t.x, t.y], before, 'follower hit sensor cannot push the party apart');
    assert.equal(c.collideEnemyTrial(follower, t, false, 500).canDamage, false, 'no repeated damage from lingering overlap');
}
{
    const { c, members } = setup(); c.syncPartyFormation();
    members[0].body.vy = 200; members[0].body.x = 200;
    c.updateCollisionTrial(16); c.syncPartyFormation();
    assert.equal(c.dash.dashLeft, 1200);
    for (const m of members) assert.equal(m.body.vy, members[0].body.vy, 'auto dash moves the party together');
}
{
    const { c, members, strikes } = setup(); c.syncPartyFormation(); members[0].body.y = 900;
    c.checkPartyOutOfBounds(); assert.equal(strikes.length, 3); assert.ok(members.every(m => m.ch.hp === 94));
    assert.equal(c.partyMovers().length, 1); c.checkPartyOutOfBounds(); assert.equal(strikes.length, 3, 'one penalty per fall');
}
{
    const { c } = setup(1); c.syncPartyFormation(); assert.equal(c.partyMovers().length, 1);
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const step = html.slice(html.indexOf('function step('), html.indexOf('// ±40'));
assert.ok(!step.includes('circleCollide(alive[i].body'), 'no ally-to-ally collision');
assert.match(step, /for \(const m of movers\) if \(resolveFlipperCollision/);
assert.match(step, /checkPartyOutOfBounds\(\)/);
new Function(formation); new Function(collisions);
console.log('PASS: one physical pilot, path following, corners/bounds, independent energy, leader death/revival/swap, follower hit sensors, group dash, group fall and solo mode.');
