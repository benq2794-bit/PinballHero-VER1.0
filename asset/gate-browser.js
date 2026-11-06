const GATE_DISPLAY_ORDER = ['fire', 'water', 'wind', 'thunder'];
let selectedGateId = 'fire';
function selectGateDisplay(id) {
    if (!GATE_DISPLAY_ORDER.includes(id) || !BOSS_STAGES.some(g => g.id === id)) return;
    selectedGateId = id;
    if (homeTabOn === 'boss') renderPage();
}
function shiftGateDisplay(direction) {
    const index = GATE_DISPLAY_ORDER.indexOf(selectedGateId);
    const next = Math.max(0, Math.min(GATE_DISPLAY_ORDER.length - 1, index + direction));
    selectGateDisplay(GATE_DISPLAY_ORDER[next]);
}
function gatePreview(id, direction) {
    const g = BOSS_STAGES.find(g => g.id === id), art = GATE_ENEMY_APPEARANCES[id];
    if (!g || !art) return '';
    return `<button type="button" class="gate-preview" style="--gate:${ELEMENTS[g.el].color};background-image:linear-gradient(90deg,#08122288,#081222cc),url('asset/battle/bg/gate_${id}.webp')" onclick="selectGateDisplay('${id}')" aria-label="${direction === 'up' ? '上一關' : '下一關'}：${g.gate}">
        <img src="${art.skin}" alt="${art.name}"${art.alpha ? ' class="alpha-art" style="--art-zoom:' + (art.zoom || 1) + '"' : ''}><span><small>${direction === 'up' ? '⌃ 上一關' : '⌄ 下一關'}</small><b>${g.gate}</b></span>
        <em>${bossWin[id] ? '已擊破' : '未擊破'}</em></button>`;
}
function renderGateBrowser() {
    const index = Math.max(0, GATE_DISPLAY_ORDER.indexOf(selectedGateId));
    const id = GATE_DISPLAY_ORDER[index], g = BOSS_STAGES.find(g => g.id === id), art = GATE_ENEMY_APPEARANCES[id];
    const stats = gateStats(g), wins = bossWin[id] || 0;
    const staminaState = syncStamina();
    const counter = String(index + 1).padStart(2, '0');
    return `<div class="gate-browser" style="--gate:${ELEMENTS[g.el].color}">
        <div class="gate-browser-heading"><b>境界領域</b><span>選擇一個世界　${counter} / 04</span></div>
        ${index > 0 ? gatePreview(GATE_DISPLAY_ORDER[index - 1], 'up') : '<div class="gate-edge-note">旅途從這道門開始</div>'}
        <section class="gate-feature" aria-label="${g.gate}關卡詳情">
            <div class="gate-scene" style="background-image:url('asset/battle/bg/gate_${id}.webp')">
                <div class="gate-scene-shade"></div><span class="gate-world-number">${counter}</span>
                <div class="gate-boss-portrait"><img src="${art.skin}" alt="${art.name}"${art.alpha ? ' class="alpha-art" style="--art-zoom:' + (art.zoom || 1) + '"' : ''}></div>
                <span class="gate-completion${wins ? ' cleared' : ''}">${wins ? '✓ 已擊破' : '等待挑戰'}</span>
            </div>
            <div class="gate-feature-details"><div class="gate-feature-title"><h3>${g.gate}</h3><span>${ELEMENTS[g.el].label}屬性</span></div>
                <div class="gate-boss-name">BOSS　${art.name}</div>
                <div class="gate-stat-row"><span>強度 <b>Lv.${stats.level}</b></span><span>生命 <b>${fmt(stats.hp)}</b></span><span>攻擊 <b>${fmt(stats.atk)}</b></span><span>擊破 <b>${wins}</b> 次</span></div>
                <div class="gate-reward-row"><span>${wins ? '再戰獎勵' : '首勝獎勵'}</span><b><img src="asset/items/crystal.png" alt=""> ${wins ? g.replay : g.shards} 虹彩石</b><small>${wins ? '另有隨機戰利品' : '首次擊破可領取，另有隨機戰利品'}</small></div>
                <button type="button" class="gate-challenge" onclick="enterBossGate('${id}')">${wins ? '再次挑戰' : '進入挑戰'}　<span>⚡ 消耗 ${StaminaSystem.GATE_COST}</span>　›</button>
            </div>
        </section>
        ${index < GATE_DISPLAY_ORDER.length - 1 ? gatePreview(GATE_DISPLAY_ORDER[index + 1], 'down') : '<div class="gate-edge-note">已抵達最後一道門</div>'}
        <div class="gate-browser-note">體力 ${staminaState.value}/${staminaState.max} · 每 5 分鐘恢復 1 點；境界領域每次消耗 ${StaminaSystem.GATE_COST} 點。<br>每場掉落：限定突破石 1～3、虹彩石 1～3、經驗水晶 10、高階經驗水晶 1～3；單抽券 0.1%、十抽券 0.001%。</div>
    </div>`;
}

function renderAdventureTrainingOptions() {
    const host = $("adventure-training-options");
    if (!host) return;
    host.innerHTML = GATE_DISPLAY_ORDER.map(id => {
        const gate = BOSS_STAGES.find(item => item.id === id);
        const art = GATE_ENEMY_APPEARANCES[id];
        if (!gate || !art) return "";
        const element = ELEMENTS[gate.el];
        return `<button type="button" class="adventure-training-choice" style="--training-color:${element.color}" onclick="enterTrainingGround('${id}')" aria-label="進入${element.label}屬性 ${art.name} 訓練場">
            <img src="asset/ui/element-${gate.el}.svg" alt="">
            <span><b>${element.label}屬性</b><small>${art.name}</small></span>
            <em>訓練 ›</em>
        </button>`;
    }).join("");
}

function enterTrainingGround(id) {
    const g = BOSS_STAGES.find(stage => stage.id === id);
    if (g) openGateBattle(g, true);
}
