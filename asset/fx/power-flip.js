// Experimental Power Flip layer. Skills retain their own energy and cast queue.
const POWER_FLIP = { enabled: true, lockMs: 0, buffMs: 0, buffPct: 0 };
const POWER_FLIP_NAMES = GAME_DATA.skills.powerFlipNames;

function clearPowerFlip(b) {
    if (!b) return;
    b.powerFlip = null;
}
// Only a real upward flipper stroke can consume the team's combo.
function launchPowerFlip(b) {
    if (!POWER_FLIP.enabled || POWER_FLIP.lockMs > 0 || b.vy >= -80 || !PF.running || PF.paused) return;
    const lv = flipLevel();
    if (!lv || !PF.foe || enemy.hp <= 0) return;
    const member = PF.members.find(m => m.body === b && !m.down);
    const source = roster[teamIds[0]];
    if (!member || !source) return;
    clearPowerFlip(b);
    clearRangerPierce(member);
    const type = CHAR_TABLE[source.id].type;
    // 劍士在 15 Combo 以上發動 PF 時短暫浮游；仍會照常碰撞與反彈。
    if (typeEffects.active('knight') && combo >= 15) {
        b._knightFloatUntil = performance.now() + 1500;
        showPassiveFX('wind', b.x, b.y + 8, { follow: b, dy: 8, ms: 1500, behind: true });
    }
    const rangerPierce = typeEffects.active('ranger') && type === 'ranger';
    b.powerFlip = { type, lv, source, seq: PF.foeSeq, left: 1800, rangerPierce,
        pending: true, contacted: false, hits: 0, hitWait: 0, contactTarget: null };
    if (rangerPierce) {
        b._rangerPierceActive = true;
        b._rangerPierceUntil = performance.now() + 1800;
        b._rangerPierceSeq = PF.foeSeq;
        b._rangerPierceHitUnits = new Set();
        b.ball?.classList.add('pf-piercing');
        showPassiveFX('pierce', b.x, b.y, { follow: b, ms: 1800, rotateWithBody: true, rot: Math.atan2(b.vy, b.vx) });
    }
    combo = 0; comboAt = 0;
    POWER_FLIP.lockMs = 300;
    SFX.powerFlip(lv);
}

function powerFlipTargets() {
    return liveEnemies();
}
function powerFlipOwner(state) {
    return PF.members.find(m => m.ch === state.source && !m.down) || null;
}
function rangerPierceActive(member, now = performance.now()) {
    const b = member && member.body;
    const passivePierce = typeEffects.active('ranger') && b?._rangerPierceActive;
    const feverProc = FEVER.active && b?._feverPierceActive;
    if (!b || (!passivePierce && !feverProc)
        || b._rangerPierceSeq !== PF.foeSeq || now >= (b._rangerPierceUntil || 0)) return false;
    return true;
}
function clearRangerPierce(member) {
    const b = member && member.body;
    if (!b) return;
    b._rangerPierceUntil = 0;
    b._rangerPierceActive = false;
    b._rangerPierceSeq = -1;
    b._rangerPierceHitUnits = null;
    b._feverPierceActive = false;
    b.ball?.classList.remove('pf-piercing');
}
function rangerPierceOverlap(ball, target, isBoss = false) {
    if (isBoss) {
        const qx = Math.max(target.x - 70, Math.min(target.x + 70, ball.x));
        const qy = Math.max(target.y - 45, Math.min(target.y + 45, ball.y));
        return Math.hypot(ball.x - qx, ball.y - qy) < ball.r;
    }
    return Math.hypot(ball.x - target.x, ball.y - target.y) < ball.r + target.r;
}
function rangerPierceHit(member, target, speed, isBoss = false) {
    const b = member.body;
    if (!enemyUnitAlive(target) || !rangerPierceActive(member) || !rangerPierceOverlap(b, target, isBoss)) return false;
    if (!b._rangerPierceHitUnits) b._rangerPierceHitUnits = new Set();
    if (b._rangerPierceHitUnits.has(target)) return false;
    b._rangerPierceHitUnits.add(target);
    hitFoe(member, speed, target, { piercing: true });
    if (isBoss && enemyUnitAlive(target)) bossHitImpact(target);
    return true;
}
// 格鬥被動：碰撞後短暫冷卻，再對附近敵人補一段範圍衝擊；不做 hit-stop，避免看起來卡頓。
function triggerFighterShockwave(ch, target) {
    if (!typeEffects.active('fighter') || !ch || !target || !enemyUnitAlive(target)) return false;
    const now = performance.now();
    if (now < (ch._fighterShockReadyAt || 0)) return false;
    ch._fighterShockReadyAt = now + 550;
    const radius = typeEffects.shockRadius();
    powerFlipWeakCircle(target.x, target.y, radius, { seq: PF.foeSeq, source: ch });
    // 被動專屬的衝擊環：半徑跟實際判定同步，不再借用爆裂型的爆炸。
    showPassiveFX('shock', target.x, target.y, { scale: radius / 90 });
    for (const splash of powerFlipTargets()) {
        if (splash === target || Math.hypot(splash.x - target.x, splash.y - target.y) > radius + splash.r) continue;
        const shockCrit = rollCrit(ch, 'shockwave');
        const shock = Math.max(1, Math.round(atkOf(ch) * typeEffects.shockMultiplier()
            * (shockCrit ? CRIT_DMG : 1)));
        applyDamage(ch, shock, { target: splash, critical: shockCrit, cls: 'pf-damage', pf: true });
    }
    return true;
}
// PF 專屬弱點判定：只有攻擊型態範圍實際覆蓋到的弱點才會破。
function powerFlipWeakCircle(x, y, radius, state) {
    if (!PF.weak || PF.weak.seq !== state.seq) return 0;
    const owner = powerFlipOwner(state);
    let broken = 0;
    for (const w of PF.weak.nodes) {
        if (!w.hit && Math.hypot(w.x - x, w.y - y) <= radius + w.r) {
            hitWeak(w, owner);
            broken++;
        }
    }
    return broken;
}
function powerFlipWeakRay(x, y, ux, uy, length, width, state) {
    if (!PF.weak || PF.weak.seq !== state.seq) return 0;
    const owner = powerFlipOwner(state);
    let broken = 0;
    for (const w of PF.weak.nodes) {
        if (w.hit) continue;
        const dx = w.x - x, dy = w.y - y;
        const along = dx * ux + dy * uy;
        const across = Math.abs(dx * uy - dy * ux);
        if (along >= 0 && along <= length && across <= width + w.r) {
            hitWeak(w, owner);
            broken++;
        }
    }
    return broken;
}
// A separate damage path: no skill multiplier, skill gauge refund or unison cast.
function powerFlipDamage(state, target, mult) {
    if (!enemyUnitAlive(target) || state.seq !== PF.foeSeq || enemy.hp <= 0) return;
    const ch = state.source;
    const member = PF.members.find(m => m.ch === ch && m.body);
    const angle = member ? Math.atan2(target.y - member.body.y, target.x - member.body.x) : 0;
    // 範圍／射線型各自只播一次完整演出，避免每個命中目標都疊出重複特效。
    if (state.type !== 'special' && state.type !== 'ranger') {
        showPowerFlipVFX(state.type, target.x, target.y, angle, state.lv);
    }
    const crit = rollCrit(ch);
    const rangePierce = typeEffects.pfBonus(state.type);
    const damage = Math.max(1, Math.round(atkOf(ch) * mult * (1 + mainAccountBonus().powerFlipDamage + rangePierce) * (1 + .08 * talentRank(ch, 'pf')) *
        elementMultiplier(CHAR_TABLE[ch.id].element, enemy.element) * (crit ? CRIT_DMG : 1)));
    const dealt = applyDamage(ch, damage, { target, critical: crit, cls: 'pf-damage', combo: 1, pf: true });
    if (typeEffects.active('knight') && dealt > 0) {
        const owner = powerFlipOwner(state);
        if (owner && owner.ch.hp > 0) {
            const heal = typeEffects.lifeSteal(dealt, hpMax(owner.ch));
            if (heal > 0) owner.ch.hp = Math.min(hpMax(owner.ch), owner.ch.hp + heal);
        }
    }
    if (state.type === 'fighter' && typeEffects.active('fighter')) triggerFighterShockwave(ch, target);
    if (!crit) SFX.hit(1);
}
function powerFlipContact(m, target) {
    const state = m.body && m.body.powerFlip;
    if (!POWER_FLIP.enabled || !state || state.seq !== PF.foeSeq || state.contacted) return;
    state.contacted = true;
    state.contactTarget = target;
    if (state.type === 'fighter') {
        state.left = Math.min(state.left, 650);
        state.hitWait = 0;
    } else if (state.type === 'special') {
        // 特殊型：爆裂範圍內的弱點會同時擊破。
        const radius = 80 + state.lv * 35;
        showPowerFlipVFX('special', target.x, target.y, 0, state.lv, radius / 90);
        powerFlipWeakCircle(target.x, target.y, radius, state);
        for (const unit of enemyTargetsInRadius(target.x, target.y, radius)) {
            powerFlipDamage(state, unit, [0, 2.2, 3.4, 4.8][state.lv]);
        }
        clearPowerFlip(m.body);
    }
}
function updatePowerFlip(dtMs) {
    if (!POWER_FLIP.enabled || PF.paused || !PF.running || !PF.ready) return;
    POWER_FLIP.lockMs = Math.max(0, POWER_FLIP.lockMs - dtMs);
    POWER_FLIP.buffMs = Math.max(0, POWER_FLIP.buffMs - dtMs);
    if (!POWER_FLIP.buffMs) POWER_FLIP.buffPct = 0;
    for (const m of PF.members) {
        const b = m.body, state = b && b.powerFlip;
        if (!state) continue;
        if (m.down || state.seq !== PF.foeSeq || enemy.hp <= 0) { clearPowerFlip(b); clearRangerPierce(m); continue; }
        state.left -= dtMs; state.hitWait -= dtMs;
        if (state.left <= 0) { clearPowerFlip(b); clearRangerPierce(m); continue; }
        if (state.pending) {
            state.pending = false;
            if (state.type === 'supporter') {
                POWER_FLIP.buffPct = Math.max(POWER_FLIP.buffPct, [0, .10, .15, .20][state.lv] * (1 + .08 * talentRank(state.source, 'pf')));
                POWER_FLIP.buffMs = 5000;
                for (const x of aliveMembers()) {
                    addCd(x, [0, 3, 5, 7][state.lv]);
                    showPowerFlipVFX('supporter', x.body.x, x.body.y, 0, state.lv);
                }
                clearPowerFlip(b);
                continue;
            }
            if (state.type === 'ranger') {
                // 光束改瞄最近的活敵：球在彈跳中速度方向一直在變，沿球速放會亂射。
                const aim = powerFlipTargets()
                    .map(t => ({ t, d: Math.hypot(t.x - b.x, t.y - b.y) }))
                    .sort((a, z) => a.d - z.d)[0];
                const angle = aim ? Math.atan2(aim.t.y - b.y, aim.t.x - b.x) : Math.atan2(b.vy, b.vx);
                const ux = Math.cos(angle), uy = Math.sin(angle);
                const width = 12 + state.lv * 8
                    + typeEffects.beamWidth(true);
                // 射擊型：從球指向目標以長條光束掃過弱點。
                showPowerFlipVFX('ranger', b.x, b.y, angle, state.lv, 1, 760);
                powerFlipWeakRay(b.x, b.y, ux, uy, 760, width, state);
                const hits = powerFlipTargets().map(t => {
                    const dx = t.x - b.x, dy = t.y - b.y;
                    return { t, along: dx * ux + dy * uy, across: Math.abs(dx * uy - dy * ux) };
                }).filter(h => h.along >= 0 && h.along <= 760 && h.across <= h.t.r + width)
                  .sort((a, z) => a.along - z.along);
                for (const hit of hits) {
                    // 同一敵人已被光束命中時，不再由穿透球體重複計算一次 PF 傷害。
                    if (state.rangerPierce && b._rangerPierceHitUnits) b._rangerPierceHitUnits.add(hit.t);
                    powerFlipDamage(state, hit.t, [0, 2.0, 3.2, 4.6][state.lv]);
                }
                clearPowerFlip(b);
            }
        }
        if (state.type === 'knight' && state.hitWait <= 0 && state.hits < 2 + state.lv) {
            const range = 35 + state.lv * 18;
            const near = powerFlipTargets().filter(t => Math.hypot(t.x - b.x, t.y - b.y) <= t.r + b.r + range);
            if (near.length) {
                state.hits++; state.hitWait = 220;
                // 劍士型：每次旋刃以角色為中心掃過一圈，等級提高會擴大判定半徑。
                powerFlipWeakCircle(b.x, b.y, 34 + state.lv * 42, state);
                for (const unit of near) powerFlipDamage(state, unit, [0, .65, .85, 1.05][state.lv]);
            }
        } else if (state.type === 'fighter' && state.contacted && state.hitWait <= 0) {
            const target = state.contactTarget;
            if (!powerFlipTargets().includes(target)) { clearPowerFlip(b); continue; }
            state.hits++; state.hitWait = 85;
            // 格鬥型：連拳只命中接觸點附近，不會隔空掃到遠處弱點。
            powerFlipWeakCircle(target.x, target.y, 28 + state.lv * 5, state);
            powerFlipDamage(state, target, [0, .6, .75, .9][state.lv]);
        }
        if (state.hits >= 2 + state.lv) clearPowerFlip(b);
        if (enemy.hp <= 0) { checkKill(); break; }
    }
}
