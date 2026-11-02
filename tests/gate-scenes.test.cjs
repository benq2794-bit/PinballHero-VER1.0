const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.resolve(__dirname, '..'), html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let gateId = null, renders = 0;
const ctx = { stage: 10, enemy: {}, homeTabOn: 'boss', renderPage: () => renders++, bossWin: { fire: 2 },
    ELEMENTS: { fire: { label: '火', color: '#f00' }, water: { label: '水', color: '#00f' }, wind: { label: '風', color: '#0f0' }, thunder: { label: '雷', color: '#ff0' } },
    gateStats: () => ({ hp: 1000, atk: 20 }), foeStats: () => ({ hp: 100, atk: 5 }), fmt: String,
    BOSS_EVERY: 10, ENEMY_TABLE: [{ id: 'ordinary', name: '普通怪', icon: '●', element: 'fire' }],
    gateOf: () => ctx.gates.find(g => g.id === gateId) };
vm.createContext(ctx);
vm.runInContext(html.match(/const BOSS_TABLE = (\[[\s\S]*?\]);/)[0] + html.match(/const BOSS_STAGES = (\[[\s\S]*?\]);/)[0] +
    html.slice(html.indexOf('const TOWER_BOSS_TABLE ='), html.indexOf('let enemy = {')) + ';this.gates=BOSS_STAGES;this.towerBossCount=TOWER_BOSS_TABLE.length;', ctx);
vm.runInContext(html.slice(html.indexOf('function spawnEnemy()'), html.indexOf('// 主頁異界迴廊：')), ctx);
const towerIds = [];
for (let i = 0; i < ctx.towerBossCount; i++) { ctx.spawnEnemy(); towerIds.push(ctx.enemy.id); assert.ok(ctx.enemy.battleSkinUrl.includes('/ro/')); }
assert.equal(new Set(towerIds).size, ctx.towerBossCount);
for (const id of ['fire', 'water', 'wind', 'thunder']) {
    gateId = id; ctx.spawnEnemy(); assert.equal(ctx.enemy.id, ctx.gates.find(g => g.id === id).boss);
    // 四道門都換成 RO 圖庫的動畫 webp（整張帶 alpha），體型再依圖幅各自校正
    const skin = `asset/battle/gate-boss/${id === 'fire' ? 'nidhogg' : id}.webp`;
    assert.equal(ctx.enemy.battleSkinUrl, skin);
    assert.equal(ctx.enemy.battleSkinAlpha, true);
    assert.ok(ctx.enemy.battleSkinFace < 0 && ctx.enemy.battleSkinLift > 0);
    assert.ok(!towerIds.includes(ctx.enemy.id));
    const file = fs.readFileSync(path.join(root, ctx.enemy.battleSkinUrl));
    assert.equal(file.subarray(0, 4).toString(), 'RIFF');
    assert.equal(file.subarray(8, 12).toString(), 'WEBP');
    assert.ok(fs.existsSync(path.join(root, `asset/battle/bg/gate_${id}.webp`)));
}
gateId = null; ctx.spawnEnemy(); assert.equal(ctx.enemy.id, towerIds[0], 'gates never consume tower rotation');
ctx.stage = 11; ctx.spawnEnemy(); assert.equal(ctx.enemy.id, 'ordinary'); assert.equal(ctx.enemy.battleSkinUrl, '');
const browserSource = fs.readFileSync(path.join(root, 'asset/gate-browser.js'), 'utf8');
vm.runInContext(browserSource, ctx);
let view = ctx.renderGateBrowser();
assert.ok(view.includes('asset/battle/bg/gate_fire.webp') && view.includes('asset/battle/gate-boss/nidhogg.webp'));
assert.ok(view.includes('再戰獎勵') && view.includes('首勝已領取') && view.includes('再次挑戰'));
assert.ok(!view.includes('/ro/'), 'gate browser never uses tower artwork');
ctx.selectGateDisplay('water'); view = ctx.renderGateBrowser();
assert.ok(view.includes("enterBossGate('water')") && view.includes('首勝獎勵'));
assert.ok(view.includes('asset/battle/gate-boss/water.webp'), 'each gate browser card uses its own RO art');
assert.ok(!view.includes('.gif'), 'no pixel-GIF boss art remains');
ctx.selectGateDisplay('thunder'); ctx.shiftGateDisplay(1); assert.ok(ctx.renderGateBrowser().includes('04 / 04'));
ctx.selectGateDisplay('fire'); ctx.shiftGateDisplay(-1); assert.ok(ctx.renderGateBrowser().includes('01 / 04'));
const before = renders; ctx.selectGateDisplay('invalid'); assert.equal(renders, before);
for (const b of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new Function(b[1]);
assert.match(html, /bossEntranceFreezesBattle\(\)\) \{ render\(\); return; \}/);
assert.match(html, /function battleTick\(\) \{[\s\S]*?if \(bossEntranceFreezesBattle\(\)\) return;/);
assert.ok(html.includes("gateOn() ? zone.name : '波利塔'"));
assert.ok(html.includes('gateOn() ? "試煉" : `第 ${stage} 層`'));
console.log('PASS: independent tower/gate registries, four local boss/background assets, gate navigation, actual completion/rewards, cinematic stop hooks and tower floor label.');
