const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.resolve(__dirname, '..'), html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let gateId = null, renders = 0;
const ctx = { applyTowerDifficultyBonus: stats=>stats, DUNGEON_MODE:null, stage: 10, enemy: {}, homeTabOn: 'boss', renderPage: () => renders++, bossWin: { fire: 2 },
    gateEnhance: {}, hmToast(){}, saveGame: () => true,
    window: {},
    ELEMENTS: { fire: { label: '火', color: '#f00' }, water: { label: '水', color: '#00f' }, wind: { label: '風', color: '#0f0' }, thunder: { label: '雷', color: '#ff0' } },
    gateStats: (g, tier = 0) => ({ hp: 1000, atk: 20, level: 100, tier }), foeStats: () => ({ hp: 100, atk: 5 }), fmt: String,
    syncStamina: () => ({ value: 60, max: 60 }), StaminaSystem: { GATE_COST: 8 },
    BOSS_EVERY: 10, ENEMY_TABLE: [{ id: 'ordinary', name: '普通怪', icon: '●', element: 'fire' }],
    gateOf: () => ctx.gates.find(g => g.id === gateId) };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'asset/game-data.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'asset/gate-enhancement.js'), 'utf8'), ctx);
ctx.GateEnhancement = ctx.window.GateEnhancement;
vm.runInContext(`GAME_DATA = window.GAME_DATA;
    BOSS_TABLE = GAME_DATA.bosses;
    BOSS_STAGES = GAME_DATA.encounters.gates;
    BOSS_EVERY = GAME_DATA.combatRules.tower.bossEvery;
    ENEMY_TABLE = [{ id: 'ordinary', name: '普通怪', icon: '●', element: 'fire' }];
    ${html.slice(html.indexOf('const TOWER_BOSS_TABLE ='), html.indexOf('let enemy = {'))}
    this.gates = BOSS_STAGES; this.towerBossCount = TOWER_BOSS_TABLE.length;`, ctx);
vm.runInContext(html.slice(html.indexOf('function spawnEnemy()'), html.indexOf('function enterBossGate(id)')), ctx);
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
assert.ok(view.includes('再戰獎勵') && view.includes('✓ 已擊破') && view.includes('再次挑戰'));
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
assert.ok(html.includes('clock.style.display = gateOn() ? "none" : ""'));
assert.ok(html.includes('gateOn() ? `${GATE.tier ? "強化 " : ""}${GateEnhancement.label(GATE.tier, enemy.gateLevel)}` : `第 ${stage} 層`'));
// 還沒打過 Lv.100 的門只露預告，不給任何可點的階級；打過 71 勝才開出六顆選項。
assert.ok(view.includes('gate-enhance-teaser') && !view.includes('gate-tier'));
ctx.bossWin.fire = 71; view = ctx.renderGateBrowser();
assert.equal((view.match(/class="gate-tier/g) || []).length, 6, '六個選項：Lv.100 與五階強化');
assert.equal((view.match(/ disabled/g) || []).length, 4, '+20 以後逐顆上鎖');
assert.ok(view.includes('目前選擇　Lv.100') && view.includes('生命倍率') && view.includes('額外金幣') && view.includes('階級首破'));
ctx.selectGateTier('fire', 10); view = ctx.renderGateBrowser();
assert.ok(view.includes('目前選擇　+10') && view.includes('gate-tier chosen') && view.includes('再次挑戰 +10'));
assert.ok(view.includes('×1.5') && view.includes('×1.3') && view.includes('60%') && view.includes('+1,200'));
const lockedRenders = renders; ctx.selectGateTier('fire', 50);
assert.equal(renders, lockedRenders, '未解鎖的階級不寫存檔也不重繪');
assert.equal(ctx.gateEnhance.fire.selected, 10);
ctx.bossWin.fire = 2; ctx.gateEnhance = {};
console.log('PASS: independent tower/gate registries, four local boss/background assets, gate navigation, actual completion/rewards, cinematic stop hooks and tower floor label.');
