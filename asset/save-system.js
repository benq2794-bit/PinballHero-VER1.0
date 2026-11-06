// 存檔格式、瀏覽器儲存與相容轉換。此模組不直接操作遊戲畫面或全域進度。
window.SaveSystem = (() => {
    const VERSION = 6;
    const SQUAD_SLOTS = 4;
    const STATE_FIELDS = [
        'picked', 'accountCreated', 'accountName', 'accountAvatarId', 'accountAvatarFrameId', 'avatarFramesOwned',
        'typeTalentPoints', 'typeTalentRanks',
        'tutorialSeen', 'stage', 'towerBestStage', 'towerFirstBossRecoveryUsed', 'rankLv', 'rankExp', 'kills',
        'floorWins', 'deepTimeLeft', 'shardTotal', 'gold', 'towerMaterials', 'stamina', 'staminaTickAt', 'staminaOverflowResetDate', 'teamIds', 'squads', 'squadOn', 'unisonMap', 'titleOn',
        'bossWin', 'gateRecord', 'cultivationMaterials', 'highGradeExperienceCrystals', 'breakthroughStones', 'battleBoostMs', 'battleBoostSavedAt', 'limitedSummonCount', 'summonFeaturedCharacterId', 'limitedFeaturedGuaranteed', 'summonTicketSingle', 'summonTicketTen', 'expeditionHellEntryDay', 'expeditionHellEntriesUsed', 'expeditionNormalClearCount', 'expeditionNormalRewardDay', 'expeditionNormalRewardedToday', 'dailyCheckinDate', 'dailyCheckinStreak', 'dailyCheckinTotal', 'staminaSupplyDate', 'staminaSupplyNoonAmount', 'staminaSupplyEveningAmount', 'specialDungeonRunDate', 'specialDungeonRuns', 'collectionAchievementClaims', 'shakeOn',
        'passSeason', 'passExp', 'passPremium', 'passClaimedFree', 'passClaimedPremium', 'passCosmetics', 'passDailyDate', 'passDailyCheckinAwarded', 'passDailyStamina', 'passDailyFloors', 'passWeeklyDate', 'passWeeklyWeakHits', 'passWeeklyExpeditionClears'
    ];
    const CHARACTER_FIELDS = [
        'unlocked', 'shards', 'lvl', 'exp', 'nextExp', 'baseAtk', 'maxHp',
        'growthVersion', 'legacyCap', 'breakthrough'
    ];
    const parseFailure = '存檔解析失敗，進度重新開始。';

    function createSnapshot(state, characterIds) {
        const snapshot = { v: VERSION };
        for (const key of STATE_FIELDS) snapshot[key] = state[key];
        snapshot.roster = {};
        for (const id of characterIds) {
            const character = state.roster[id], saved = {};
            for (const key of CHARACTER_FIELDS) saved[key] = character[key];
            saved.talents = { ...character.talents };
            snapshot.roster[id] = saved;
        }
        // 深拷貝讓產生的快照不受後續遊戲狀態改動影響。
        return JSON.parse(JSON.stringify(snapshot));
    }

    function createStore({ key, getStorage }) {
        return Object.freeze({
            write(snapshot) {
                try {
                    getStorage().setItem(key, JSON.stringify(snapshot));
                    return { ok: true };
                } catch (error) { return { ok: false, error }; }
            },
            read() {
                let raw;
                try { raw = getStorage().getItem(key); }
                catch (error) { return { ok: false, note: '', error }; }
                if (!raw) return { ok: false, note: '' };
                try {
                    const data = JSON.parse(raw);
                    if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error('Invalid save');
                    if (data.v !== VERSION) return {
                        ok: false, note: '存檔版本與現行版不合（v' + (data.v || '?') + '），進度重新開始。'
                    };
                    return { ok: true, data };
                } catch (error) { return { ok: false, note: parseFailure, error }; }
            },
            remove() {
                try { getStorage().removeItem(key); return true; }
                catch (error) { return false; }
            }
        });
    }

    function restore(p, initialRoster, rules) {
        const {
            characterIds, characters, titleIds, gateIds,
            maxRank, teamMax, bossEvery, normalFloorWaves, bossFloorSeconds, normalFloorSeconds,
            rankExpNeed, normalizeTalentRanks, talentSpent, normalizeCharacterGrowth,
            staminaMaxAtRank = rank => Math.min(120, 60 + 2 * Math.floor(Math.max(1, Number(rank) || 1) / 5))
        } = rules;
        const state = {};
        state.starterPicked = !!p.picked;
        state.accountCreated = p.accountCreated === undefined ? state.starterPicked : !!p.accountCreated;
        state.accountName = typeof p.accountName === 'string' ? p.accountName.trim().slice(0, 16) : '';
        state.accountAvatarId = typeof p.accountAvatarId === 'string'
            && characterIds.includes(p.accountAvatarId)
            && p.roster && p.roster[p.accountAvatarId] && p.roster[p.accountAvatarId].unlocked
            ? p.accountAvatarId : '';
        state.accountAvatarFrameId = p.accountAvatarFrameId === 'frontier-frame' ? 'frontier-frame' : 'title';
        state.avatarFramesOwned = Array.isArray(p.avatarFramesOwned)
            ? [...new Set(p.avatarFramesOwned.filter(id => typeof id === 'string' && ['element-fire', 'element-water', 'element-wind', 'element-thunder'].includes(id)))]
            : [];
        // 天賦樹改以攻擊型態分組，舊存檔以職業為 key 的等級對不到新節點，讀入即歸零重投。
        state.typeTalentRanks = normalizeTalentRanks(p.typeTalentRanks);
        state.tutorialSeen = p.tutorialSeen === undefined ? true : !!p.tutorialSeen;
        state.kills = Math.max(0, Math.min(999999, Math.floor(+p.kills) || 0));
        const savedStage = Math.floor(+p.stage) || 0;
        state.stage = savedStage > 0 ? Math.min(999999, savedStage) : 1 + Math.floor(state.kills / 3);
        state.towerBestStage = Math.max(state.stage, Math.min(999999, Math.floor(+p.towerBestStage) || state.stage));
        state.towerFirstBossRecoveryUsed = p.towerFirstBossRecoveryUsed === true;
        // 舊資料缺少 Rank 時，沿用樓層；經驗可在讀取時補升級。
        state.rankLv = Math.max(1, Math.min(maxRank, Math.floor(+p.rankLv) || state.stage));
        state.rankExp = Math.max(0, Math.floor(+p.rankExp) || 0);
        while (state.rankLv < maxRank && state.rankExp >= rankExpNeed(state.rankLv)) {
            state.rankExp -= rankExpNeed(state.rankLv);
            state.rankLv++;
        }
        if (state.rankLv >= maxRank) { state.rankLv = maxRank; state.rankExp = 0; }
        const staminaMax = staminaMaxAtRank(state.rankLv);
        state.stamina = p.stamina === undefined ? staminaMax : Math.max(0, Math.min(9999999, Math.floor(+p.stamina) || 0));
        state.staminaTickAt = Number.isFinite(+p.staminaTickAt) && +p.staminaTickAt > 0 ? Math.floor(+p.staminaTickAt) : Date.now();
        state.staminaOverflowResetDate = typeof p.staminaOverflowResetDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.staminaOverflowResetDate) ? p.staminaOverflowResetDate : '';
        state.typeTalentPoints = Math.max(0, Math.floor(state.rankLv / 5) - talentSpent(state.typeTalentRanks));
        const isBossFloor = state.stage % bossEvery === 0;
        state.floorWins = isBossFloor ? 0 : Math.max(0, Math.min(normalFloorWaves - 1, Math.floor(+p.floorWins) || 0));
        const floorSeconds = isBossFloor ? bossFloorSeconds : normalFloorSeconds;
        state.deepTimeLeft = Math.max(1, Math.min(floorSeconds, Math.floor(+p.deepTimeLeft) || floorSeconds));
        state.shardTotal = Math.max(0, Math.min(99999999, Math.floor(+p.shardTotal) || 0));
        state.gold = Math.max(0, Math.min(9999999999, Math.floor(+p.gold) || 0));
        const savedTowerMaterials = p.towerMaterials && typeof p.towerMaterials === 'object' ? p.towerMaterials : {};
        state.towerMaterials = Object.fromEntries(['jelly', 'blockScrap', 'monsterCrystal', 'adventureMedal', 'expeditionMedal', 'dragonWing', 'shellfishTail', 'garudaBeak', 'thunderCore', 'baphometHorn'].map(key => [key, Math.max(0, Math.min(9999999, Math.floor(+savedTowerMaterials[key]) || 0))]));
        state.cultivationMaterials = Math.max(0, Math.min(999999, Math.floor(+p.cultivationMaterials) || 0));
        state.highGradeExperienceCrystals = Math.max(0, Math.min(999999, Math.floor(+p.highGradeExperienceCrystals) || 0));
        const savedBoosts = p.battleBoostMs && typeof p.battleBoostMs === 'object' ? p.battleBoostMs : {};
        const boostElapsed = Number.isFinite(+p.battleBoostSavedAt) && +p.battleBoostSavedAt > 0
            ? Math.max(0, Date.now() - +p.battleBoostSavedAt) : 0;
        state.battleBoostMs = Object.fromEntries(['speed', 'attack', 'crit'].map(key => [key,
            Math.max(0, Math.min(10 * 60 * 1000, (Number(savedBoosts[key]) || 0) - boostElapsed))]));
        state.battleBoostSavedAt = Date.now();
        const savedBreakthroughStones = p.breakthroughStones && typeof p.breakthroughStones === 'object' ? p.breakthroughStones : {};
        state.breakthroughStones = {
            fourStar: Math.max(0, Math.min(999999, Math.floor(+savedBreakthroughStones.fourStar) || 0)),
            fiveStar: Math.max(0, Math.min(999999, Math.floor(+savedBreakthroughStones.fiveStar) || 0))
        };
        // 舊存檔沒有轉蛋保底欄位時，從 0 抽開始，不影響原有角色與資源。
        state.limitedSummonCount = Math.max(0, Math.min(119, Math.floor(+p.limitedSummonCount) || 0));
        state.summonFeaturedCharacterId = typeof p.summonFeaturedCharacterId === 'string' && characterIds.includes(p.summonFeaturedCharacterId) ? p.summonFeaturedCharacterId : '';
        state.limitedFeaturedGuaranteed = !!p.limitedFeaturedGuaranteed;
        state.summonTicketSingle = Math.max(0, Math.min(999999, Math.floor(+p.summonTicketSingle) || 0));
        state.summonTicketTen = Math.max(0, Math.min(999999, Math.floor(+p.summonTicketTen) || 0));
        state.expeditionHellEntryDay = typeof p.expeditionHellEntryDay === 'string' ? p.expeditionHellEntryDay.slice(0, 10) : '';
        state.expeditionHellEntriesUsed = Math.max(0, Math.min(3, Math.floor(+p.expeditionHellEntriesUsed) || 0));
        state.expeditionNormalClearCount = Math.max(0, Math.min(999999, Math.floor(+p.expeditionNormalClearCount) || 0));
        state.expeditionNormalRewardDay = typeof p.expeditionNormalRewardDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.expeditionNormalRewardDay) ? p.expeditionNormalRewardDay : '';
        state.expeditionNormalRewardedToday = Math.max(0, Math.min(20, Math.floor(+p.expeditionNormalRewardedToday) || 0));
        state.dailyCheckinDate = typeof p.dailyCheckinDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.dailyCheckinDate) ? p.dailyCheckinDate : '';
        state.dailyCheckinStreak = Math.max(0, Math.min(7, Math.floor(+p.dailyCheckinStreak) || 0));
        state.dailyCheckinTotal = Math.max(0, Math.min(9999999, Math.floor(+p.dailyCheckinTotal) || 0));
        state.staminaSupplyDate = typeof p.staminaSupplyDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.staminaSupplyDate) ? p.staminaSupplyDate : '';
        state.staminaSupplyNoonAmount = Math.max(0, Math.min(60, Math.floor(+p.staminaSupplyNoonAmount) || 0));
        state.staminaSupplyEveningAmount = Math.max(0, Math.min(60, Math.floor(+p.staminaSupplyEveningAmount) || 0));
        state.specialDungeonRunDate = typeof p.specialDungeonRunDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.specialDungeonRunDate) ? p.specialDungeonRunDate : '';
        const savedDungeonRuns = p.specialDungeonRuns && typeof p.specialDungeonRuns === 'object' ? p.specialDungeonRuns : {};
        state.specialDungeonRuns = Object.fromEntries(['gold-easy', 'gold-normal', 'gold-hard', 'exp-easy', 'exp-normal', 'exp-hard'].map(id => [id, Math.max(0, Math.min(3, Math.floor(+savedDungeonRuns[id]) || 0))]));
        const savedCollectionClaims = Array.isArray(p.collectionAchievementClaims) ? p.collectionAchievementClaims : [];
        state.collectionAchievementClaims = [...new Set(savedCollectionClaims.filter(id => typeof id === 'string' && ['ach_1', 'ach_2', 'ach_3'].includes(id)))];
        state.passSeason = typeof p.passSeason === 'string' && /^\d{4}-\d{2}$/.test(p.passSeason) ? p.passSeason : '';
        state.passExp = Math.max(0, Math.min(30000, Math.floor(+p.passExp) || 0));
        state.passPremium = !!p.passPremium;
        state.passClaimedFree = Array.isArray(p.passClaimedFree) ? [...new Set(p.passClaimedFree.filter(n => Number.isInteger(n) && n >= 1 && n <= 30))] : [];
        state.passClaimedPremium = Array.isArray(p.passClaimedPremium) ? [...new Set(p.passClaimedPremium.filter(n => Number.isInteger(n) && n >= 1 && n <= 30))] : [];
        state.passCosmetics = Array.isArray(p.passCosmetics) ? [...new Set(p.passCosmetics.filter(id => typeof id === 'string' && ['frontier-frame', 'baphomet-damage-font'].includes(id)))] : [];
        state.passDailyDate = typeof p.passDailyDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.passDailyDate) ? p.passDailyDate : '';
        state.passDailyCheckinAwarded = !!p.passDailyCheckinAwarded;
        state.passDailyStamina = Math.max(0, Math.min(30, Math.floor(+p.passDailyStamina) || 0));
        state.passDailyFloors = Math.max(0, Math.min(5, Math.floor(+p.passDailyFloors) || 0));
        state.passWeeklyDate = typeof p.passWeeklyDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.passWeeklyDate) ? p.passWeeklyDate : '';
        state.passWeeklyWeakHits = Math.max(0, Math.min(50, Math.floor(+p.passWeeklyWeakHits) || 0));
        state.passWeeklyExpeditionClears = Math.max(0, Math.min(3, Math.floor(+p.passWeeklyExpeditionClears) || 0));

        // 在獨立副本完成角色相容轉換，任何一步失敗都不修改遊戲中的角色。
        state.roster = JSON.parse(JSON.stringify(initialRoster));
        for (const id of characterIds) {
            const saved = p.roster && p.roster[id];
            if (!saved) continue;
            Object.assign(state.roster[id], saved);
            if (saved.growthVersion !== 1 && saved.growthVersion !== 2) state.roster[id].growthVersion = 0;
            normalizeCharacterGrowth(state.roster[id]);
            state.roster[id].hp = state.roster[id].maxHp;
            state.roster[id].gauge = 0;
        }
        state.teamIds = (p.teamIds || []).filter(id => state.roster[id] && state.roster[id].unlocked).slice(0, teamMax);
        if (!state.teamIds.length) {
            const first = characterIds.find(id => state.roster[id].unlocked);
            if (first) state.teamIds = [first];
        }
        // 配隊1–4：舊存檔只有 teamIds，把它當成配隊1，其餘三隊留空給玩家自己組。
        const savedSquads = Array.isArray(p.squads) ? p.squads : [];
        state.squads = [];
        for (let i = 0; i < SQUAD_SLOTS; i++) {
            const list = Array.isArray(savedSquads[i]) ? savedSquads[i] : [];
            state.squads.push(list.filter(id => state.roster[id] && state.roster[id].unlocked).slice(0, teamMax));
        }
        if (!state.squads[0].length) state.squads[0] = state.teamIds.slice();
        const wanted = Math.max(0, Math.min(SQUAD_SLOTS - 1, Math.floor(+p.squadOn) || 0));
        state.squadOn = state.squads[wanted].length ? wanted : Math.max(0, state.squads.findIndex(list => list.length));
        state.teamIds = state.squads[state.squadOn].slice();
        if (!state.teamIds.length) state.starterPicked = false;
        state.unisonMap = {};
        const savedUnison = p.unisonMap || {};
        for (const id of state.teamIds) {
            const other = savedUnison[id];
            if (other && state.roster[other] && state.roster[other].unlocked && other !== id) state.unisonMap[id] = other;
        }
        state.titleOn = titleIds.includes(p.titleOn) ? p.titleOn : 'novice';
        state.bossWin = {};
        const savedWins = p.bossWin || {};
        for (const id of gateIds) if (savedWins[id] > 0) state.bossWin[id] = savedWins[id] | 0;
        // 舊存檔沒有最佳紀錄欄位：一律補 0／0，代表「還沒破過」，第一次通关才不會被判成打敗自己。
        const savedRecords = (p.gateRecord && typeof p.gateRecord === 'object') ? p.gateRecord : {};
        state.gateRecord = Object.fromEntries(gateIds.map(id => {
            const r = (savedRecords[id] && typeof savedRecords[id] === 'object') ? savedRecords[id] : {};
            return [id, { ms: Math.max(0, Math.min(86400000, Math.floor(+r.ms) || 0)),
                score: Math.max(0, Math.min(999999999, Math.floor(+r.score) || 0)) }];
        }));
        state.shakeOn = p.shakeOn !== false;
        return state;
    }

    return Object.freeze({ VERSION, parseFailure, createSnapshot, createStore, restore });
})();
