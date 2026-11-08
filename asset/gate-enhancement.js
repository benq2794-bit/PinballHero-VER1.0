// 四屬性 Boss 的五階強化挑戰：階級規則、逐級掉落、逐王解鎖與首破紀錄。
// 這裡只算規則與整理存檔狀態，不發獎也不寫存檔；入帳仍由母頁的 gate-session 處理。
window.GateEnhancement = (() => {
    const config = () => GAME_DATA.encounters.gateEnhancement;
    const tierList = () => config().tiers;
    const tierIds = () => tierList().map(rule => rule.tier);
    const tierRule = tier => tierList().find(rule => rule.tier === Math.floor(+tier || 0)) || null;
    const anchorLevel = () => Math.max(1, Math.floor(+config().anchorLevel || 100));
    const baseLevel = () => Math.max(1, Math.floor(+GAME_DATA.combatRules.gateBaseLevel || 30));

    // 關卡每 10 勝升一階，30→100 要 70 勝，所以第 71 勝才是「首次擊敗 Lv.100」。
    // 舊玩家已經打過那一場，讀檔時用這個勝數補回 +10 解鎖，但不補發任何首破獎勵。
    function anchorClearWins() {
        return Math.max(0, Math.ceil((anchorLevel() - baseLevel()) / 10)) * 10 + 1;
    }
    function levelRule(level) {
        const table = GAME_DATA.rewards.gateLevelRewards;
        const lv = Math.max(baseLevel(), Math.min(anchorLevel(), Math.floor(+level || baseLevel())));
        const key = Math.floor(lv / 10) * 10;
        return { level: key, ...(table[key] || table[baseLevel()]) };
    }
    // 母頁發獎時自己重算等級，不採信子頁貼上來的數字；勝場每 10 場升一階，封頂在 Lv.100。
    const levelForWins = wins => Math.min(anchorLevel(), baseLevel() + Math.floor(Math.max(0, Math.floor(+wins || 0)) / 10) * 10);
    // 強化階級一律以 Lv.100 為基準；hp／atk 是要乘在「已含關卡屬性倍率的最終值」上的係數。
    function rewardRule(level, tier) {
        const rule = tierRule(tier);
        if (rule) return { tier: rule.tier, level: anchorLevel(), hp: rule.hp, atk: rule.atk,
            shardChance: rule.shardChance, gold: rule.gold, stones: rule.stones, firstRainbow: rule.firstRainbow };
        const base = levelRule(level);
        return { tier: 0, level: base.level, hp: 1, atk: 1,
            shardChance: base.shardChance, gold: base.gold, stones: 0, firstRainbow: 0 };
    }
    const label = (tier, level) => Math.floor(+tier || 0) ? `+${Math.floor(+tier)}` : `Lv.${Math.floor(+level || anchorLevel())}`;

    const blank = () => ({ unlocked: 0, broken: [], selected: 0 });
    const entryOf = (state, id) => (state && state[id]) || blank();
    function winsOf(wins, id) {
        const value = typeof wins === 'function' ? wins(id) : (wins || {})[id];
        return Math.max(0, Math.floor(+value || 0));
    }
    function unlockedTier(state, id, wins) {
        const saved = Math.floor(+entryOf(state, id).unlocked || 0);
        const valid = saved === 0 || tierIds().includes(saved) ? saved : 0;
        return Math.max(valid, winsOf(wins, id) >= anchorClearWins() ? config().step : 0);
    }
    function isUnlocked(state, id, tier, wins) {
        const value = Math.floor(+tier || 0);
        return value === 0 || (!!tierRule(value) && value <= unlockedTier(state, id, wins));
    }
    function selectedTier(state, id, wins) {
        const value = Math.floor(+entryOf(state, id).selected || 0);
        return isUnlocked(state, id, value, wins) ? value : 0;
    }
    function selectTier(state, id, tier, wins) {
        const value = Math.floor(+tier || 0);
        if (!isUnlocked(state, id, value, wins)) return false;
        const entry = state[id] || (state[id] = blank());
        entry.unlocked = unlockedTier(state, id, wins);
        entry.selected = value;
        return true;
    }
    // 選擇器用的六個選項：一般 Lv.100 永遠可進，五階依解鎖進度逐顆上鎖。
    function options(state, id, wins) {
        const top = unlockedTier(state, id, wins), chosen = selectedTier(state, id, wins);
        return [rewardRule(anchorLevel(), 0), ...tierList().map(rule => rewardRule(anchorLevel(), rule.tier))]
            .map(row => ({ ...row, label: label(row.tier, row.level), unlocked: row.tier <= top, selected: row.tier === chosen }));
    }
    function recordClear(state, id, tier, level) {
        const entry = state[id] || (state[id] = blank());
        const value = Math.floor(+tier || 0), rule = tierRule(value);
        if (!rule) {
            const opened = Math.floor(+level || 0) >= anchorLevel() && entry.unlocked < config().step;
            if (opened) entry.unlocked = config().step;
            return { unlocked: opened ? entry.unlocked : 0, firstBreak: 0 };
        }
        if (value > entry.unlocked || entry.broken.includes(value)) return { unlocked: 0, firstBreak: 0 };
        entry.broken.push(value);
        const next = value + config().step, opened = !!tierRule(next) && entry.unlocked < next;
        if (opened) entry.unlocked = next;
        return { unlocked: opened ? next : 0, firstBreak: rule.firstRainbow };
    }
    // 結算畫面要在入帳前就知道「這一階的首破還領不領得到」：拿複本試跑同一條規則，不動到真正的存檔狀態。
    function previewClear(state, id, tier, level) {
        return recordClear({ [id]: JSON.parse(JSON.stringify(entryOf(state, id))) }, id, tier, level);
    }
    function normalize(saved, gateIds, wins) {
        const src = (saved && typeof saved === 'object' && !Array.isArray(saved)) ? saved : {};
        const valid = tierIds(), step = config().step, out = {};
        for (const id of gateIds) {
            const raw = (src[id] && typeof src[id] === 'object') ? src[id] : {};
            let unlocked = valid.includes(raw.unlocked) ? raw.unlocked : 0;
            if (winsOf(wins, id) >= anchorClearWins()) unlocked = Math.max(unlocked, step);
            const broken = Array.isArray(raw.broken) ? [...new Set(raw.broken.filter(t => valid.includes(t)))] : [];
            // 首破必然已解鎖下一階：舊檔少了 unlocked 就用 broken 補回，不把玩家鎖回去。
            for (const t of broken) { const next = t + step; if (valid.includes(next)) unlocked = Math.max(unlocked, next); }
            const kept = broken.filter(t => t <= unlocked);
            const selected = (raw.selected === 0 || valid.includes(raw.selected)) && raw.selected <= unlocked ? raw.selected : 0;
            out[id] = { unlocked, broken: kept, selected };
        }
        return out;
    }
    return Object.freeze({ anchorLevel, anchorClearWins, levelForWins, tierList, tierRule, rewardRule, label, blank,
        unlockedTier, isUnlocked, selectedTier, selectTier, options, recordClear, previewClear, normalize });
})();