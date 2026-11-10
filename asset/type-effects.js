// 五種攻擊型態的被動條件與數值集中管理；碰撞、VFX 與傷害出口由各戰鬥模組處理。
window.TypeEffects = Object.freeze({
    create({ isActive, getTalent, isFever }) {
        const active = type => isActive(type);
        return Object.freeze({
            active,
            attackMultiplier: () => active('supporter') && isFever() ? 2 + getTalent('supporter_fever_attack') * .1 : 1,
            gaugeMultiplier: () => active('supporter') ? (isFever() ? 2 : 1 + getTalent('supporter_gauge') * .05) : 1,
            feverStartGauge: () => active('supporter') ? getTalent('supporter_energy') * 3 : 0,
            shield: () => active('supporter') && isFever() ? Math.min(.20, getTalent('supporter_fever_shield') * .04) : 0,
            shockCritical: context => active('fighter') && context === 'shockwave' ? Math.min(.25, getTalent('fighter_crit') * .03) : 0,
            shockCooldown: () => Math.max(50, 550 - getTalent('fighter_cooldown') * 100),
            shockCombo: () => active('fighter') ? getTalent('fighter_combo') : 0,
            directBonus: () => active('ranger') ? Math.min(.30, getTalent('ranger_direct') * .01) : 0,
            directCritical: context => active('ranger') && context === 'direct' ? getTalent('ranger_crit') * .02 : 0,
            pfBonus: pfType => active('ranger') && pfType === 'ranger'
                ? Math.min(.30, getTalent('ranger_direct') * .01 + getTalent('ranger_pierce') * .01) : 0,
            beamWidth: (pf = false) => active('ranger') ? Math.min(24, pf ? getTalent('ranger_beam') * 2 : 0) : 0,
            weakWidth: () => active('ranger') ? Math.min(8, getTalent('ranger_weak') * 1.6) : 0,
            floating: (combo, until, now) => active('knight') && (combo >= 15 || until > now),
            floatMs: () => 1500 + getTalent('knight_float_time') * 350,
            gravity: () => .82 - getTalent('knight_float_gravity') * .08,
            airDrag: base => base,
            lifeSteal: (damage, maxHp) => active('knight')
                ? Math.min(Math.ceil(maxHp * (5 + getTalent('knight_recovery_cap') * 2) / 100), Math.round(damage * Math.min(.05, .015 + getTalent('knight_recovery') * .01))) : 0,
            pfDamageBonus: () => active('knight') ? getTalent('knight_pf_damage') * .05 : 0,
            shockRadius: () => Math.min(144, 58 + getTalent('fighter_shock_radius') * 2.8),
            shockMultiplier: () => Math.min(.82, .35 + getTalent('fighter_shock_damage') * .024),
            weakDelay: used => active('special')
                ? Math.max(0, Math.min(1500 + getTalent('special_slow_cap') * 80 - used, 300 + getTalent('special_slow_time') * 200)) : 0,
            enemyTimeScale: (until, now) => active('special') && now < until ? .45 : 1,
            skillDamageBonus: () => active('special') ? getTalent('special_skill_damage') * .02 : 0,
            burstScale: () => active('special') ? 1 + getTalent('special_burst_radius') * .12 : 1,
            weakRadiusBonus: () => active('special') ? getTalent('special_weak_width') * 2 : 0,
            clearHeal: () => active('supporter') ? getTalent('supporter_heal') * .03 : 0
        });
    }
});
