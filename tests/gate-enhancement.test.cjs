const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ctx = { window: {}, teamIds: ['a', 'b', 'c'], bossWin: {}, GATE: { id: null, tier: 0 },
    DUNGEON_MODE: null, TRAINING_MODE: false, GATE_MODE: null, EXPEDITION_ID: 'babomet',
    SPECIAL_DUNGEONS: [], STAGE_ZONES: [{ id: 'z' }] };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'asset/game-data.js'), 'utf8'), ctx);
ctx.GAME_DATA = ctx.window.GAME_DATA;
ctx.GATE_BASE_LEVEL = ctx.GAME_DATA.combatRules.gateBaseLevel;
ctx.BOSS_STAGES = ctx.GAME_DATA.encounters.gates;
vm.runInContext(fs.readFileSync(path.join(root, 'asset/gate-enhancement.js'), 'utf8'), ctx);
ctx.GateEnhancement = ctx.window.GateEnhancement;
vm.runInContext(html.slice(html.indexOf('function foeStats(lv, boss)'), html.indexOf('function spawnEnemy()')), ctx);
const E = ctx.GateEnhancement, ids = ctx.BOSS_STAGES.map(g => g.id);
const arr = value => Array.from(value);

// 一、四王各自記解鎖／首破／選擇，互不繼承。
assert.deepEqual(arr(ids), ['thunder', 'wind', 'water', 'fire']);
{
    const saved = { fire: { unlocked: 30, broken: [10, 20], selected: 20 } };
    const out = E.normalize(saved, ids, { fire: 80, water: 71 });
    assert.equal(out.fire.unlocked, 30); assert.deepEqual(arr(out.fire.broken), [10, 20]); assert.equal(out.fire.selected, 20);
    assert.equal(out.water.unlocked, 10, '水王自己的 Lv.100 勝場只開水王的 +10');
    assert.deepEqual(arr(out.water.broken), []); assert.equal(out.water.selected, 0);
    assert.equal(out.wind.unlocked, 0); assert.equal(out.thunder.unlocked, 0);
    assert.equal(E.isUnlocked(out, 'wind', 10, {}), false);
    assert.equal(E.isUnlocked(out, 'fire', 30, {}), true);
}

// 二、30→100 每 10 勝升一階，第 71 勝才是首次擊敗 Lv.100，之後才開 +10。
assert.equal(E.anchorLevel(), 100); assert.equal(E.anchorClearWins(), 71);
assert.equal(E.levelForWins(0), 30); assert.equal(E.levelForWins(9), 30);
assert.equal(E.levelForWins(10), 40); assert.equal(E.levelForWins(69), 90);
assert.equal(E.levelForWins(70), 100); assert.equal(E.levelForWins(71), 100);
assert.equal(E.levelForWins(999), 100, '勝場再也不會把強度推超過 Lv.100');
assert.equal(E.unlockedTier({}, 'fire', { fire: 70 }), 0);
assert.equal(E.unlockedTier({}, 'fire', { fire: 71 }), 10);
{
    const s = E.normalize({}, ids, {});
    assert.equal(E.recordClear(s, 'fire', 0, 90).unlocked, 0);
    const clear = E.recordClear(s, 'fire', 0, 100);
    assert.equal(clear.unlocked, 10); assert.equal(clear.firstBreak, 0, '一般 Lv.100 沒有階級首破');
    assert.equal(E.recordClear(s, 'fire', 0, 100).unlocked, 0, '同一道門只開一次');
}

// 三、五階逐階解鎖：上一階沒破就進不去，破了才開下一階。
{
    const s = E.normalize({}, ids, {}); s.fire.unlocked = 10;
    assert.equal(E.recordClear(s, 'fire', 20, 100).firstBreak, 0, '未解鎖的階級不記首破');
    assert.deepEqual(arr(s.fire.broken), []);
    const first = E.recordClear(s, 'fire', 10, 100);
    assert.equal(first.firstBreak, 5); assert.equal(first.unlocked, 20);
    assert.equal(E.recordClear(s, 'fire', 10, 100).firstBreak, 0, '同一階首破只發一次');
    assert.equal(E.recordClear(s, 'fire', 10, 100).unlocked, 0);
    assert.equal(E.isUnlocked(s, 'fire', 20, {}), true);
    assert.equal(E.isUnlocked(s, 'fire', 30, {}), false);
    assert.equal(E.selectTier(s, 'fire', 30, {}), false);
    assert.equal(E.selectedTier(s, 'fire', {}), 0);
    assert.equal(E.selectTier(s, 'fire', 20, {}), true);
    assert.equal(E.selectedTier(s, 'fire', {}), 20);
    let total = 5;
    for (const tier of [20, 30, 40, 50]) {
        const row = E.recordClear(s, 'fire', tier, 100);
        total += row.firstBreak;
        assert.equal(row.unlocked, tier === 50 ? 0 : tier + 10);
    }
    assert.equal(total, 80, '五階首破合計 5+10+15+20+30');
    assert.deepEqual(arr(s.fire.broken), [10, 20, 30, 40, 50]);
    assert.equal(s.fire.unlocked, 50);
}

// 四、已解鎖的階級可以自由重複選，Lv.100 永遠留著。
{
    const s = E.normalize({}, ids, {}); s.fire.unlocked = 50; s.fire.broken = [10, 20, 30, 40, 50];
    const rows = E.options(s, 'fire', {});
    assert.equal(rows.length, 6);
    assert.equal(rows[0].tier, 0); assert.equal(rows[0].label, 'Lv.100');
    assert.ok(rows.every(row => row.unlocked), '全破之後六顆選項都不上鎖');
    assert.deepEqual(arr(rows.map(row => row.label)), ['Lv.100', '+10', '+20', '+30', '+40', '+50']);
    assert.equal(E.selectTier(s, 'fire', 0, {}), true);
    assert.equal(E.selectedTier(s, 'fire', {}), 0);
    assert.equal(E.recordClear(s, 'fire', 50, 100).firstBreak, 0, '重打已首破的階級不再發首破');
    assert.equal(E.selectTier(s, 'fire', 50, {}), true);
    const locked = E.options(E.normalize({}, ids, {}), 'fire', { fire: 71 });
    assert.deepEqual(arr(locked.map(row => row.unlocked)), [true, true, false, false, false, false]);
    assert.equal(locked[2].label, '+20');
}

// 五、階級倍率乘在「已含關卡屬性倍率的最終值」上，同一顆 mult／amult 絕不重乘。
{
    const expected = { 10: [1.5, 1.3], 20: [2, 1.6], 30: [2.5, 1.9], 40: [3, 2.2], 50: [3.5, 2.5] };
    for (const gate of ctx.BOSS_STAGES) {
        ctx.bossWin[gate.id] = 71;
        const base = ctx.gateStats(gate, 0), raw = ctx.foeStats(100, true);
        assert.equal(base.level, 100); assert.equal(base.tier, 0);
        assert.equal(base.hp, Math.round(raw.hp * gate.mult), `${gate.id} 屬性倍率只乘一次`);
        assert.equal(base.atk, Math.round(raw.atk * gate.amult));
        for (const [tier, [hp, atk]] of Object.entries(expected)) {
            const st = ctx.gateStats(gate, +tier);
            assert.equal(st.level, 100); assert.equal(st.tier, +tier);
            assert.equal(st.hp, Math.round(base.hp * hp), `${gate.id} +${tier} 生命`);
            assert.equal(st.atk, Math.round(base.atk * atk), `${gate.id} +${tier} 攻擊`);
        }
        assert.equal(ctx.gateStats(gate, 99).tier, 0, '不存在的階級退回一般 Lv.100');
    }
    ctx.bossWin.fire = 0;
    assert.equal(ctx.gateStats(ctx.BOSS_STAGES.find(g => g.id === 'fire'), 0).level, 30);
}

// 六、七、逐級碎片機率與額外金幣；階級一律以 Lv.100 為基準。
{
    const chances = { 30: .30, 40: .30, 50: .30, 60: .35, 70: .40, 80: .45, 90: .50, 100: .55 };
    const golds = { 30: 0, 40: 200, 50: 400, 60: 600, 70: 800, 80: 1000, 90: 1000, 100: 1000 };
    for (const [level, chance] of Object.entries(chances)) {
        const rule = E.rewardRule(+level, 0);
        assert.equal(rule.level, +level); assert.equal(rule.tier, 0);
        assert.equal(rule.shardChance, chance); assert.equal(rule.gold, golds[level]);
        assert.equal(rule.stones, 0); assert.equal(rule.firstRainbow, 0);
        assert.equal(rule.hp, 1); assert.equal(rule.atk, 1);
    }
    const tiers = { 10: [.60, 1200, 1, 5], 20: [.65, 1400, 1, 10], 30: [.70, 1600, 2, 15], 40: [.75, 1800, 2, 20], 50: [1, 2000, 3, 30] };
    for (const [tier, [chance, gold, stones, first]] of Object.entries(tiers)) {
        const rule = E.rewardRule(30, +tier);
        assert.equal(rule.level, 100, '強化階級永遠錨在 Lv.100');
        assert.equal(rule.tier, +tier); assert.equal(rule.shardChance, chance);
        assert.equal(rule.gold, gold); assert.equal(rule.stones, stones); assert.equal(rule.firstRainbow, first);
    }
    assert.equal(E.rewardRule(0, 0).level, 30);
    assert.equal(E.label(0, 100), 'Lv.100'); assert.equal(E.label(30, 100), '+30');
    assert.equal(ctx.GAME_DATA.rewards.gateFourStarFragment.amount, 1, '每場最多一張碎片');
    assert.equal(ctx.GAME_DATA.rewards.gateFourStarFragment.chance, undefined, '機率改由等級／階級決定');
    for (const gate of ctx.BOSS_STAGES) assert.equal(gate.replay, undefined, '固定再戰 5 顆已取消');
}

// 八、結算在入帳前預覽首破，預覽本身不改存檔。
{
    const s = E.normalize({}, ids, {}); s.fire.unlocked = 10;
    const snapshot = JSON.stringify(s);
    assert.equal(E.previewClear(s, 'fire', 10, 100).firstBreak, 5);
    assert.equal(E.previewClear(s, 'fire', 10, 100).unlocked, 20);
    assert.equal(JSON.stringify(s), snapshot, '預覽拿的是複本');
    E.recordClear(s, 'fire', 10, 100);
    assert.equal(E.previewClear(s, 'fire', 10, 100).firstBreak, 0);
}

// 十二、十四、髒存檔不鎖死玩家，JSON 往返後狀態不變，三個寫檔接點都在。
{
    const dirty = { fire: { unlocked: 99, broken: [10, 10, 20, 77, '30'], selected: 40 },
        water: { unlocked: 20, broken: [10], selected: 50 }, wind: null, thunder: { unlocked: 30 } };
    const out = E.normalize(dirty, ids, { fire: 71 });
    assert.equal(out.fire.unlocked, 30, 'broken 補回解鎖，玩家不會被鎖回去');
    assert.deepEqual(arr(out.fire.broken), [10, 20]); assert.equal(out.fire.selected, 0);
    assert.equal(out.water.unlocked, 20); assert.deepEqual(arr(out.water.broken), [10]); assert.equal(out.water.selected, 0);
    assert.deepEqual(JSON.parse(JSON.stringify(out.wind)), { unlocked: 0, broken: [], selected: 0 });
    assert.equal(out.thunder.unlocked, 30); assert.equal(out.thunder.selected, 0);
    const round = E.normalize(JSON.parse(JSON.stringify(out)), ids, { fire: 71 });
    assert.deepEqual(JSON.parse(JSON.stringify(round)), JSON.parse(JSON.stringify(out)), '存檔往返不掉進度');
    assert.deepEqual(E.normalize(null, ids, {}), E.normalize({}, ids, {}));
    const save = fs.readFileSync(path.join(root, 'asset/save-system.js'), 'utf8');
    assert.match(save, /'gateEnhance'/);
    assert.match(save, /GateEnhancement\.normalize\(p\.gateEnhance, gateIds, state\.bossWin\)/);
    assert.ok(html.includes('bossWin, gateRecord, gateEnhance, cultivationMaterials,'), 'saveGame 快照要帶新欄位');
    assert.ok(html.includes('unisonMap, titleOn, bossWin, gateRecord, gateEnhance,'), 'loadGame 解構要先宣告');
    assert.ok(html.includes('let gateEnhance = GateEnhancement.normalize('));
    assert.ok(html.indexOf('asset/gate-enhancement.js') < html.indexOf('asset/save-system.js'), '規則模組要先於存檔系統載入');
    assert.ok(html.includes('&tier=${gateBattleTier}'), '開窗把選定階級帶進 iframe');
    assert.ok(html.includes('GATE.tier = !TRAINING_MODE && GateEnhancement.isUnlocked('), '子頁只接受已解鎖的階級');
}

// 十、波利塔一般波次整波只抽一次，碎片仍是全屬性加權，虹彩石 10%。
{
    const settle = html.slice(html.indexOf('settleTower() {'), html.indexOf('applyGateReward(gate, result)'));
    assert.equal((settle.match(/rollShards\(\)/g) || []).length, 1, '一般波次整波只抽一次，不是每隻怪抽一次');
    assert.equal((html.match(/rollShards\(\);/g) || []).length, 1);
    const towerFragment = html.slice(html.indexOf('function awardTowerCharacterFragments('), html.indexOf('function rollShards()'));
    assert.ok(!towerFragment.includes('element'), '波利塔碎片不依屬性過濾');
    assert.ok(towerFragment.includes('teamIds.includes(id)') && towerFragment.includes('unisonMap'), '保留上場／共鳴加權');
    assert.equal(ctx.GAME_DATA.rewards.towerEnemyRainbowCrystal.chance, .1);
    assert.equal(ctx.GAME_DATA.rewards.towerEnemyRainbowCrystal.amount, 1);
    assert.equal(ctx.GAME_DATA.rewards.towerEnemyCharacterFragment.chance, .01);
    assert.equal(ctx.GAME_DATA.rewards.towerEnemyMaterials.jelly.chance, .2);
    assert.equal(ctx.GAME_DATA.rewards.towerEnemyMaterials.blockScrap.chance, .1);
    assert.equal(ctx.GAME_DATA.rewards.towerEnemyMaterials.monsterCrystal.chance, .05);
}
console.log('PASS: four independent gate progressions, Lv.100 anchor unlock at win 71, sequential five tiers, free re-selection, multipliers applied once on final stats, level/tier shard-gold-stone tables, non-mutating first-break preview, dirty-save migration and persistence wiring, per-wave tower rolls');