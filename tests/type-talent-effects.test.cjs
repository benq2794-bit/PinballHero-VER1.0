const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const pfSource = fs.readFileSync(path.join(root, 'asset/fx/power-flip.js'), 'utf8');
const teSource = fs.readFileSync(path.join(root, 'asset/type-effects.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

function effects(ranks = {}, active = true, fever = false) {
    const ctx = { window: {} };
    vm.createContext(ctx);
    vm.runInContext(teSource, ctx);
    return ctx.window.TypeEffects.create({ isActive: () => active, getTalent: id => ranks[id] || 0, isFever: () => fever });
}

// 11 顆先前只有宣告的天賦：逐顆驗證等級 0／3／5 的數值出口與被動未啟用時的歸零。
{
    const r0 = effects(), r3 = effects({
        knight_float_time: 3, knight_float_gravity: 3, knight_recovery: 5, knight_recovery_cap: 3, knight_pf_damage: 3,
        fighter_cooldown: 3, fighter_combo: 3, ranger_crit: 3,
        special_skill_damage: 3, special_burst_radius: 3, special_weak_width: 3, supporter_heal: 3
    }), r5 = effects({
        knight_float_time: 5, knight_float_gravity: 5, knight_recovery: 5, knight_recovery_cap: 5, knight_pf_damage: 5,
        fighter_cooldown: 5, fighter_combo: 5, ranger_crit: 5,
        special_skill_damage: 5, special_burst_radius: 5, special_weak_width: 5, supporter_heal: 5
    }), off = effects({ knight_pf_damage: 5, fighter_combo: 5, ranger_crit: 5, special_skill_damage: 5, supporter_heal: 5 }, false);
    assert.equal(r0.floatMs(), 1500); assert.equal(r3.floatMs(), 2550); assert.equal(r5.floatMs(), 3250);
    close(r0.gravity(), .82); close(r3.gravity(), .58); close(r5.gravity(), .42);
    assert.equal(r0.lifeSteal(1e6, 1000), 50); assert.equal(r3.lifeSteal(1e6, 1000), 110); assert.equal(r5.lifeSteal(1e6, 1000), 150);
    assert.equal(r0.pfDamageBonus(), 0); close(r3.pfDamageBonus(), .15); close(r5.pfDamageBonus(), .25); assert.equal(off.pfDamageBonus(), 0);
    assert.equal(r0.shockCooldown(), 550); assert.equal(r3.shockCooldown(), 250); assert.equal(r5.shockCooldown(), 50);
    assert.equal(r0.shockCombo(), 0); assert.equal(r3.shockCombo(), 3); assert.equal(off.shockCombo(), 0);
    assert.equal(r0.directCritical('direct'), 0); close(r3.directCritical('direct'), .06); close(r5.directCritical('direct'), .10);
    assert.equal(r3.directCritical('shockwave'), 0); assert.equal(off.directCritical('direct'), 0);
    assert.equal(r0.skillDamageBonus(), 0); close(r3.skillDamageBonus(), .06); close(r5.skillDamageBonus(), .10); assert.equal(off.skillDamageBonus(), 0);
    close(r0.burstScale(), 1); close(r3.burstScale(), 1.36); close(r5.burstScale(), 1.6); assert.equal(off.burstScale(), 1);
    assert.equal(r0.weakRadiusBonus(), 0); assert.equal(r3.weakRadiusBonus(), 6); assert.equal(r5.weakRadiusBonus(), 10); assert.equal(off.weakRadiusBonus(), 0);
    assert.equal(r0.clearHeal(), 0); close(r3.clearHeal(), .09); close(r5.clearHeal(), .15); assert.equal(off.clearHeal(), 0);
    // 既有 14 顆的回歸：rank0 行為不變。
    const fever = effects({ supporter_fever_attack: 3, supporter_fever_shield: 3, special_slow_time: 3 }, true, true);
    close(fever.attackMultiplier(), 2.3); close(fever.shield(), .12); assert.equal(fever.gaugeMultiplier(), 2);
    assert.equal(fever.weakDelay(0), 900);
}

function setup(type, ranks = {}, combo = 39) {
    const noop = () => {};
    const ball = { classList: { add: noop, remove: noop }, style: { setProperty: noop } };
    const body = { x: 210, y: 500, vx: 0, vy: -600, r: 20, ball };
    const ch = { id: 'leader', hp: 100, gauge: 42 };
    const member = { ch, body, down: false };
    const foe = { x: 210, y: 200, r: 30 };
    const hits = [];
    const sprites = [], wallImpacts = [];
    const ctx = { combo, comboAt: 1, teamIds: ['leader'], roster: { leader: ch },
        CHAR_TABLE: { leader: { type, element: 'fire' } }, ELEMENTS: { fire: { color: '#f00' } },
        PF: { running: true, paused: false, ready: true, members: [member], foe, extraFoes: [], foeSeq: 1 },
        enemy: { hp: 1000000000 }, CRIT_DMG: 1.5, rollCrit: () => false, atkOf: () => 100, talentRank: () => 0,
        COLLISION_TRIAL: { enabled: true },
        PowerFlipVFX: { impact: (type, x, y, level, options) => wallImpacts.push({ type, x, y, level, options: { ...options } }) },
        checkKill: noop, updateUI: noop, saveGame: noop, hpMax: () => 1000,
        $: () => null, aliveMembers: () => [member], addCd: (m, n) => { m.ch.gauge += n; },
        bumpCombo: n => { ctx.combo += n; }, hitWeak: w => { w.hit = true; },
        FX: Object.fromEntries(['pop', 'art', 'bloom', 'laser'].map(k => [k, noop]).concat([['sprite', (x, y, kind) => sprites.push({ x, y, kind })]])),
        SFX: Object.fromEntries(['impact', 'critical', 'hit', 'powerFlip', 'lifeSteal'].map(k => [k, noop])) };
    ctx.applyDamage = (who, damage, opt) => { hits.push({ who, damage, target: opt.target }); ctx.combo += opt.combo || 0; return damage; };
    ctx.flipLevel = () => [9, 15, 39].filter(n => ctx.combo >= n).length;
    ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(root, 'asset/game-data.js'), 'utf8'), ctx);
    ctx.performance = { now: () => 0 }; ctx.elementMultiplier = () => 1;
    ctx.mainAccountBonus = () => ({ powerFlipDamage: 0 });
    ctx.showPowerFlipVFX = noop; ctx.showPassiveFX = noop; ctx.showPassiveHitFeedback = noop;
    vm.runInContext(teSource, ctx);
    ctx.typeEffects = ctx.TypeEffects.create({ isActive: () => true, getTalent: id => ranks[id] || 0, isFever: () => false });
    vm.runInContext(fs.readFileSync(path.join(root, 'asset/enemy-wave.js'), 'utf8') + pfSource, ctx);
    return { ctx, member, body, hits, ch, sprites, wallImpacts };
}

// 劍士：浮游時間、單次回復上限、PF 傷害加成實際進入 launch／lifeSteal／powerFlipDamage。
{
    const a = setup('knight', { knight_recovery: 5 });
    const b = setup('knight', { knight_recovery: 5, knight_recovery_cap: 3, knight_float_time: 3, knight_pf_damage: 3 });
    a.ctx.launchPowerFlip(a.body); b.ctx.launchPowerFlip(b.body);
    assert.equal(a.body._knightFloatUntil, 1500);
    assert.equal(b.body._knightFloatUntil, 2550);
    a.ctx.atkOf = () => 1e6; b.ctx.atkOf = () => 1e6;
    a.ctx.powerFlipDamage(a.body.powerFlip, a.ctx.PF.foe, 1);
    b.ctx.powerFlipDamage(b.body.powerFlip, b.ctx.PF.foe, 1);
    assert.equal(a.hits[0].damage, 1000000);
    assert.equal(b.hits[0].damage, 1150000, 'knight_pf_damage raises real PF damage');
    assert.equal(a.ch.hp, 150, 'lifeSteal capped at 5% maxHp without cap talent');
    assert.equal(b.ch.hp, 210, 'knight_recovery_cap raises the per-hit heal cap');
}
// 格鬥：衝擊冷卻與額外 Combo 實際進入 triggerFighterShockwave。
{
    const a = setup('fighter');
    const b = setup('fighter', { fighter_cooldown: 3, fighter_combo: 2 });
    for (const s of [a, b]) { s.ctx.launchPowerFlip(s.body); s.ctx.powerFlipContact(s.member, s.ctx.PF.foe); s.ctx.updatePowerFlip(70); }
    assert.equal(a.ch._fighterShockReadyAt, 550);
    assert.equal(b.ch._fighterShockReadyAt, 250, 'fighter_cooldown shortens the shock cooldown');
    assert.equal(a.ctx.combo, 1);
    assert.equal(b.ctx.combo, 3, 'fighter_combo adds combo per shock');
}
// 特殊：爆裂範圍實際擴大到原本搆不到的敵人。
{
    const a = setup('special', {}, 9);
    const b = setup('special', { special_burst_radius: 3 }, 9);
    for (const s of [a, b]) {
        s.ctx.PF.extraFoes = [{ x: 210, y: 360, r: 30, foeSeq: 1, hp: 500 }];
        s.ctx.launchPowerFlip(s.body); s.ctx.powerFlipContact(s.member, s.ctx.PF.foe);
    }
    assert.equal(a.hits.length, 1, 'rank0 burst misses the far unit');
    assert.equal(b.hits.length, 2, 'special_burst_radius reaches the far unit');
}
// 特殊：弱點洞察實際放寬 PF 圓形／射線弱點判定。
{
    const circle = ranks => {
        const s = setup('special', ranks);
        s.ctx.PF.weak = { seq: 1, nodes: [{ x: 210, y: 268, r: 15, hit: false }] };
        return s.ctx.powerFlipWeakCircle(210, 200, 50, { seq: 1, source: s.ch });
    };
    const ray = ranks => {
        const s = setup('special', ranks);
        s.ctx.PF.weak = { seq: 1, nodes: [{ x: 240, y: 300, r: 15, hit: false }] };
        return s.ctx.powerFlipWeakRay(210, 200, 0, 1, 760, 12, { seq: 1, source: s.ch });
    };
    assert.equal(circle({}), 0); assert.equal(circle({ special_weak_width: 3 }), 1);
    assert.equal(ray({}), 0); assert.equal(ray({ special_weak_width: 3 }), 1);
}
// PF 撞牆回饋：只有 PF 進行中的球補接觸點特效，一般球與過期 PF 不補。
for (const type of ['knight', 'fighter', 'ranger', 'special', 'supporter']) {
    for (const [combo, level] of [[9, 1], [15, 2], [39, 3]]) {
        const s = setup(type, {}, combo);
        s.ctx.powerFlipWallContact(s.body, 12, 500);
        assert.equal(s.wallImpacts.length, 0, 'no PF charge: dedicated wall impact stays silent');
        assert.equal(s.sprites.length, 0, 'no PF charge: generic sprites stay silent');
        s.ctx.launchPowerFlip(s.body);
        const state = s.body.powerFlip;
        s.ctx.powerFlipWallContact(s.body, 12, 500);
        assert.deepEqual(s.wallImpacts, [{ type, x: 12, y: 500, level, options: { wall: true } }]);
        s.body.x = 418; s.body.y = 321;
        s.ctx.powerFlipWallContact(s.body);
        assert.deepEqual(s.wallImpacts[1], { type, x: 418, y: 321, level, options: { wall: true } }, 'default contact follows the real body');
        assert.equal(s.body.powerFlip, state, 'wall feedback does not consume the PF state');
        assert.equal(state.hits, 0, 'wall feedback does not fabricate a combat hit');
        assert.equal(s.hits.length, 0, 'wall feedback deals no damage');
        assert.equal(s.ctx.combo, 0, 'wall feedback grants no combo');
        s.ctx.PF.foeSeq++;
        s.ctx.powerFlipWallContact(s.body, 12, 500);
        assert.equal(s.wallImpacts.length, 2, 'stale-wave PF charge stays silent');
        assert.equal(s.sprites.length, 0, 'PF walls never fall back to generic FX.sprite');
    }
}
// PF 發射速度保底：實驗開啟不疊加修正；關閉時只補到 PF 門檻以上。
{
    const s = setup('knight');
    s.body.vy = -100; s.ctx.powerFlipSupportLaunchSpeed(s.body);
    assert.equal(s.body.vy, -100, 'trial on: stabilizer owns the exit speed');
    s.ctx.COLLISION_TRIAL.enabled = false;
    s.body.vy = -50; s.ctx.powerFlipSupportLaunchSpeed(s.body);
    assert.equal(s.body.vy, -680, 'trial off: slow launch gets the PF floor');
    s.body.vy = -900; s.ctx.powerFlipSupportLaunchSpeed(s.body);
    assert.equal(s.body.vy, -900, 'already-fast launch untouched');
}
// index.html 掛點：暴擊 context、技能倍率、技能弱點範圍、球撞弱點半徑、過關回復、PF VFX 引用有效。
for (const re of [
    /typeEffects\.shockCritical\(context\) \+ typeEffects\.directCritical\(context\)/,
    /const crit = rollCrit\(m\.ch, 'direct'\)/,
    /multiplier: mult \* \(1 \+ typeEffects\.skillDamageBonus\(\)\)/,
    /const weakBonus = typeEffects\.weakRadiusBonus\(\)/,
    /b\.r \+ w\.r \+ typeEffects\.weakRadiusBonus\(\)/,
    /const healPct = 0\.25 \+ typeEffects\.clearHeal\(\)/,
    /const prayerPct = typeEffects\.clearHeal\(\)/
]) assert.match(html, re);
assert.ok(html.includes('asset/fx/power-flip-vfx.js') && fs.existsSync(path.join(root, 'asset/fx/power-flip-vfx.js')), 'PF VFX reference resolves to the real canvas module');
assert.match(pfSource, /function powerFlipWallContact\(b, x = b\.x, y = b\.y\)/, 'step() wall-contact callee exists');
for (const file of ['asset/fx/power-flip.js', 'asset/type-effects.js']) new Function(fs.readFileSync(path.join(root, file), 'utf8'));
for (const block of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new Function(block[1]);
console.log('PASS: 11 ghost talents wired — rank 0/3/5 value matrix, inactive zeroing, PF float/heal cap/damage, shock cooldown/combo, burst radius, weak circle/ray, dedicated PF wall impacts (no generic sprites), index.html hook anchors and syntax.');