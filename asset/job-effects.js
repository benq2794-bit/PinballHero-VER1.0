// 五職被動的啟用條件與數值集中管理；碰撞、VFX 與傷害出口由各戰鬥模組處理。
window.JobEffects = Object.freeze({
    create({ getJob, isActive, getStat, getTalent, isFever }) {
        const active = job => getJob() === job && isActive();
        return Object.freeze({
            active,
            attackMultiplier: () => active('priest') && isFever() ? 2 : 1,
            gaugeMultiplier: () => active('priest') ? (isFever() ? 2 : 1 + Math.min(.20, getStat('agi') * .002)) : 1,
            shield: () => active('priest') && isFever() ? Math.min(.18, getStat('vit') * .003) : 0,
            shockCritical: context => active('thief') && context === 'shockwave' ? Math.min(.25, getStat('luk') * .0015) : 0,
            directBonus: () => active('archer') ? Math.min(.30, getStat('dex') * .005) : 0,
            pfBonus: type => active('archer') && type === 'ranger'
                ? Math.min(.30, getStat('dex') * .005 + getTalent('archer_direct') * .01 + getTalent('archer_pierce') * .01) : 0,
            beamWidth: (pf = false) => active('archer') ? Math.min(24, getStat('int') * .8 + (pf ? getTalent('archer_beam') * 2 : 0)) : 0,
            floating: (combo, until, now) => active('warrior') && (combo >= 15 || until > now),
            gravity: () => Math.max(.55, .82 - getStat('agi') * .002),
            airDrag: base => Math.min(.9995, base + getStat('agi') * .00008),
            lifeSteal: (damage, maxHp) => active('warrior')
                ? Math.min(Math.ceil(maxHp * .05), Math.round(damage * Math.min(.05, .015 + getStat('str') * .0005))) : 0,
            shockRadius: () => Math.min(144, 58 + getStat('str') * 1.5 + getTalent('thief_shock_radius') * 2.8),
            shockMultiplier: () => Math.min(.82, .35 + getStat('str') * .005 + getTalent('thief_shock_damage') * .024),
            weakDelay: used => active('mage')
                ? Math.min(1500 - used, 300 + Math.min(500, getStat('int') * 12) + Math.min(250, getStat('luk') * 8)) : 0,
            enemyTimeScale: (until, now) => active('mage') && now < until ? .45 : 1
        });
    }
});
