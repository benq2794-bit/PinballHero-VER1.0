// Uses exactly the existing per-wave population and reward formulas. No new reward table.
window.MaterialSweep = Object.freeze({
    rewards(cfg) {
        const totals = {};
        for (let wave = 1; wave < dungeonWaveTotal(cfg); wave++) {
            const count = dungeonWaveUnits(cfg, wave).length;
            const key = cfg.kind === 'gold' ? 'gold' : 'experience';
            for (let i = 0; i < count; i++) totals[key] = (totals[key] || 0) + (key === 'gold'
                ? RewardFormulas.towerEnemyGold(cfg.level) : RewardFormulas.towerEnemyExperience(cfg.level));
        }
        for (const row of dungeonRewards(cfg)) totals[row.key] = (totals[row.key] || 0) + row.amount;
        return totals;
    }
});
let materialSweepBusy = false;
async function sweepMaterialDungeon(id) {
    if (materialSweepBusy || gateBattleOpen) return false;
    const cfg = SPECIAL_DUNGEONS.find(d => d.id === id && ['gold','experience'].includes(d.kind));
    if (!cfg || specialDungeonClears[id] !== true) return false;
    materialSweepBusy = true;
    try {
        refreshSpecialDungeonRuns();
        const count = Math.max(0, 3 - (specialDungeonRuns[id] || 0));
        if (!count) return false;
        // Keep the operation locked through a browser task, including rapid double clicks.
        await new Promise(resolve => setTimeout(resolve, 0));
        const before = { gold, shardTotal, cultivationMaterials, highGradeExperienceCrystals, used:specialDungeonRuns[id] || 0, beta:structuredClone(betaEventState) };
        const totals = {};
        for (let i = 0; i < count; i++) {
            for (const [key, amount] of Object.entries(MaterialSweep.rewards(cfg))) totals[key] = (totals[key] || 0) + amount;
            recordBetaEventBattle();
        }
        specialDungeonRuns[id] = 3;
        for (const [key, amount] of Object.entries(totals)) grantDungeonReward(key, amount);
        if (!saveGame()) {
            ({gold,shardTotal,cultivationMaterials,highGradeExperienceCrystals}=before);
            specialDungeonRuns[id]=before.used; betaEventState=before.beta;
            hmToast('儲存失敗，掃蕩未完成，次數與獎勵均已還原。');
            return false;
        }
        paintSpecialDungeonPicker(); paintHome();
        let dialog=document.getElementById('material-sweep-result');
        if (!dialog) { dialog=document.createElement('dialog');dialog.id='material-sweep-result';document.body.appendChild(dialog); }
        dialog.innerHTML=`<h2>${cfg.name}・${cfg.difficulty}</h2><p>掃蕩完成 ×${count}・今日剩餘 0 / 3</p><div class="sweep-rewards">${Object.entries(totals).map(([key,amount])=>`<div><img src="${DUNGEON_REWARD_META[key].icon}" alt=""><span>${DUNGEON_REWARD_META[key].name} ×${amount.toLocaleString('zh-TW')}</span></div>`).join('')}</div><form method="dialog"><button>完成</button></form>`;
        dialog.showModal(); return true;
    } finally { materialSweepBusy=false; }
}
