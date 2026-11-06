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

    towerEnemyRainbowCrystal(randomValue = Math.random()) {
        const rules = GAME_DATA.rewards.towerEnemyRainbowCrystal;
        return randomValue < rules.chance ? rules.amount : 0;
    },

    towerEnemyCharacterFragment(randomValue = Math.random()) {
        const rules = GAME_DATA.rewards.towerEnemyCharacterFragment;
        return randomValue < rules.chance ? rules.amount : 0;
    },

    towerEnemyGold(stage, randomValue = Math.random()) {
        const rules = GAME_DATA.rewards.towerEnemyGold;
        const range = stage > 200 ? rules.after200 : stage > 100 ? rules.after100 : rules.base;
        return this.randomInRange(range, randomValue);
    },

    towerEnemyMaterial(kind, randomValue = Math.random()) {
        const rule = GAME_DATA.rewards.towerEnemyMaterials[kind];
        return rule && randomValue < rule.chance ? rule.amount : 0;
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
    },

    towerBossGold(stage, randomValue = Math.random()) {
        const rules = GAME_DATA.rewards.towerBossDrop.gold;
        const range = stage > 200 ? rules.after200 : stage > 100 ? rules.after100 : rules.base;
        return this.randomInRange(range, randomValue);
    },

    towerBossAdventureMedal(randomValue = Math.random()) {
        return randomValue < GAME_DATA.rewards.towerBossDrop.adventureMedalChance ? 1 : 0;
    }
});
