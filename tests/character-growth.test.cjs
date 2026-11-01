const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'asset/character-growth.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const noop = () => {};
const ctx = { bossEntranceFreezesBattle: () => false, roster: {}, shardTotal: 1000, hmToast: noop, log: noop, charName: id => id,
    rankLv: 100,
    $: () => null, renderPage: noop, updateUI: noop, saveGame: noop, atkOf: ch => ch.baseAtk,
    hpMax: ch => Math.round(ch.maxHp * (1 + .04 * (ch.talents?.survival || 0))),
    CHAR_TABLE: { hero: { name: '測試角色' } }, homeTabOn: 'chars', pickerFor: null };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'asset/enemy-wave.js'), 'utf8'), ctx);
vm.runInContext(src + ';this.setGrowthView=id=>{growthFor=id;};', ctx);
function make(overrides = {}) {
    return { id: 'hero', unlocked: true, lvl: 1, exp: 0, nextExp: 100, baseAtk: 12, maxHp: 150, hp: 150,
        shards: 0, growthVersion: 1, legacyCap: 30, breakthrough: 0, talents: { skill: 0, pf: 0, survival: 0 }, ...overrides };
}
{
    const ch = make(); ctx.roster.hero = ch;
    assert.equal(ctx.gainGrowthExp(ch, 100), 1); assert.equal(ch.lvl, 2); assert.equal(ch.baseAtk, 15); assert.equal(ch.maxHp, 170);
    ctx.gainGrowthExp(ch, 1e8); assert.equal(ch.lvl, 80); assert.equal(ch.exp, ch.nextExp);
    assert.equal(ctx.gainGrowthExp(ch, 1000), 0);
    ctx.breakthroughChar('hero'); assert.equal(ctx.growthCap(ch), 80, 'cannot buy without fragments');
    ch.shards = 20; ctx.breakthroughChar('hero');
    assert.equal(ch.shards, 0); assert.equal(ctx.growthCap(ch), 85); assert.equal(ch.lvl, 81, 'banked XP used after breakthrough');
    ch.shards = 1000;
    while (ctx.growthCap(ch) < 100) ctx.breakthroughChar('hero');
    ctx.gainGrowthExp(ch, 1e10); assert.equal(ch.lvl, 100);
    const shards = ch.shards; ctx.breakthroughChar('hero'); assert.equal(ch.shards, shards, 'no spending past max');
}
{
    const ch = make({ shards: 1000 }); ctx.roster.hero = ch;
    ctx.rankLv = 39; ctx.breakthroughChar('hero'); assert.equal(ctx.growthCap(ch), 80, 'RANK 39 cannot open the first stage');
    ctx.rankLv = 40; ctx.breakthroughChar('hero'); assert.equal(ctx.growthCap(ch), 85); assert.equal(ch.shards, 980);
    ctx.rankLv = 59; ctx.breakthroughChar('hero'); assert.equal(ctx.growthCap(ch), 85, 'second stage needs RANK 60');
    ctx.rankLv = 60; ctx.breakthroughChar('hero'); assert.equal(ctx.growthCap(ch), 90); assert.equal(ch.shards, 950);
    ctx.rankLv = 79; ctx.breakthroughChar('hero'); assert.equal(ctx.growthCap(ch), 90, 'third stage needs RANK 80');
    ctx.rankLv = 100; ctx.breakthroughChar('hero'); ctx.breakthroughChar('hero');
    assert.equal(ctx.growthCap(ch), 100); assert.equal(ch.shards, 860, 'costs are 20/30/40/50');
    ctx.rankLv = 100;
}
{
    const old = make({ lvl: 57, baseAtk: 180, maxHp: 1270, nextExp: 10000, exp: 5000, growthVersion: undefined });
    ctx.normalizeCharacterGrowth(old);
    assert.equal(old.lvl, 57); assert.equal(old.baseAtk, 180); assert.equal(old.maxHp, 1270); assert.equal(ctx.growthCap(old), 80);
    assert.equal(old.exp, Math.floor(ctx.growthExpNeed(57) / 2));
    const saved = JSON.parse(JSON.stringify(old)); ctx.normalizeCharacterGrowth(saved);
    assert.equal(saved.exp, old.exp, 'migration is idempotent on reload'); assert.equal(saved.legacyCap, 80);
    const veryOld = make({ lvl: 140, growthVersion: undefined }); ctx.normalizeCharacterGrowth(veryOld);
    ctx.gainGrowthExp(veryOld, 1e9); assert.equal(veryOld.lvl, 140, 'existing above-100 levels preserved');
    const v1low = make({ lvl: 70, growthVersion: 1, legacyCap: 30, breakthrough: 4 }); ctx.normalizeCharacterGrowth(v1low);
    assert.equal(ctx.growthCap(v1low), 80); assert.equal(v1low.breakthrough, 0, 'old caps below 80 convert to zero stages');
    const v1mid = make({ lvl: 90, growthVersion: 1, legacyCap: 30, breakthrough: 6 }); ctx.normalizeCharacterGrowth(v1mid);
    assert.equal(ctx.growthCap(v1mid), 90); assert.equal(v1mid.breakthrough, 2, 'old cap 90 converts to two stages');
    const v1max = make({ lvl: 100, growthVersion: 1, legacyCap: 30, breakthrough: 7 }); ctx.normalizeCharacterGrowth(v1max);
    assert.equal(ctx.growthCap(v1max), 100); assert.equal(v1max.breakthrough, 4, 'old max converts to four stages');
}
{
    const ch = make(); ctx.roster.hero = ch; ctx.shardTotal = 1000;
    ctx.upgradeTalent('hero', 'skill'); assert.equal(ch.talents.skill, 1); assert.equal(ctx.shardTotal, 980);
    ctx.upgradeTalent('hero', 'pf'); assert.equal(ch.talents.pf, 1); assert.equal(ctx.shardTotal, 960);
    ctx.upgradeTalent('hero', 'survival'); assert.equal(ch.talents.survival, 0, 'level-one budget is 2 points');
    ctx.resetTalents('hero'); assert.equal(ctx.shardTotal, 1000); assert.equal(ctx.talentUsed(ch), 0);
    ctx.shardTotal = 0; ctx.upgradeTalent('hero', 'skill'); assert.equal(ch.talents.skill, 0);
    ctx.shardTotal = 10000; ch.lvl = 60;
    for (let i = 0; i < 10; i++) ctx.upgradeTalent('hero', 'skill');
    assert.equal(ch.talents.skill, 8, 'per-path cap');
    for (let i = 0; i < 10; i++) ctx.upgradeTalent('hero', 'pf');
    assert.equal(ctx.talentUsed(ch), 12, 'total talent cap');
    ctx.resetTalents('hero'); assert.equal(ctx.shardTotal, 10000, 'full and exact refund');
    ch.hp = 75;
    for (let i = 0; i < 10; i++) { ctx.upgradeTalent('hero', 'survival'); ctx.resetTalents('hero'); }
    assert.ok(ch.hp <= 75, 'respec cannot farm healing');
    ch.hp = 1; ctx.upgradeTalent('hero', 'survival'); ctx.resetTalents('hero'); assert.equal(ch.hp, 1, 'respec cannot kill a living character');
    ch.hp = 0; ctx.upgradeTalent('hero', 'survival'); assert.equal(ch.hp, 0, 'talents do not revive a downed character');
    ctx.setGrowthView('hero'); const view = ctx.renderGrowthPage(); assert.ok(view.includes('上限解放') && view.includes('角色天賦'));
}
{
    const ch = make({ talents: { skill: 100, pf: 100, survival: 100 } });
    ctx.normalizeCharacterGrowth(ch); assert.equal(ctx.talentUsed(ch), 2, 'save data respects level budget');
    const locked = make({ unlocked: false }); ctx.roster.hero = locked;
    ctx.upgradeTalent('hero', 'skill'); ctx.breakthroughChar('hero'); ctx.gainGrowthExp(locked, 1000);
    assert.equal(locked.lvl, 1); assert.equal(ctx.talentUsed(locked), 0);
}
// Run the actual fragment drop function with deterministic randomness.
const drops = html.slice(html.indexOf('function rollShards()'), html.indexOf('// 兌換：碎片滿', html.indexOf('function rollShards()')));
ctx.CHAR_IDS = ['hero', 'locked']; ctx.CHAR_TABLE = { hero: { open: true, need: 10, name: '已解鎖' }, locked: { open: true, need: 10, name: '未解鎖' } };
ctx.roster = { hero: make({ shards: 9 }), locked: make({ id: 'locked', unlocked: false, shards: 9 }) };
ctx.teamIds = ['hero']; ctx.unisonMap = {}; ctx.enemy = { boss: false }; ctx.stage = 1;
ctx.Math = Object.create(Math); ctx.Math.random = () => 0;
vm.runInContext(drops, ctx); ctx.rollShards();
assert.equal(ctx.roster.hero.shards, 10); assert.equal(ctx.roster.locked.shards, 10);
ctx.rollShards(); assert.equal(ctx.roster.hero.shards, 11, 'unlocked fragments exceed unlock cost');
assert.equal(ctx.roster.locked.shards, 10, 'ready-to-unlock character is not overfilled');
// Exercise the game's actual combat entry points, not just the talent counters.
{
    const ch = make({ lvl: 60, talents: { skill: 2, pf: 0, survival: 8 } });
    const member = { ch, down: false, body: { x: 200, y: 400 } };
    ctx.PF = { foe: {}, members: [member] }; ctx.enemy = { hp: 1000 };
    ctx.CHAR_TABLE.hero.element = 'fire'; ctx.performance = { now: () => 0 };
    ctx.deepElementMultiplier = () => 1; ctx.rollCrit = () => false; ctx.CRIT_DMG = 1.5;
    ctx.atkOf = () => 100; ctx.SFX = { critical: noop }; ctx.applyElemStatus = noop;
    ctx.applyDamage = (source, damage) => damage;
    vm.runInContext(html.slice(html.indexOf('function skillHit('), html.indexOf('// 多段技：', html.indexOf('function skillHit('))), ctx);
    assert.equal(ctx.skillHit(member, 1), 112, 'skill talent changes actual direct skill damage');
    assert.equal(ctx.skillHit(member, 1, { dot: true }), 100, 'status DOT is not counted as skill damage');
    ctx.leadVal = () => 0;
    vm.runInContext(html.match(/function hpMax\(ch\) \{[^\n]+/)[0], ctx);
    assert.equal(ctx.hpMax(ch), 198, 'survival talent changes actual HP cap');
    ctx.FX = { pop: noop, flash: noop, shake: noop }; ctx.playFighter = noop; ctx.deepPerk = () => 0;
    ctx.downMember = m => { m.down = true; };
    vm.runInContext(html.slice(html.indexOf('function memberStrike('), html.indexOf('function downMember(')), ctx);
    ctx.memberStrike(member, 100, 'test'); assert.equal(ch.hp, 58, 'survival talent reduces actual incoming damage');
    let healPct = 0;
    ctx.applyHeal = (m, pct) => { healPct = pct; return 1; };
    vm.runInContext(html.slice(html.indexOf('const SKILL_CAST = {'), html.indexOf('const SKILLS = {}')) + ';this.skillCasts=SKILL_CAST;', ctx);
    ctx.skillCasts.supporter(member);
    assert.equal(healPct, .10 * 1.04, 'skill talent improves outgoing support healing');
}
new Function(src);
for (const b of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new Function(b[1]);
assert.match(html, /growthVersion: c.growthVersion/); assert.match(html, /talents: \{ \.\.\.c.talents \}/);
assert.match(html, /normalizeCharacterGrowth\(roster\[id\]\)/);
console.log('PASS: automatic leveling, level caps, banked XP, fragment payments/drops, old saves, round trips, talent budgets/costs/refunds, HP safety, locked characters, growth UI and syntax.');
