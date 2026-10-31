const COLLISION_TRIAL = { enabled: true, dashLeft: 0, dashCooldown: 1200 };

// Place the ball above the actual capsule surface, including near a wall.
function stabilizeFlipperExit(b, f, qx, qy, nx, ny, swinging) {
    if (!COLLISION_TRIAL.enabled || (!swinging && b.y > qy)) return;
    const radius = b.r + f.rad + 2;
    b.x = Math.max(b.r + 13, Math.min(W - b.r - 13, b.x));
    const horizontal = b.x - qx;
    if (Math.abs(horizontal) < radius) {
        b.y = Math.min(b.y, qy - Math.sqrt(radius * radius - horizontal * horizontal));
    }
    if ((b.exitLockMs || 0) > 0) return;
    const towardCenter = f.side === 'l' ? 1 : -1;
    if (swinging) {
        // Keep the paddle's angular aim while preventing a horizontal or downward launch.
        b.vx = Math.max(-550, Math.min(550, b.vx));
        if (Math.abs(b.vx) < 160 || b.x < 65 || b.x > W - 65) b.vx = towardCenter * 220;
        b.vy = -Math.max(680, Math.min(1100, Math.abs(b.vy)));
    } else if (Math.hypot(b.vx, b.vy) < 230) {
        b.vx = towardCenter * 170;
        b.vy = Math.min(b.vy, -260);
    }
    b.exitLockMs = 100;
}

// Physical separation happens on every contact. A hit requires a fresh entry,
// with a small separation margin so contact jitter cannot farm damage or combo.
function collideEnemyTrial(m, target, boss, now) {
    const b = m.body;
    if (b.enemyContactSeq !== PF.foeSeq) {
        b.enemyContacts = new Map(); b.enemyContactSeq = PF.foeSeq;
    }
    let contact = b.enemyContacts.get(target);
    if (!contact) { contact = { touching: false, lastHit: -Infinity }; b.enemyContacts.set(target, contact); }
    let dx = target.x - b.x, dy = target.y - b.y;
    const distance = Math.hypot(dx, dy), radius = b.r + target.r;
    if (distance >= radius) {
        if (distance >= radius + 4) contact.touching = false;
        return null;
    }
    if (distance < .0001) {
        const speed = Math.hypot(b.vx, b.vy);
        dx = speed > 1 ? b.vx / speed : 0;
        dy = speed > 1 ? b.vy / speed : -1;
    } else { dx /= distance; dy /= distance; }
    if (!b.partyFollower) {
        const overlap = radius - distance + .5;
        const enemyShare = target.fixed || boss ? 0 : .30;
        b.x -= dx * overlap * (1 - enemyShare);
        b.y -= dy * overlap * (1 - enemyShare);
        if (enemyShare) { target.x += dx * overlap * enemyShare; target.y += dy * overlap * enemyShare; }
        const toward = (b.vx - (target.vx || 0)) * dx + (b.vy - (target.vy || 0)) * dy;
        if (toward > 0) {
            const impulse = (1 + (boss ? .78 : .62)) * toward;
            b.vx -= impulse * dx; b.vy -= impulse * dy;
        }
    }
    const canDamage = !contact.touching && now - contact.lastHit >= 180;
    contact.touching = true;
    if (canDamage) contact.lastHit = now;
    return { nx: dx, ny: dy, canDamage };
}

function airDashAvailable() {
    const frame = $('pf-frame');
    return COLLISION_TRIAL.enabled && PF.running && PF.ready && !PF.paused &&
        COLLISION_TRIAL.dashLeft <= 0 && (!frame || frame.style.display !== 'none');
}
function triggerAirDash() {
    if (!airDashAvailable() || !PF.foe || enemy.hp <= 0) return false;
    const targets = [...liveEnemies(),
        ...(PF.weak ? PF.weak.nodes.filter(w => !w.hit) : [])];
    let used = false;
    for (const m of partyMovers()) {
        const b = m.body;
        // Let a paddle launch or an active PF finish before correcting its route.
        if (b.y >= H - 160 || b.y < 100 || b.dashActiveMs > 0 || b.exitLockMs > 0 || b.powerFlip) continue;
        const candidates = targets.filter(t => {
            const distance = Math.hypot(t.x - b.x, t.y - b.y);
            return t.y < b.y - 20 && distance >= 80 && distance <= 480;
        });
        const target = candidates.reduce((best, t) => !best || Math.hypot(t.x - b.x, t.y - b.y) < Math.hypot(best.x - b.x, best.y - b.y) ? t : best, null);
        if (!target) continue;
        const dx = target.x - b.x, dy = target.y - b.y, distance = Math.hypot(dx, dy);
        if (distance < 1) continue;
        const speed = Math.hypot(b.vx, b.vy);
        const alignment = speed > 1 ? (b.vx * dx + b.vy * dy) / (speed * distance) : 0;
        // Use the cooldown to recover a falling, slow or off-course ball, rather
        // than interrupting one that is already flying straight at its target.
        if (b.vy <= 100 && speed >= 450 && alignment >= .55) continue;
        b.vx = dx / distance * 1050; b.vy = dy / distance * 1050;
        b.dashActiveMs = 150;
        b.ball.classList.add('air-dashing');
        FX.sparks(b.x, b.y, '#bdeaff', 5);
        used = true;
    }
    if (used) { COLLISION_TRIAL.dashLeft = COLLISION_TRIAL.dashCooldown; SFX.launch(); }
    return used;
}
function updateCollisionTrial(dtMs) {
    if (!COLLISION_TRIAL.enabled || PF.paused || !PF.running || !PF.ready) return;
    COLLISION_TRIAL.dashLeft = Math.max(0, COLLISION_TRIAL.dashLeft - dtMs);
    for (const m of PF.members) {
        const b = m.body;
        if (!b) continue;
        b.exitLockMs = Math.max(0, (b.exitLockMs || 0) - dtMs);
        b.dashActiveMs = Math.max(0, (b.dashActiveMs || 0) - dtMs);
        if (!b.dashActiveMs) b.ball.classList.remove('air-dashing');
    }
    triggerAirDash();
}
