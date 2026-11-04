// 主帳號的純養成公式；升級、扣點與存檔仍由遊戲流程負責。
window.ProgressionFormulas = Object.freeze({
    rankExpNeed(level) {
        const rule = GAME_DATA.progression.account;
        return rule.expBase + rule.expPerRank * Math.max(0, level - 1);
    },

    accountBonus(rankLevel) {
        const rule = GAME_DATA.progression.account;
        const rankPct = Math.min(rule.rankBonusCap, Math.max(0, rankLevel) * rule.rankBonusPerLevel);
        const ranksPastCritStart = rankLevel >= rule.critStartRank ? rankLevel - rule.critStartRank + 1 : 0;
        const critPct = Math.min(rule.critBonusCap, ranksPastCritStart * rule.critBonusPerLevel);
        return { atk: rankPct, hp: rankPct, skillDamage: 0, powerFlipDamage: 0, gauge: 0, crit: critPct };
    }
});
