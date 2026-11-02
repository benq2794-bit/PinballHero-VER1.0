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

    crystalDrop(stage, randomValue = Math.random()) {
        return 1 + Math.floor(randomValue * 2) + Math.floor(stage / 12);
    },

    shardRecipients(isBoss) {
        return isBoss ? 3 : 2;
    },

    shardsPerRecipient(isBoss) {
        return isBoss ? 2 : 1;
    }
});
