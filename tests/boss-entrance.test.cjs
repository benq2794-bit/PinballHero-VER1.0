const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.resolve(__dirname, '..'), src = fs.readFileSync(path.join(root, 'asset/boss-entrance.js'), 'utf8');
const elements = {};
function element() { const classes = new Set(); return { style: {}, hidden: false, attributes: {}, classList: {
    add: (...items) => items.forEach(i => classes.add(i)), remove: (...items) => items.forEach(i => classes.delete(i)), contains: x => classes.has(x)
}, setAttribute(k, v) { this.attributes[k] = v; } }; }
for (const id of ['boss-entrance', 'boss-entrance-floor', 'boss-entrance-name', 'boss-entrance-element', 'boss-entrance-image', 'pf-frame']) elements[id] = element();
const panel = elements['boss-entrance']; let tones = 0, gate = false, clock = 0;
const ctx = { performance: { now: () => clock }, GATE: { id: null, t0: 0 }, $: id => elements[id], stage: 20, PF: { foeSeq: 2, ready: true, running: true, paused: false, el: element(), nextCastAt: 5000, members: [], burns: [] },
    enemy: { boss: true, hp: 100, element: 'fire', name: '原始名稱', battleSkinUrl: 'asset/monster/ro/angeling.png' },
    ELEMENTS: { fire: { label: '火', color: '#ff4757' } }, gateOn: () => gate, gateOf: () => ({ gate: '炎之門' }), SFX: { tone() { tones++; } } };
vm.createContext(ctx); vm.runInContext(src + ';this.intro=BOSS_ENTRANCE;', ctx);
elements['pf-frame'].style.display = 'none'; ctx.queueBossEntrance(); ctx.updateBossEntrance(5000);
assert.equal(ctx.intro.pending, true); assert.equal(panel.classList.contains('on'), false); assert.equal(tones, 0);
elements['pf-frame'].style.display = ''; ctx.updateBossEntrance(100);
assert.equal(panel.classList.contains('on'), true); assert.equal(elements['boss-entrance-name'].textContent, '天使波利');
assert.equal(elements['boss-entrance-floor'].textContent, '無限波利塔 · 第 20 層'); assert.equal(tones, 2);
ctx.PF.paused = true; ctx.updateBossEntrance(5000); assert.equal(ctx.intro.elapsed, 100);
ctx.PF.paused = false; ctx.updateBossEntrance(1700); assert.equal(panel.classList.contains('leaving'), true); assert.equal(tones, 2);
ctx.updateBossEntrance(200); assert.equal(panel.classList.contains('on'), false); assert.equal(ctx.intro.data, null);
ctx.updateBossEntrance(1000); assert.equal(tones, 2, 'no repeated intro');
ctx.enemy.boss = false; ctx.queueBossEntrance(); assert.equal(ctx.intro.pending, false);
ctx.enemy.boss = true; ctx.enemy.battleSkinUrl = 'asset/battle/gate-boss/fire.gif'; ctx.enemy.name = '煉獄龍王・瓦格納'; gate = true; ctx.GATE.id = 'fire'; clock = 100;
ctx.queueBossEntrance(); ctx.updateBossEntrance(0); assert.equal(elements['boss-entrance-name'].textContent, '煉獄龍王・瓦格納'); assert.equal(elements['boss-entrance-floor'].textContent, '炎之門');
assert.equal(ctx.bossEntranceFreezesBattle(), true); assert.equal(panel.classList.contains('gate-enter'), true);
clock = 2700; ctx.updateBossEntrance(2600);
assert.equal(ctx.bossEntranceFreezesBattle(), false); assert.equal(ctx.GATE.t0, 2600); assert.equal(ctx.PF.nextCastAt, 7600);
ctx.queueBossEntrance(); ctx.updateBossEntrance(0);
elements['boss-entrance-image'].onerror(); assert.equal(elements['boss-entrance-image'].hidden, true);
ctx.PF.foeSeq++; ctx.updateBossEntrance(0); assert.equal(ctx.intro.data, null);
ctx.queueBossEntrance(); ctx.enemy.hp = 0; ctx.updateBossEntrance(0); assert.equal(ctx.intro.data, null, 'boss death clears notice');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
new Function(src);
for (const block of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new Function(block[1]);
assert.match(html, /initializeEnemyWave\(\);\s*queueBossEntrance\(\)/);
assert.match(html, /function killFoe\(\) \{\s*hideBossEntrance\(\)/);
console.log('PASS: boss-only intro, actual appearance name, floor/gate labels, visible-screen delay, 2s auto-hide, pause, one-shot sound, image fallback and death/wave cleanup.');
