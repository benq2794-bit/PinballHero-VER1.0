// BOSS 登場：預兆 → 名稱砸入 → 血條充能 → 解鎖戰鬥
const BOSS_ENTRANCE = { seq: -1, pending: false, elapsed: 0, duration: 2000, data: null };

// 稱號按屬性給：BOSS 名字本身已經帶「・」副名，橫幅再補一層身分
const BOSS_TITLES = {
    fire: '炎災之孽', water: '深雪之華', wind: '裂空之嵐',
    thunder: '天罰之雷', light: '聖詠之座', dark: '蝕夜之影'
};

function bossAppearanceName() {
    const names = { 'angeling.png': '天使波利', 'ghostring.png': '幽靈波利', 'deviling.png': '惡魔波利' };
    const file = (enemy.battleSkinUrl || '').split('/').pop();
    return names[file] || enemy.name;
}

// 異界迴廊的王比較大尾，節奏再放慢一格
function bossEntranceTiming(gate) {
    return { name: 500, intro: Math.round(110 * 1000 / 60), charge: Math.round(35 * 1000 / 60) };
}

// 充能期間 HUD 顯示的值：入場流程自己灌，其餘時間回傳 null（照真實血量）
function bossEntranceHp() {
    const data = BOSS_ENTRANCE.data;
    if (!data || BOSS_ENTRANCE.seq !== PF.foeSeq) return null;
    return data.hpShown;
}

// 頭上那條小王血也要跟著充能；render() 每幀都會重寫，所以由這裡統一發號
function bossEntranceHpRatio() {
    const data = BOSS_ENTRANCE.data;
    if (!data || BOSS_ENTRANCE.seq !== PF.foeSeq) return null;
    return data.hpShown / data.maxHp;
}

function bossEntranceFreezesBattle() {
    const data = BOSS_ENTRANCE.data;
    return !!(data && data.state !== 'PLAY' && BOSS_ENTRANCE.seq === PF.foeSeq && enemy.boss && enemy.hp > 0);
}

function shiftBossEntranceClocks(data) {
    if (!data || data.freezeAt === null || BOSS_ENTRANCE.seq !== PF.foeSeq) return;
    const stopped = Math.max(0, performance.now() - data.freezeAt);
    for (const key of ['nextCastAt', 'stunUntil', 'slowUntil', 'paralyzeReady', 'gustReady']) if (PF[key]) PF[key] += stopped;
    if (PF.lastContact) PF.lastContact += stopped;
    if (PF.buff && PF.buff.until) PF.buff.until += stopped;
    (PF.members || []).forEach(m => { if (m.respawnAt) m.respawnAt += stopped; });
    (PF.burns || []).forEach(b => { b.at += stopped; });
    if (GATE.id) GATE.t0 += stopped;
    data.freezeAt = null;
}

function paintBossEntranceHp(data) {
    const bar = $('enemy-hp-bar'), txt = $('enemy-hp-txt');
    if (bar) bar.style.width = clampPct(data.hpShown / data.maxHp);
    if (txt) txt.textContent = `${data.hpShown}/${data.maxHp}`;
}

// 名稱提示貼著王本體下方定位，跟隨王的位置，避免遮住王或畫面中央戰鬥區。
function positionBossEntrance() {
    const panel = $('boss-entrance'), boss = PF.foe;
    if (!panel || !boss) return;
    const half = Math.min(190, W / 2 - 12);
    panel.style.left = `${Math.max(half, Math.min(W - half, boss.x))}px`;
    panel.style.top = `${Math.min(H - 105, boss.y + boss.r + 24)}px`;
}

function hideBossEntrance() {
    const data = BOSS_ENTRANCE.data;
    shiftBossEntranceClocks(data);
    BOSS_ENTRANCE.pending = false; BOSS_ENTRANCE.data = null;
    if (PF.el) {
        PF.el.classList.remove('boss-entry-stop', 'boss-entry-omen', 'boss-entry-reveal', 'boss-entry-engage', 'boss-hp-charge', 'boss-quake');
        PF.el.style.removeProperty('--bc');
    }
    const px = $('boss-omen-px');
    if (px) px.textContent = '';
    if (PF.foe) {
        PF.foe.node.classList.remove('boss-gone');
        PF.foe.ball.classList.remove('boss-drop', 'boss-superarmor');
    }
    const panel = $('boss-entrance');
    if (panel) {
        panel.classList.remove('on', 'leaving', 'gate-enter', 'slam');
        panel.removeAttribute('style');
        panel.setAttribute('aria-hidden', 'true');
    }
    paintBossEntranceHp({ hpShown: Math.max(0, enemy.hp), maxHp: Math.max(1, enemy.maxHp) });
}

function queueBossEntrance() {
    hideBossEntrance();
    if (!enemy.boss) return;
    const gate = gateOn();
    const timing = bossEntranceTiming(gate);
    const element = ELEMENTS[enemy.element] || ELEMENTS.fire;
    BOSS_ENTRANCE.seq = PF.foeSeq;
    BOSS_ENTRANCE.pending = true;
    BOSS_ENTRANCE.elapsed = 0;
    BOSS_ENTRANCE.duration = timing.intro + timing.charge;
    BOSS_ENTRANCE.data = {
        name: bossAppearanceName(), title: BOSS_TITLES[enemy.element] || '未知之影',
        image: enemy.battleSkinUrl, alpha: !!enemy.battleSkinAlpha, gate, element: enemy.element, color: element.color,
        floor: gate ? gateOf().gate : `無限波利塔 · 第 ${stage} 層`,
        timing, phase: 0, state: 'INTRO', hpShown: 0, hpMarks: 0, maxHp: Math.max(1, enemy.maxHp),
        freezeAt: performance.now()
    };
    if (PF.el) {
        PF.el.style.setProperty('--bc', element.color);
        PF.el.classList.add('boss-entry-stop');
    }
}

// 粒子從外圈往法陣中心收束；角度平均分佈再加一點抖動，才不會像節拍器
function spawnBossParticles() {
    const layer = $('boss-omen-px');
    if (!layer) return;
    layer.textContent = '';
    const count = 20;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('i');
        p.className = 'boss-px';
        p.style.setProperty('--a', ((i / count) * 360 + Math.random() * 14).toFixed(1) + 'deg');
        p.style.setProperty('--d', (150 + Math.random() * 110).toFixed(0) + 'px');
        p.style.setProperty('--dl', (Math.random() * 0.22).toFixed(2) + 's');
        p.style.width = p.style.height = (3 + Math.round(Math.random() * 4)) + 'px';
        layer.appendChild(p);
    }
}

function openBossEntrance(data) {
    const panel = $('boss-entrance');
    if (!panel) return;
    $('boss-entrance-floor').textContent = data.floor;
    // 跟技能插播同一種排版：上面一行小字是事件＋稱號，下面才是王名
    $('boss-entrance-title').textContent = '⚠ BOSS 登場　' + data.title;
    $('boss-entrance-name').textContent = data.name;
    panel.classList.toggle('gate-enter', data.gate);
    panel.classList.remove('on', 'leaving');
    panel.setAttribute('aria-hidden', 'true');

    // 第一幕：王先藏起來，場地先變色
    if (PF.foe) PF.foe.node.classList.add('boss-gone');
    if (PF.el) PF.el.classList.add('boss-entry-omen');
    spawnBossParticles();
    paintBossEntranceHp(data);
    SFX.tone(92, 48, .55, 'sine', .18, 0, .03);
    SFX.noise(.5, .06, 900, 220, 0, { mode: 'band' });
}

function beginBossReveal(data) {
    if (PF.el) {
        PF.el.classList.remove('boss-entry-omen');
        PF.el.classList.add('boss-entry-reveal', 'boss-quake');
        setTimeout(() => { if (PF.el) PF.el.classList.remove('boss-quake'); }, 620);
    }
    if (PF.foe) {
        PF.foe.node.classList.remove('boss-gone');
        PF.foe.ball.classList.add('boss-drop', 'boss-superarmor');
    }
    const b = PF.foe;
    if (b) {
        FX.smoke('puff', b.x, b.y + b.r * .7, data.element, 260);
        FX.smoke('ring', b.x, b.y + b.r * .4, data.element, 200);
        FX.sparks(b.x, b.y + b.r * .5, data.color, 18);
    }
    const panel = $('boss-entrance');
    if (panel) {
        positionBossEntrance();
        panel.classList.remove('leaving');
        panel.classList.add('on', 'slam');
        panel.setAttribute('aria-hidden', 'false');
    }
    SFX.tone(70, 30, .5, 'sine', .3, 0, .002);
    SFX.tone(150, 52, .3, 'square', .12, 0, .002);
    SFX.noise(.4, .12, 2200, 260, 0, { mode: 'band' });
}

function beginBossCharge(data) {
    data.state = 'CHARGE';
    data.chargeStartedAt = performance.now();
}

function finishBossEntrance(data) {
    if (PF.el) PF.el.classList.remove('boss-entry-stop');
    data.state = 'PLAY';
    shiftBossEntranceClocks(data);
    const pilot = partyPilot();
    if (pilot && pilot.body) {
        const b = pilot.body;
        b.x = W / 2; b.y = -50; b.vx = 0; b.vy = 0; b.introDrop = true;
        syncPartyFormation(true);
        for (const m of aliveMembers()) if (m.body) m.body.node.style.transform = `translate(${m.body.x}px, ${m.body.y}px)`;
    }
}

function beginBossEngage(data) {
    if (PF.el) {
        PF.el.classList.remove('boss-entry-reveal');
        PF.el.classList.add('boss-entry-engage', 'boss-hp-charge');
    }
    const panel = $('boss-entrance');
    if (panel) {
        positionBossEntrance();
        panel.classList.remove('leaving');
        panel.classList.add('on');
        panel.classList.remove('slam');
        panel.setAttribute('aria-hidden', 'false');
    }
    data.hpShown = 0; data.hpMarks = 0;
    paintBossEntranceHp(data);
    SFX.tone(320, 640, .18, 'triangle', .12, 0, .004);
    SFX.tone(640, 960, .16, 'square', .05, .1, .004);
}

function updateBossEntrance(dtMs) {
    const data = BOSS_ENTRANCE.data;
    if (!data) return;
    if (BOSS_ENTRANCE.seq !== PF.foeSeq || !enemy.boss || enemy.hp <= 0) { hideBossEntrance(); return; }
    const frame = $('pf-frame');
    // 門戰不經 showScreen，inline display 一直是 none（靠 CSS !important 顯示），
    // 所以用實際版面判斷戰場有沒有在畫面上，不能只看 inline style
    if (PF.paused || !PF.ready || !PF.running || (frame && !frame.offsetWidth)) return;

    if (BOSS_ENTRANCE.pending) {
        BOSS_ENTRANCE.pending = false;
        openBossEntrance(data);
    }

    if (data.phase >= 1 && data.phase <= 2) positionBossEntrance();

    BOSS_ENTRANCE.elapsed += dtMs;
    const t = BOSS_ENTRANCE.elapsed, tm = data.timing;
    if (data.phase === 0 && t >= tm.name) { data.phase = 1; beginBossReveal(data); }
    if (data.phase === 1 && t >= tm.intro) {
        data.phase = 2; beginBossCharge(data); beginBossEngage(data);
    }
    if (data.phase === 2) {
        const chargeElapsed = t - tm.intro;
        const k = Math.max(0, Math.min(1, chargeElapsed / tm.charge));
        const eased = 1 - Math.pow(1 - k, 3);
        data.hpShown = Math.round(data.maxHp * eased);
        paintBossEntranceHp(data);
        // 充能到三分之一就補一顆音，聽起來像儀錶在跳
        const mark = (data.hpMarks + 1) / 3;
        if (data.hpMarks < 3 && eased >= mark) {
            data.hpMarks++;
            SFX.tone(520 + data.hpMarks * 150, 700 + data.hpMarks * 160, .09, 'square', .07, 0, .002);
        }
        if (k >= 1) {
            data.phase = 3;
            finishBossEntrance(data);
            const panel = $('boss-entrance');
            if (panel) panel.classList.add('leaving');
        }
    }
    if (t >= BOSS_ENTRANCE.duration) hideBossEntrance();
}
