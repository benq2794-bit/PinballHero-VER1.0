// 主帳號的純養成公式；升級、扣點與存檔仍由遊戲流程負責。
window.ProgressionFormulas = Object.freeze({
    rankExpNeed(level) {
        return 100 + 25 * Math.max(0, level - 1);
    },

    statValue(key, allocated, job) {
        return 1 + Math.max(0, Math.floor(+allocated || 0))
            + (job.major === key ? 2 : job.minor === key ? 1 : 0);
    },

    statNextCost(allocated) {
        return 1 + Math.floor(Math.max(0, +allocated || 0) / 10);
    },

    accountBonus(rankLevel, stats, job) {
        const rankPct = Math.min(.10, Math.max(0, rankLevel) * .001);
        const value = key => this.statValue(key, stats[key], job);
        return {
            atk: rankPct + value("str") * .004,
            hp: rankPct + value("vit") * .006,
            skillDamage: value("int") * .005,
            powerFlipDamage: value("dex") * .004,
            gauge: value("agi") * .003,
            crit: value("luk") * .0015
        };
    }
});
