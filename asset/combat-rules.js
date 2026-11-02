// Shared combat math. Damage entry points build their own base hit, then these
// two functions apply the common outgoing/incoming modifiers exactly once.
function combatDamageAfterModifiers(source, amount, now = performance.now()) {
    return DamageFormulas.afterOutgoingModifiers(amount, DMG_SCALE, now < PF.breakUntil, BREAK_TAKEN);
}

function combatDamageReceivedBy(member, amount, sourceElement = null) {
    const jobShield = mainAccountJob === 'priest' && isJobPassiveActive() && FEVER.active
        ? Math.min(.18, jobPassiveStat('vit') * .003) : 0;
    return DamageFormulas.receivedDamage(amount, jobShield, talentRank(member.ch, 'survival'));
}
