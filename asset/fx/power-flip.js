// Experimental Power Flip layer. Skills retain their own energy and cast queue.
const POWER_FLIP = { enabled: true, lockMs: 0, buffMs: 0, buffPct: 0 };
const POWER_FLIP_NAMES = { knight: '旋刃', fighter: '連拳', ranger: '貫光', special: '爆裂', supporter: '應援' };

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
    const type = CHAR_TABLE[source.id].type;
    b.powerFlip = { type, lv, source, seq: PF.foeSeq, left: 1800,
        pending: true, contacted: false, hits: 0, hitWait: 0, contactTarget: null };
    combo = 0; comboAt = 0;
    POWER_FLIP.lockMs = 300;
    SFX.impact(.6 + lv * .25, { snap: .012, body: 230, ring: .05, vol: .7 });
}

function powerFlipTargets() {
    return liveEnemies();
}
// A separate damage path: no skill multiplier, skill gauge refund or unison cast.
function powerFlipDamage(state, target, mult) {
    if (!enemyUnitAlive(target) || state.seq !== PF.foeSeq || enemy.hp <= 0) return;
    const ch = state.source;
    const crit = rollCrit(ch);
    const damage = Math.max(1, Math.round(atkOf(ch) * mult * (1 + .08 * talentRank(ch, 'pf')) *
        deepElementMultiplier(CHAR_TABLE[ch.id].element, enemy.element) * (crit ? CRIT_DMG : 1)));
    applyDamage(ch, damage, { target, critical: crit, cls: 'pf-damage', combo: 1 });
    if (crit) SFX.critical(); else SFX.hit(1);
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
        for (const unit of enemyTargetsInRadius(target.x, target.y, 80 + state.lv * 35)) {
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
        if (m.down || state.seq !== PF.foeSeq || enemy.hp <= 0) { clearPowerFlip(b); continue; }
        state.left -= dtMs; state.hitWait -= dtMs;
        if (state.left <= 0) { clearPowerFlip(b); continue; }
        if (state.pending) {
            state.pending = false;
            if (state.type === 'supporter') {
                POWER_FLIP.buffPct = Math.max(POWER_FLIP.buffPct, [0, .10, .15, .20][state.lv] * (1 + .08 * talentRank(state.source, 'pf')));
                POWER_FLIP.buffMs = 5000;
                for (const x of aliveMembers()) {
                    addCd(x, [0, 3, 5, 7][state.lv]);
                }
                clearPowerFlip(b);
                continue;
            }
            if (state.type === 'ranger') {
                const angle = Math.atan2(b.vy, b.vx), ux = Math.cos(angle), uy = Math.sin(angle);
                const width = 12 + state.lv * 8;
                const hits = powerFlipTargets().map(t => {
                    const dx = t.x - b.x, dy = t.y - b.y;
                    return { t, along: dx * ux + dy * uy, across: Math.abs(dx * uy - dy * ux) };
                }).filter(h => h.along >= 0 && h.along <= 760 && h.across <= h.t.r + width)
                  .sort((a, z) => a.along - z.along);
                for (const hit of hits) powerFlipDamage(state, hit.t, [0, 2.0, 3.2, 4.6][state.lv]);
                clearPowerFlip(b);
            }
        }
        if (state.type === 'knight' && state.hitWait <= 0 && state.hits < 2 + state.lv) {
            const range = 35 + state.lv * 18;
            const near = powerFlipTargets().filter(t => Math.hypot(t.x - b.x, t.y - b.y) <= t.r + b.r + range);
            if (near.length) {
                state.hits++; state.hitWait = 220;
                for (const unit of near) powerFlipDamage(state, unit, [0, .65, .85, 1.05][state.lv]);
            }
        } else if (state.type === 'fighter' && state.contacted && state.hitWait <= 0) {
            const target = state.contactTarget;
            if (!powerFlipTargets().includes(target)) { clearPowerFlip(b); continue; }
            state.hits++; state.hitWait = 85;
            powerFlipDamage(state, target, [0, .6, .75, .9][state.lv]);
        }
        if (state.hits >= 2 + state.lv) clearPowerFlip(b);
        if (enemy.hp <= 0) { checkKill(); break; }
    }
}
