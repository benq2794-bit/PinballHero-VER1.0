const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), ctx = { window: {} };
vm.createContext(ctx);
for (const name of ['game-data', 'gate-enhancement', 'battle-lifecycle', 'battle-settlement', 'ui-router', 'reward-formulas', 'type-effects']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'asset/' + name + '.js'), 'utf8'), ctx);
}
// Browsers expose window properties as global identifiers; mirror that binding in this isolated VM.
ctx.GAME_DATA = ctx.window.GAME_DATA;
ctx.GateEnhancement = ctx.window.GateEnhancement;
const { BattleLifecycle, BattleSettlement, UIRouter, RewardFormulas, TypeEffects } = ctx.window;
function clock() {
    const state = { paused: false, running: true, holdL: true, holdR: true };
    let time = 1000, intro = false, cinematic = false;
    const resumed = [];
    const life = BattleLifecycle.create({ getState: () => state, now: () => time,
        isIntro: () => intro, isCinematic: () => cinematic,
        onResume: ms => { resumed.push(ms); BattleLifecycle.shiftDeadlines(state, ms); } });
    return { life, state, resumed, elapse: ms => { time += ms; },
        intro: value => { intro = value; }, cinematic: value => { cinematic = value; } };
}
{
    const c = clock(), hits = [];
    c.life.schedule(180, () => hits.push('hit'));
    c.life.advance(100); c.life.setPaused(true); c.elapse(5000); c.life.advance(5000);
    assert.equal(hits.length, 0); assert.equal(c.state.holdL, false);
    c.life.setPaused(true); c.life.setPaused(false);
    assert.deepEqual(c.resumed, [5000], 'nested pause calls do not double-count elapsed time');
    c.life.advance(79); assert.equal(hits.length, 0);
    c.life.advance(1); assert.deepEqual(hits, ['hit']);
    c.life.schedule(10, () => hits.push('stale'));
    c.life.invalidate(); c.life.advance(50); assert.equal(hits.length, 1);
    c.life.schedule(20, () => hits.push('after-skill'));
    c.cinematic(true); c.life.advance(2000); assert.equal(c.life.phase(), 'skill');
    c.cinematic(false); c.intro(true); c.life.advance(2000); assert.equal(c.life.phase(), 'intro');
    c.intro(false); c.life.advance(20); assert.equal(hits.length, 2);
    c.life.setRunning(false); assert.equal(c.life.phase(), 'defeated');
    assert.equal(c.life.claimOnce('reward'), true); assert.equal(c.life.claimOnce('reward'), false);
    c.life.invalidate(); assert.equal(c.life.claimOnce('reward'), true);
    // A callback that changes encounters also cancels the rest of the same frame's tasks.
    c.life.setRunning(true);
    c.life.schedule(1, () => c.life.invalidate()); c.life.schedule(1, () => hits.push('old-wave'));
    c.life.advance(10); assert.equal(hits.includes('old-wave'), false);
}
{
    const state = { nextCastAt: 2000, breakUntil: 2100, weak: { at: 1000 },
        aura: { at: 1200, until: 2400 }, buff: { until: 3000 }, burns: [{ at: 1100 }],
        members: [{ respawnAt: 1500, ch: { _fighterShockReadyAt: 1600 }, body: { _rangerPierceUntil: 1700 } }] };
    BattleLifecycle.shiftDeadlines(state, 5000);
    assert.equal(state.weak.at, 6000); assert.equal(state.breakUntil, 7100);
    assert.equal(state.aura.until, 7400); assert.equal(state.burns[0].at, 6100);
    assert.equal(state.members[0].body._rangerPierceUntil, 6700);
}
function settlement(training = false, gate = null) {
    const c = clock(), events = [], members = [{ ch: { id: 'a' } }, { ch: { id: 'b' } }];
    const state = { training, gate, seq: 1, enemy: { hp: 0, expReward: 101, name: 'Boss', maxHp: 1000 },
        gateDefinition: gate ? { id: gate, gate: '火關', el: 'fire', shards: 60, par: 40 } : null,
        gateEnhance: {}, gateTier: 0, gateLevel: 100,
        bossWin: {}, now: 2200, startedAt: 1000, damage: 1000, damageStart: 0 };
    const actions = Object.fromEntries(['playVictory', 'trainingNotice', 'resetTraining', 'experienceNotice',
        'gainRankExp', 'gateVictory', 'settleTower', 'showGateResult', 'recordGate', 'save', 'publishGateResult'].map(name =>
        [name, (...args) => events.push({ name, args })]));
    actions.survivors = () => members;
    actions.addExp = (ch, amount) => events.push({ name: 'exp', id: ch.id, amount });
    actions.applyGateReward = (g, result) => { state.bossWin[g.id] = result.win; events.push({ name: 'reward', result }); };
    const runtime = BattleSettlement.create({ getState: () => state, lifecycle: c.life,
        splitExperience: RewardFormulas.splitExperience, actions });
    return { ...c, state, events, runtime };
}
{
    const t = settlement();
    assert.equal(t.runtime.resolveWave(), true); assert.equal(t.runtime.resolveWave(), false);
    // 戰鬥經驗整筆進 RANK；角色經驗改由培養道具，不再依人數拆帳。
    assert.deepEqual(t.events.filter(e => e.name === 'gainRankExp').map(e => e.args), [[101]]);
    assert.equal(t.events.some(e => e.name === 'exp'), false, '戰鬥經驗不再直接分給角色');
    assert.equal(t.events.filter(e => e.name === 'settleTower').length, 1);
}
{
    const t = settlement(false, 'fire');
    t.runtime.resolveWave(); t.life.advance(499);
    assert.equal(t.events.some(e => e.name === 'gateVictory'), false);
    t.life.setPaused(true); t.life.advance(1000); t.life.setPaused(false); t.life.advance(1);
    assert.equal(t.events.filter(e => e.name === 'gateVictory').length, 1);
    assert.equal(t.runtime.resolveGate(), true); assert.equal(t.runtime.resolveGate(), false);
    assert.equal(t.events.find(e => e.name === 'reward').result.shards, 60);
    // 破關同時把這一場的用時與分數交回紀錄簿（門 id／毫秒／分數）
    const recorded = t.events.find(e => e.name === 'recordGate');
    assert.deepEqual(recorded.args.slice(0, 2), ['fire', 1200]);
    assert.ok(recorded.args[2] > 0, 'score is positive');
    t.life.invalidate(); t.state.seq++; t.runtime.resolveGate();
    // 再戰不再有固定 5 顆：首勝的 60 只發一次，第二場只剩隨機 1～3 虹彩石。
    const replay = t.events.filter(e => e.name === 'reward')[1].result;
    assert.equal(replay.shards, 0);
    assert.ok(replay.drops.rainbow >= 1 && replay.drops.rainbow <= 3);
    assert.equal(replay.gold, 1000, 'Lv.100 每場額外金幣 1,000');
    assert.equal(replay.firstBreak, 0, '一般等級沒有階級首破');
    const receipts = new Map();
    assert.equal(BattleSettlement.acceptGateReceipt(receipts, { gate: 'fire', win: 1 }), true);
    assert.equal(BattleSettlement.acceptGateReceipt(receipts, { gate: 'fire', win: 1 }), false);
    assert.equal(BattleSettlement.acceptGateReceipt(receipts, { gate: 'fire', win: 2 }), true);
}
{
    const t = settlement(true, 'fire');
    t.runtime.resolveWave(); t.life.advance(500);
    assert.equal(t.events.filter(e => e.name === 'resetTraining').length, 1);
    assert.equal(t.events.some(e => e.name === 'gainRankExp' || e.name === 'reward' || e.name === 'settleTower'), false,
        '訓練場不發 RANK 經驗、不發獎勵、不推樓層');
    assert.equal(t.runtime.resolveGate(), false);
    const stale = settlement(false, 'fire'); stale.runtime.resolveWave(); stale.life.invalidate(); stale.life.advance(1000);
    assert.equal(stale.events.some(e => e.name === 'gateVictory'), false);
}
{
    const elements = Object.fromEntries(['home', 'page', 'battle', 'adventure'].map(id => [id, { style: {} }]));
    const calls = []; let tab = 'home', embedded = false;
    const router = UIRouter.create({ screens: { home: 'home', page: 'page', battle: 'battle', adventure: 'adventure' },
        getElement: id => elements[id], getPages: () => ({ chars: '角色管理', talents: '天賦' }),
        setTab: value => { tab = value; }, paintHome: () => {}, paintAdventure: () => {}, renderPage: () => calls.push(tab), renderTabs: () => {},
        onBattle: () => {}, onHomeParty: () => {}, onLeave: () => {},
        closeOverlays: () => calls.push('close'), closeEmbeddedGate: () => embedded,
        leaveGateContext: () => calls.push('leave'), resume: () => calls.push('resume') });
    router.select('chars'); assert.equal(tab, 'chars'); assert.equal(elements.page.style.display, '');
    // 編成已併進角色管理頁，team 不再是獨立畫面，舊入口一律退回主頁。
    assert.equal(elements.home.style.display, 'none'); router.select('team');
    assert.equal(tab, 'home'); assert.equal(router.current(), 'home');
    router.select('chars');
    router.home(); assert.equal(tab, 'home'); assert.deepEqual(calls.slice(-3), ['close', 'leave', 'resume']);
    router.select('talents'); embedded = true; router.home(); assert.equal(tab, 'talents');
    embedded = false; router.select('unknown'); assert.equal(router.current(), 'home');
}
{
    let activeType = null, fever = false;
    const effect = TypeEffects.create({ isActive: type => type === activeType,
        getStat: () => 99, getTalent: () => 5, isFever: () => fever });
    assert.equal(effect.directBonus(), 0, '射擊車道未點滿時不給直擊加成');
    activeType = 'ranger';
    assert.equal(effect.directBonus(), .05); assert.equal(effect.beamWidth(true), 10);
    assert.equal(effect.weakWidth(), 8);
    assert.equal(effect.pfBonus('ranger'), .10); assert.equal(effect.pfBonus('knight'), 0);
    activeType = 'supporter';
    assert.equal(effect.gaugeMultiplier(), 1.25); fever = true;
    assert.equal(effect.attackMultiplier(), 2.5); assert.equal(effect.gaugeMultiplier(), 2); assert.equal(effect.shield(), .20);
    fever = false; activeType = 'knight';
    assert.equal(effect.floating(14, 0, 100), false); assert.equal(effect.floating(15, 0, 100), true);
    assert.equal(effect.lifeSteal(100000, 1000), 50); assert.ok(effect.gravity() >= .55);
    activeType = 'special';
    assert.equal(effect.weakDelay(1500), 400); assert.equal(effect.weakDelay(0), 1300);
    assert.equal(effect.enemyTimeScale(1000, 500), .45);
    activeType = 'fighter';
    assert.equal(effect.shockRadius(), 72); assert.equal(effect.shockMultiplier(), .47);
    assert.equal(effect.shockCritical(''), 0); assert.equal(effect.shockCritical('shockwave'), .15);
    activeType = null; assert.equal(effect.shockCritical('shockwave'), 0);
    assert.equal(effect.beamWidth(true), 0, '其他車道點滿不會讓射擊被動成立');
    assert.equal(effect.weakWidth(), 0, '弱點追蹤同樣只在射擊車道生效');
}
{
    const c = clock(); c.life.setPaused(true); c.elapse(1000); c.life.invalidate();
    c.state.nextCastAt = 3000; c.elapse(500); c.life.setPaused(false);
    assert.equal(c.state.nextCastAt, 3500, 'new encounters only inherit pause time after their creation');
}
{
    vm.runInContext(fs.readFileSync(path.join(root, 'asset/type-talents.js'), 'utf8'), ctx);
    vm.runInContext('typeTalentRanks = normalizeTypeTalentRanks({});', ctx);
    assert.equal(ctx.typeTalentTreeMaxed('knight'), false, '車道未點滿時被動不生效');
    vm.runInContext(`typeTalentRanks = normalizeTypeTalentRanks({ knight: Object.fromEntries(
        TYPE_TALENT_TREES.knight.branches.flatMap(branch => branch.nodes.map(node => [node.id, 5]))) });`, ctx);
    assert.equal(ctx.typeTalentTreeMaxed('knight'), true);
    assert.equal(ctx.typeTalentTreeMaxed('ranger'), false, '一條點滿不會讓其他車道一起成立');
    assert.equal(vm.runInContext('typeTalentSpent()', ctx), 30, '一條車道 6 節點 × 5 級');
    assert.deepEqual(JSON.parse(JSON.stringify(vm.runInContext('normalizeTypeTalentRanks({ warrior: { warrior_recovery: 5 } })', ctx))),
        { knight: {}, fighter: {}, ranger: {}, supporter: {}, special: {} }, '職業 key 的舊等級讀入即歸零');
    assert.equal(ctx.typeTalentTreeMaxed('warrior'), false, '職業 key 不認得');
}
console.log('PASS: battle phases, paused deadlines, canceled multihits, delayed/unique rewards, gate receipts, training isolation, page routes and attack-type effect bounds.');
