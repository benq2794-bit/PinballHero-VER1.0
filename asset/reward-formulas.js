// 獎勵數量公式；實際發獎、存檔與日誌由擊殺結算流程處理。
window.RewardFormulas = Object.freeze({
    splitExperience(total, recipientCount) {
        const count = Math.max(0, Math.floor(recipientCount));
        const amount = Math.max(0, total);
        return {
            share: count ? Math.floor(amount / count) : 0,
            extra: count ? amount % count : 0
        };
    },

    randomInRange(range, randomValue = Math.random()) {
        const min = Math.max(0, Math.floor(range[0]));
        const max = Math.max(min, Math.floor(range[1]));
        return min + Math.floor(Math.max(0, Math.min(.999999999, randomValue)) * (max - min + 1));
    },

    towerEnemyExperience(stage, randomValue = Math.random()) {
        const rules = GAME_DATA.rewards.towerEnemyExperience;
        const range = stage > 200 ? rules.after200 : stage > 100 ? rules.after100 : rules.base;
        return this.randomInRange(range, randomValue);
    },

    towerBossDropKinds(stage) {
        const rules = GAME_DATA.rewards.towerBossDrop;
        return stage > 200 ? rules.kindsAfter200 : stage > 100 ? rules.kindsAfter100 : rules.kindsBefore100;
    },

    towerBossRainbowCrystal(randomValue = Math.random()) {
        return this.randomInRange(GAME_DATA.rewards.towerBossDrop.rainbowCrystal, randomValue);
    },

    towerBossCharacterFragments(randomValue = Math.random()) {
        return this.randomInRange(GAME_DATA.rewards.towerBossDrop.characterFragment, randomValue);
    }
});
