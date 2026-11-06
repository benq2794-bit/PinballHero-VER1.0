// 離線收益：把「分頁沒打開」的時間換成波利塔小怪的期望掉落。
// 只借 GAME_DATA.rewards 的現成掉落表，不另建一套經濟數值；BOSS 關與角色碎片不列入。
window.OfflineEarnings = Object.freeze({
    KEY: "wf_offline_earnings_v1",
    MS_PER_ENEMY: 2 * 60 * 1000,
    CAP_ENEMIES: 240,          // 待領取最多堆 8 小時，超過的時間直接作廢

    REWARD_KEYS: ["gold", "experience", "rainbowCrystal", "jelly", "blockScrap", "monsterCrystal"],

    emptyRewards() {
        return { gold: 0, experience: 0, rainbowCrystal: 0, jelly: 0, blockScrap: 0, monsterCrystal: 0 };
    },

    create(at = Date.now()) {
        return { at, carryMs: 0, enemies: 0, rewards: this.emptyRewards() };
    },

    // 單隻小怪的期望值：區間取平均（randomInRange 為閉區間均勻分佈），機率取 chance×amount。
    perEnemyRewards(stage, rewards = GAME_DATA.rewards) {
        const s = Math.max(1, Math.floor(Number(stage) || 1));
        const tier = rule => (s > 200 ? rule.after200 : s > 100 ? rule.after100 : rule.base);
        const avg = range => (Math.max(0, Number(range[0]) || 0) + Math.max(0, Number(range[1]) || 0)) / 2;
        const chance = rule => (Number(rule.chance) || 0) * (Number(rule.amount) || 0);
        const materials = rewards.towerEnemyMaterials;
        return {
            gold: avg(tier(rewards.towerEnemyGold)),
            experience: avg(tier(rewards.towerEnemyExperience)),
            rainbowCrystal: chance(rewards.towerEnemyRainbowCrystal),
            jelly: chance(materials.jelly),
            blockScrap: chance(materials.blockScrap),
            monsterCrystal: chance(materials.monsterCrystal)
        };
    },

    // 不寫入：只算「假設現在入帳會變成什麼樣子」，頁面因此能即時顯示。
    accrue(record, { now, stage }) {
        const at = Math.floor(Number(record && record.at) || Number(now) || 0);
        const stamp = Math.floor(Number(now) || 0);
        const elapsed = Math.max(0, stamp - at);
        const previous = {
            carryMs: Math.max(0, Math.floor(Number(record && record.carryMs) || 0)),
            enemies: Math.max(0, Math.floor(Number(record && record.enemies) || 0)),
            rewards: Object.assign(this.emptyRewards(), record && record.rewards || {})
        };
        const perEnemy = this.perEnemyRewards(stage);
        let ms = previous.carryMs + elapsed, gained = 0;
        while (ms >= this.MS_PER_ENEMY && previous.enemies + gained < this.CAP_ENEMIES) {
            ms -= this.MS_PER_ENEMY;
            gained++;
        }
        if (ms >= this.MS_PER_ENEMY) ms = 0;   // 已達上限：多出來的離線時間不再累計
        const rewards = Object.assign({}, previous.rewards);
        for (const key of this.REWARD_KEYS) rewards[key] = (Number(rewards[key]) || 0) + perEnemy[key] * gained;
        return {
            record: { at: stamp, carryMs: ms, enemies: previous.enemies + gained, rewards },
            elapsedMs: elapsed, gained, capped: previous.enemies + gained >= this.CAP_ENEMIES
        };
    },

    // 開著遊戲的時間不計價：只把時間戳推進，上一段沒滿 2 分鐘的餘量留著下次湊。
    touch(record, now) {
        const stamp = Math.floor(Number(now) || 0);
        if (!record || !Number.isFinite(Number(record.at))) return this.create(stamp);
        return Object.assign({}, record, { at: stamp });
    },

    whole(rewards) {
        const out = this.emptyRewards();
        for (const key of this.REWARD_KEYS) out[key] = Math.floor(Math.max(0, Number(rewards && rewards[key]) || 0));
        return out;
    },

    // 只發整數，小數留回紀錄，下次領取才不算丟掉尾巴。
    claim(record) {
        const granted = this.whole(record && record.rewards);
        const rewards = Object.assign(this.emptyRewards(), record && record.rewards || {});
        for (const key of this.REWARD_KEYS) rewards[key] = Math.max(0, (Number(rewards[key]) || 0) - granted[key]);
        return {
            granted,
            record: { at: Math.floor(Number(record && record.at) || 0), carryMs: Math.max(0, Math.floor(Number(record && record.carryMs) || 0)), enemies: 0, rewards }
        };
    },

    createStore({ key, getStorage }) {
        return Object.freeze({
            read() {
                try {
                    const raw = getStorage().getItem(key);
                    return raw ? JSON.parse(raw) : null;
                } catch (_) { return null; }
            },
            write(record) {
                try { getStorage().setItem(key, JSON.stringify(record)); return true; } catch (_) { return false; }
            },
            remove() {
                try { getStorage().removeItem(key); return true; } catch (_) { return false; }
            }
        });
    }
});
