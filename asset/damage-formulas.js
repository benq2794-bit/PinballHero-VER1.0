// 純數值公式集中區：只計算數值，不碰戰鬥狀態、動畫或日誌。
window.DamageFormulas = Object.freeze({
    afterOutgoingModifiers(amount, scale, isBroken, breakTaken) {
        let damage = Math.round(Math.max(0, Number(amount) || 0) * scale);
        if (isBroken) damage = Math.round(damage * breakTaken);
        return damage;
    },

    receivedDamage(amount, passiveShield, survivalRank) {
        const reduced = Math.round(amount
            * Math.max(.4, 1 - passiveShield)
            * (1 - .01 * survivalRank));
        return Math.max(1, reduced);
    },

    criticalRate(baseRate, leaderBonus, accountBonus, passiveBonus, maxRate) {
        return Math.min(maxRate, Math.max(0, baseRate + leaderBonus + accountBonus + passiveBonus));
    },

    skillDamage({ attack, multiplier, skillRank, accountSkillBonus, elementMultiplier, criticalMultiplier, dot }) {
        const talent = dot ? 1 : (1 + .06 * skillRank) * (1 + accountSkillBonus);
        return Math.max(1, Math.round(attack * multiplier * talent * elementMultiplier * criticalMultiplier));
    }
});
