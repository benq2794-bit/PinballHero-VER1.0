const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const body = {
    innerHTML: '', scrollTop: 0,
    querySelector: () => null,
    querySelectorAll: () => [],
    contains: () => true
};
const ctx = {
    window: {}, document: { getElementById: () => null, body },
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    performance: { now: () => 1 }, confirm: () => true,
    saveGame() {}, homeTabOn: 'talents',
    $: id => id === 'pg-body' ? body : null
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'asset/game-data.js'), 'utf8'), ctx);
ctx.GAME_DATA = ctx.window.GAME_DATA;
ctx.TYPE_INFO = ctx.GAME_DATA.combatRules.typeInfo;
ctx.TYPE_PASSIVES = ctx.GAME_DATA.combatRules.typePassives;
vm.runInContext(fs.readFileSync(path.join(root, 'asset/type-talents.js'), 'utf8'), ctx);
const types = Object.keys(ctx.GAME_DATA.typeTalentTrees);
const nodes = Object.fromEntries(types.map(type => [
    type, ctx.GAME_DATA.typeTalentTrees[type].branches.flatMap(branch => branch.nodes)
]));
const run = code => vm.runInContext(code, ctx);
const reset = () => {
    run('typeTalentRanks = {}; typeTalentPoints = 33; typeTalentSelected = {};');
};
const investFirstFive = type => nodes[type].slice(0, 5).forEach(node => ctx.investTypeTalent(type, node.id));
const learnPassive = type => ctx.unlockTypeTalentPassive(type);

reset();
assert.equal(nodes.knight.length, 6, 'six normal nodes remain available');
investFirstFive('knight');
assert.equal(ctx.typeTalentOrdinaryProgress('knight'), 5);
assert.equal(ctx.typeTalentPassiveState('knight').state, 'passive-available');
assert.equal(ctx.typeTalentPassiveUnlocked('knight'), false);
assert.match(ctx.typeTalentTreeMarkup(), /普通 5\/5/);
assert.match(ctx.typeTalentTreeMarkup(), /投入 5\/11/);
assert.match(ctx.typeTalentTreeMarkup(), /可解鎖（消耗 1 點）/);
learnPassive('knight');
assert.equal(run('typeTalentPoints'), 27);
assert.equal(ctx.typeTalentTypeSpent('knight'), 6);
assert.equal(ctx.typeTalentPassiveUnlocked('knight'), true);
assert.match(ctx.typeTalentTreeMarkup(), /passive-active tt-passive-node/);

reset();
investFirstFive('knight');
learnPassive('knight');
for (let i = 0; i < 4; i++) ctx.investTypeTalent('knight', nodes.knight[0].id);
ctx.investTypeTalent('knight', nodes.knight[5].id);
assert.equal(ctx.typeTalentTypeSpent('knight'), 11, 'ordinary ranks and passive share the lane cap');
ctx.investTypeTalent('knight', nodes.knight[5].id);
assert.equal(ctx.typeTalentTypeSpent('knight'), 11, 'the lane rejects a twelfth point');

reset();
for (const type of types.slice(0, 3)) {
    investFirstFive(type);
    learnPassive(type);
}
assert.equal(ctx.typeTalentPassiveCount(), 3);
assert.equal(ctx.typeTalentPassiveState(types[4]).state, 'passive-limit',
    'the three-passive cap explains the restriction even before the next prerequisite is met');
investFirstFive(types[3]);
assert.equal(ctx.typeTalentPassiveState(types[3]).state, 'passive-limit');
assert.match(ctx.typeTalentPassiveState(types[3]).reason, /3 種專屬被動上限/);
assert.match(ctx.typeTalentTreeMarkup(), /上限已滿/);
assert.match(ctx.typeTalentTreeMarkup(), /已達 3 種專屬被動上限/);
for (let i = 0; i < 4; i++) ctx.investTypeTalent(types[3], nodes[types[3]][0].id);
ctx.investTypeTalent(types[3], nodes[types[3]][5].id);
ctx.investTypeTalent(types[3], nodes[types[3]][5].id);
for (const node of nodes[types[4]].slice(0, 4)) ctx.investTypeTalent(types[4], node.id);
assert.equal(run('typeTalentPoints'), 0);
assert.equal(ctx.typeTalentSpent(), 33, 'the shared pool counts all passive unlock costs');
const blockedNode = nodes[types[4]][4];
const blockedBranch = ctx.GAME_DATA.typeTalentTrees[types[4]].branches.find(branch => branch.nodes.includes(blockedNode));
assert.equal(ctx.typeTalentNodeState(types[4], blockedBranch, blockedBranch.nodes.indexOf(blockedNode)), 'locked',
    'the shared 33-point pool blocks additional investments');

reset();
investFirstFive('knight');
learnPassive('knight');
ctx.refundTypeTalent('knight', nodes.knight[1].id);
assert.equal(ctx.typeTalentOrdinaryProgress('knight'), 1);
assert.equal(ctx.typeTalentPassiveUnlocked('knight'), false, 'losing a prerequisite refunds and disables the passive');
assert.equal(ctx.typeTalentSpent(), 1);
assert.equal(run('typeTalentPoints'), 32);

reset();
investFirstFive('knight');
learnPassive('knight');
ctx.resetAllTypeTalents();
assert.equal(ctx.typeTalentSpent(), 0);
assert.equal(run('typeTalentPoints'), 33, 'free reset returns ordinary and passive points');
investFirstFive('knight');
learnPassive('knight');
ctx.resetAllTypeTalents();
assert.equal(run('typeTalentPoints'), 33, 'reset remains repeatable');

reset();
investFirstFive('knight');
learnPassive('knight');
const normalized = ctx.normalizeTypeTalentRanks(run('typeTalentRanks'));
assert.equal(normalized.knight.passive_knight, 1, 'saved normalization preserves the unlocked flag');
assert.equal(ctx.typeTalentSpent(null, normalized), 6);
console.log('PASS: six ordinary nodes, 5/5 prerequisite, manual passive cost, three-passive limit, 11-point lane cap, refunds, repeatable free reset, and saved unlock state.');
