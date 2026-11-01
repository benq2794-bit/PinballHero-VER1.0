const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.resolve(__dirname, '..'), src = fs.readFileSync(path.join(root, 'asset/boss-entrance.js'), 'utf8');
const elements = {};
function element() {
    const classes = new Set();
    return { style: { setProperty() {}, removeProperty() {} }, hidden: false, attributes: {}, offsetWidth: 300,
        classList: {
            add: (...items) => items.forEach(i => classes.add(i)), remove: (...items) => items.forEach(i => classes.delete(i)),
            contains: x => classes.has(x),
            toggle: (x, on) => { if (on === undefined ? !classes.has(x) : on) classes.add(x); else classes.delete(x); }
        }, setAttribute(k, v) { this.attributes[k] = v; } };
}
for (const id of ['boss-entrance', 'boss-entrance-title', 'boss-entrance-floor', 'boss-entrance-name', 'boss-entrance-element', 'boss-entrance-image', 'pf-frame']) elements[id] = element();
const panel = elements['boss-entrance']; let tones = 0, gate = false, clock = 0;
const ctx = { performance: { now: () => clock }, setTimeout: () => 0, GATE: { id: null, t0: 0 }, $: id => elements[id], stage: 20,
    PF: { foeSeq: 2, ready: true, running: true, paused: false, el: element(), nextCastAt: 5000, members: [], burns: [] },
    enemy: { boss: true, hp: 100, maxHp: 100, element: 'fire', name: '原始名稱', battleSkinUrl: 'asset/monster/ro/angeling.png' },
    ELEMENTS: { fire: { label: '火', color: '#ff4757' } }, gateOn: () => gate, gateOf: () => ({ gate: '炎之門' }),
    FX: { smoke() {}, sparks() {}, flash() {} }, SFX: { tone() { tones++; }, noise() {} } };
vm.createContext(ctx); vm.runInContext(src + ';this.intro=BOSS_ENTRANCE;', ctx);

// 戰場沒顯示時只排隊，不出聲、不開面板
elements['pf-frame'].offsetWidth = 0; ctx.queueBossEntrance(); ctx.updateBossEntrance(5000);
assert.equal(ctx.intro.pending, true); assert.equal(panel.classList.contains('on'), false); assert.equal(tones, 0);

// 第一幕：預兆，王先藏起來
elements['pf-frame'].offsetWidth = 300; ctx.updateBossEntrance(0);
assert.equal(ctx.intro.pending, false); assert.equal(tones, 1); assert.equal(panel.classList.contains('on'), false);

// 第二幕：本體砸地
ctx.updateBossEntrance(700);
assert.equal(ctx.intro.data.phase, 1); assert.equal(panel.classList.contains('on'), false);

// 第三幕：血條充能＋插播橫幅出現
ctx.updateBossEntrance(880);
assert.equal(ctx.intro.data.phase, 2); assert.equal(panel.classList.contains('on'), true);
assert.equal(elements['boss-entrance-title'].textContent, '⚠ BOSS 登場　炎災之孽');
assert.equal(elements['boss-entrance-name'].textContent, '天使波利');
assert.equal(elements['boss-entrance-floor'].textContent, '無限波利塔 · 第 20 層');

// 暫停時計時不走
ctx.PF.paused = true; ctx.updateBossEntrance(5000); assert.equal(ctx.intro.elapsed, 1580);
ctx.PF.paused = false;

// 收尾：先淡出，再整個收掉；之後不會重播
ctx.updateBossEntrance(800);
assert.equal(panel.classList.contains('leaving'), true);
ctx.updateBossEntrance(200);
assert.equal(panel.classList.contains('on'), false); assert.equal(ctx.intro.data, null);
ctx.updateBossEntrance(1000); assert.equal(tones, 8, 'no repeated intro');

// 非 BOSS 不登場
ctx.enemy.boss = false; ctx.queueBossEntrance(); assert.equal(ctx.intro.pending, false);

// 門戰：稱號、門名、凍結與時間補回
ctx.enemy.boss = true; ctx.enemy.battleSkinUrl = 'asset/battle/gate-boss/nidhogg.webp'; ctx.enemy.name = '煉獄龍王・瓦格納'; gate = true; ctx.GATE.id = 'fire'; clock = 100;
ctx.queueBossEntrance(); ctx.updateBossEntrance(0);
assert.equal(elements['boss-entrance-name'].textContent, '煉獄龍王・瓦格納');
assert.equal(elements['boss-entrance-floor'].textContent, '炎之門');
assert.equal(ctx.bossEntranceFreezesBattle(), true);
assert.equal(panel.classList.contains('gate-enter'), true);

// 門的入場節奏較慢（820+980+1040），跑完才解凍並把被吃掉的主戰場時間補回去
clock = 3000; ctx.updateBossEntrance(3000);
assert.equal(ctx.bossEntranceFreezesBattle(), false);
assert.equal(ctx.GATE.t0, 2900); assert.equal(ctx.PF.nextCastAt, 7900);

// 圖片失敗只收圖，不留破圖
ctx.queueBossEntrance(); ctx.updateBossEntrance(0);
elements['boss-entrance-image'].onerror(); assert.equal(elements['boss-entrance-image'].hidden, true);

// 換波、王死都要把面板清掉
ctx.PF.foeSeq++; ctx.updateBossEntrance(0); assert.equal(ctx.intro.data, null);
ctx.queueBossEntrance(); ctx.enemy.hp = 0; ctx.updateBossEntrance(0); assert.equal(ctx.intro.data, null, 'boss death clears notice');

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
new Function(src);
for (const block of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new Function(block[1]);
assert.match(html, /initializeEnemyWave\(\);\s*queueBossEntrance\(\)/);
assert.match(html, /function killFoe\(\) \{\s*hideBossEntrance\(\)/);
assert.doesNotMatch(html, /hud-exit/, '離場按鈕已收進暫停選單');
assert.match(html, /id="pp-gate-exit"/);
console.log('PASS: boss-only intro, actual appearance name, floor/gate labels, visible-screen delay, three-phase cut-in, pause, one-shot sound, image fallback and death/wave cleanup.');
