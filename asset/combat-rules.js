// Shared combat math. Damage entry points build their own base hit, then these
// two functions apply the common outgoing/incoming modifiers exactly once.
function combatDamageAfterModifiers(source, amount, now = performance.now()) {
    const breakTaken = gateOn() && !TRAINING_MODE
        ? (PF.bossEnraged ? 2 : 1.8)
        : BREAK_TAKEN;
    return DamageFormulas.afterOutgoingModifiers(amount, DMG_SCALE, now < PF.breakUntil, breakTaken);
}

function combatDamageReceivedBy(member, amount, sourceElement = null) {
    const defenderElement = CHAR_TABLE[member.ch.id]?.element;
    const elementalDamage = sourceElement && defenderElement
        ? Math.round(amount * enemyDamageMultiplier(sourceElement, defenderElement))
        : amount;
    const passiveShield = typeEffects.shield();
    return DamageFormulas.receivedDamage(elementalDamage, passiveShield, talentRank(member.ch, 'survival'));
}
