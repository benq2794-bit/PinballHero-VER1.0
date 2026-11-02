// 存檔格式、瀏覽器儲存與相容轉換。此模組不直接操作遊戲畫面或全域進度。
window.SaveSystem = (() => {
    const VERSION = 6;
    const STATE_FIELDS = [
        'picked', 'accountCreated', 'accountGender', 'accountName', 'mainAccountJob',
        'accountStats', 'accountStatPoints', 'jobTalentPoints', 'jobTalentRanks',
        'jobPassiveActive', 'tutorialSeen', 'stage', 'rankLv', 'rankExp', 'kills',
        'floorWins', 'deepTimeLeft', 'shardTotal', 'teamIds', 'unisonMap', 'titleOn',
        'bossWin', 'gateTokens', 'gateRecord', 'cultivationMaterials', 'limitedSummonCount', 'shakeOn'
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
            characterIds, characters, jobs, roleToJob, statKeys, titleIds, gateIds,
            maxRank, teamMax, bossEvery, normalFloorWaves, bossFloorSeconds, normalFloorSeconds,
            rankExpNeed, normalizeTalentRanks, talentSpent, normalizeCharacterGrowth
        } = rules;
        const state = {};
        state.starterPicked = !!p.picked;
        state.accountCreated = p.accountCreated === undefined ? state.starterPicked : !!p.accountCreated;
        state.accountGender = p.accountGender === 'female' ? 'female' : 'male';
        state.accountName = typeof p.accountName === 'string' ? p.accountName.trim().slice(0, 16) : '';
        state.mainAccountJob = jobs[p.mainAccountJob] ? p.mainAccountJob : (roleToJob[p.mainAccountJob] || '');
        state.jobTalentRanks = normalizeTalentRanks(p.jobTalentRanks);
        state.jobPassiveActive = !!p.jobPassiveActive;
        state.tutorialSeen = p.tutorialSeen === undefined ? true : !!p.tutorialSeen;
        state.kills = Math.max(0, Math.min(999999, Math.floor(+p.kills) || 0));
        const savedStage = Math.floor(+p.stage) || 0;
        state.stage = savedStage > 0 ? Math.min(999999, savedStage) : 1 + Math.floor(state.kills / 3);
        // 舊資料缺少 Rank 時，沿用樓層；經驗可在讀取時補升級。
        state.rankLv = Math.max(1, Math.min(maxRank, Math.floor(+p.rankLv) || state.stage));
        state.rankExp = Math.max(0, Math.floor(+p.rankExp) || 0);
        while (state.rankLv < maxRank && state.rankExp >= rankExpNeed(state.rankLv)) {
            state.rankExp -= rankExpNeed(state.rankLv);
            state.rankLv++;
        }
        if (state.rankLv >= maxRank) { state.rankLv = maxRank; state.rankExp = 0; }
        state.jobTalentPoints = Math.max(0, Math.floor(state.rankLv / 5) - talentSpent(state.jobTalentRanks));
        const isBossFloor = state.stage % bossEvery === 0;
        state.floorWins = isBossFloor ? 0 : Math.max(0, Math.min(normalFloorWaves - 1, Math.floor(+p.floorWins) || 0));
        const floorSeconds = isBossFloor ? bossFloorSeconds : normalFloorSeconds;
        state.deepTimeLeft = Math.max(1, Math.min(floorSeconds, Math.floor(+p.deepTimeLeft) || floorSeconds));
        state.shardTotal = Math.max(0, Math.min(99999999, Math.floor(+p.shardTotal) || 0));
        state.cultivationMaterials = Math.max(0, Math.min(999999, Math.floor(+p.cultivationMaterials) || 0));
        // 舊存檔沒有轉蛋保底欄位時，從 0 抽開始，不影響原有角色與資源。
        state.limitedSummonCount = Math.max(0, Math.min(49, Math.floor(+p.limitedSummonCount) || 0));

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
        if (!state.mainAccountJob) state.mainAccountJob = roleToJob[state.teamIds[0] && characters[state.teamIds[0]].type] || 'warrior';
        if (p.accountStats && typeof p.accountStats === 'object') {
            state.accountStats = Object.fromEntries(statKeys.map(key => [key, Math.max(0, Math.min(99, Math.floor(+p.accountStats[key] || 0)))]));
            state.accountStatPoints = Math.max(0, Math.min(99999, Math.floor(+p.accountStatPoints) || 0));
        } else {
            state.accountStats = Object.fromEntries(statKeys.map(key => [key, 0]));
            state.accountStatPoints = 6 + Math.max(0, state.rankLv - 1) * 2;
        }
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
        state.gateTokens = Object.fromEntries(gateIds.map(id => [id, Math.max(0, Math.min(999999, Math.floor(+(p.gateTokens || {})[id]) || 0))]));
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
