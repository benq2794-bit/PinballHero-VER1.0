// Per-unit health; enemy.hp is only the HUD total, never a shared damage pool.
function enemyUnitAlive(unit) {
    return !!unit && !unit.defeated && (unit.foeSeq === undefined || unit.foeSeq === PF.foeSeq) &&
        (unit.hp === undefined || unit.hp > 0);
}
function liveEnemies() {
    const units = PF.enemyUnits && PF.enemyUnits.length ? PF.enemyUnits : [PF.foe, ...PF.extraFoes];
    return [...units, ...(PF.summonedFoes || [])].filter(enemyUnitAlive);
}
function initializeEnemyWave() {
    PF.enemyUnits = [PF.foe, ...PF.extraFoes];
    // Divide the previous wave budget among individuals, preserving overall difficulty.
    const total = Math.max(PF.enemyUnits.length, enemy.maxHp);
    const base = Math.floor(total / PF.enemyUnits.length), extra = total % PF.enemyUnits.length;
    PF.enemyUnits.forEach((unit, i) => {
        unit.hp = unit.maxHp = base + (i < extra ? 1 : 0);
        unit.defeated = false; unit.foeSeq = PF.foeSeq;
        unit.fighter = unit === PF.foe ? enemyF : unit.fighter;
        unit.homeX = unit.homeX === undefined ? unit.x : unit.homeX;
        unit.homeY = unit.homeY === undefined ? unit.y : unit.homeY;
        unit.kx = unit.ky = 0;
        unit.statusSlowUntil = 0; unit.statusStunUntil = 0; unit.statusDownUntil = 0; unit.statusGustFxUntil = 0;
        unit.statusParalyzeReady = 0; unit.statusGustReady = 0;
        unit.timer = Number.isFinite(unit.timer) ? unit.timer : 4.5;
        unit.attackCooldown = Number.isFinite(unit.attackCooldown) ? unit.attackCooldown : 10;
        unit.diving = false; unit.target = null;
    });
    enemy.maxHp = total;
    refreshEnemyWave();
}
function refreshEnemyWave() {
    // 召喚物可被技能選取與擊殺，但不併入塔 Boss 的血量，也不會延長普通波次。
    const units = (PF.enemyUnits && PF.enemyUnits.length ? PF.enemyUnits : [PF.foe, ...PF.extraFoes])
        .filter(enemyUnitAlive);
    enemy.hp = units.reduce((sum, unit) => sum + Math.max(0, unit.hp || 0), 0);
    if (units.length && !enemyUnitAlive(PF.foe)) {
        PF.foe = units[0]; enemyF = PF.foe.fighter;
        PF.foe.fixed = false; PF.foe.diving = false;
        PF.foe.timer = Math.max(1.8, PF.foe.timer || 0);
    }
    PF.extraFoes = units.filter(unit => unit !== PF.foe);
    return units;
}
function damageEnemyUnit(target, amount) {
    if (!enemyUnitAlive(target)) return 0;
    const dealt = Math.min(target.hp, Math.max(0, Math.round(amount)));
    target.hp -= dealt;
    if (target.hp <= 0) {
        target.hp = 0; target.defeated = true;
        if (target.fighter) { clearTimeout(target.fighter.timer); target.fighter.timer = null; }
        // 死亡動畫要 300ms 才收，先把定位從 transform 換到 left/top，class 上的 keyframes 才不會把怪搬回場原點。
        target.node.style.left = target.x + "px";
        target.node.style.top = target.y + "px";
        target.node.style.transform = "none";
        target.node.classList.add("dying");
        SFX.foeDown(target.isBossUnit || (target === PF.foe && enemy.boss));
        const deathMs = target.defeatMotion?.() || 300;
        setTimeout(() => target.node.remove(), deathMs);
    }
    refreshEnemyWave();
    return dealt;
}
function enemyTargetsInRadius(x, y, radius) {
    return liveEnemies().filter(unit => Math.hypot(unit.x - x, unit.y - y) <= radius + unit.r);
}
function enemyTargetsOnRay(x, y, angle, length, width) {
    const ux = Math.cos(angle), uy = Math.sin(angle);
    return liveEnemies().map(unit => {
        const dx = unit.x - x, dy = unit.y - y;
        return { unit, along: dx * ux + dy * uy, across: Math.abs(dx * uy - dy * ux) };
    }).filter(hit => hit.along >= -hit.unit.r && hit.along <= length + hit.unit.r && hit.across <= width + hit.unit.r)
      .sort((a, b) => a.along - b.along).map(hit => hit.unit);
}
