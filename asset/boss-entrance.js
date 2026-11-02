// BOSS 登場：預兆 → 名稱砸入 → 血條充能 → 解鎖戰鬥
const BOSS_ENTRANCE = { seq: -1, pending: false, elapsed: 0, duration: 2000, data: null };

// 稱號按屬性給：BOSS 名字本身已經帶「・」副名，橫幅再補一層身分
const BOSS_TITLES = {
    fire: '炎災之孽', water: '珊潮之華', wind: '裂空之嵐',
    thunder: '天罰之雷', light: '聖詠之座', dark: '蝕夜之影'
};

function bossAppearanceName() {
    const names = { 'angeling.png': '天使波利', 'ghostring.png': '幽靈波利', 'deviling.png': '惡魔波利' };
    const file = (enemy.battleSkinUrl || '').split('/').pop();
    return names[file] || enemy.name;
}

// 異界迴廊的王比較大尾，節奏再放慢一格
function bossEntranceTiming(gate) {
    return { name: 820, intro: 1800, charge: 760 };
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
    BattleLifecycle.shiftDeadlines(PF, stopped);
    if (GATE.id) GATE.t0 += stopped;
    data.freezeAt = null;
}

function paintBossEntranceHp(data) {
    const bar = $('enemy-hp-bar'), txt = $('enemy-hp-txt');
    if (bar) bar.style.width = clampPct(data.hpShown / data.maxHp);
    if (txt) txt.textContent = `${data.hpShown}/${data.maxHp}`;
}

function hideBossEntrance() {
    const data = BOSS_ENTRANCE.data;
    shiftBossEntranceClocks(data);
    BOSS_ENTRANCE.pending = false; BOSS_ENTRANCE.data = null;
    if (PF.el) {
        PF.el.classList.remove('boss-entry-stop', 'boss-entry-omen', 'boss-entry-reveal', 'boss-entry-engage', 'boss-hp-charge', 'boss-quake');
        PF.el.style.removeProperty('--bc');
    }
    const fxLayer = $('boss-fx-back'); if (fxLayer) fxLayer.textContent = '';
    if (PF.foe) {
        PF.foe.node.classList.remove('boss-gone');
        PF.foe.ball.classList.remove('boss-drop', 'boss-superarmor');
    }
    const panel = $('boss-entrance');
    if (panel) {
        panel.classList.remove('on', 'leaving', 'gate-enter');
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

// pixelfx 匯出的登場橫條：尺寸／幀數／時長全寫在 CSS 的 .boss-fx-* 上，
// 這裡只決定落在哪個座標、放大多少、播完幾毫秒後把節點收掉。
// 全部掛在 #boss-fx-back —— 那層排在 .pf-field 前面，特效在他背後炸，不會把他糊掉。
const BOSS_FX = {
    pillar: { host: 'boss-fx-back', life: 1260 },
    slam:   { host: 'boss-fx-back', life: 320 },
    burst:  { host: 'boss-fx-back', life: 820 },
    rays:   { host: 'boss-fx-back', life: 780 }
};

function playBossFx(key, x, y, sx, sy) {
    const cfg = BOSS_FX[key];
    const host = cfg && $(cfg.host);
    if (!host) return;
    const n = document.createElement('div');
    n.className = 'boss-fx boss-fx-' + key;
    n.style.cssText = `--fx:${Math.round(x)}px;--fy:${Math.round(y)}px;--sx:${sx};--sy:${sy}`;
    host.appendChild(n);
    setTimeout(() => n.remove(), cfg.life);
}

// 演出座標：王腳下那一點（著地面），四條橫條都以它為中心
function bossFxAnchor() {
    const b = PF.foe;
    return { x: b ? b.x : W / 2, y: b ? b.y + b.r * .62 : H * .4 };
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

    // 第一幕：場上只剩一根照著落點的聚光，王還沒現身
    if (PF.foe) PF.foe.node.classList.add('boss-gone');
    if (PF.el) PF.el.classList.add('boss-entry-omen');
    paintBossEntranceHp(data);
    SFX.tone(92, 48, .55, 'sine', .18, 0, .03);
    SFX.noise(.5, .06, 900, 220, 0, { mode: 'band' });
}

// bossSlam 的著地幀在 60%（.78s 的 468ms），落地那拍才放衝擊，早一幀就變成飄下來的氣球
const BOSS_TOUCHDOWN_MS = 468;

function beginBossReveal(data) {
    if (PF.el) {
        PF.el.classList.remove('boss-entry-omen');
        PF.el.classList.add('boss-entry-reveal');
    }
    if (PF.foe) {
        PF.foe.node.classList.remove('boss-gone');
        PF.foe.ball.classList.add('boss-drop', 'boss-superarmor');
    }
    // 落下途中只有全黑遮罩、一道天光與低頻：震屏、煙霧、名稱卡全部留給著地那一拍
    const a = bossFxAnchor();
    // 光柱的地面法陣在源圖第 195 行（框高 232），放大 2.15 倍後離中心 170px；
    // 把中心往上抬這麼多，法陣才會正好落在王腳下那一點
    playBossFx('pillar', a.x, a.y - 170, 2.15, 2.15);
    data.touchdownAt = data.timing.name + BOSS_TOUCHDOWN_MS;
    SFX.tone(70, 30, .5, 'sine', .3, 0, .002);
    SFX.tone(150, 52, .3, 'square', .12, 0, .002);
}

function bossTouchdown(data) {
    if (BOSS_ENTRANCE.data !== data || !PF.foe) return;
    const b = PF.foe;
    const iy = b.y + b.r * .62;
    // 放射線撐到場地寬的 1.2 倍、縱向 421px：再大就把整個畫面洗白，王的輪廓會一起消失；
    // 腳下再補一團黑煙，它是實心形體，不能一起拉長，否則會變成一顆拉糊的黑棗
    playBossFx('slam', b.x, iy, 1.2, 2.34);
    playBossFx('burst', b.x, iy, 1.1, 1.1);
    if (PF.el) {
        PF.el.classList.add('boss-quake');
        setTimeout(() => { if (PF.el) PF.el.classList.remove('boss-quake'); }, 760);
    }
    FX.sparks(b.x, b.y + b.r * .5, data.color, 18);
    if (PF.vfx) {
        const flash = document.createElement('div');
        flash.className = 'boss-whiteout';
        PF.vfx.appendChild(flash);
        setTimeout(() => flash.remove(), 260);
    }
    const panel = $('boss-entrance');
    if (panel) {
        panel.classList.remove('leaving');
        panel.classList.add('on');
        panel.setAttribute('aria-hidden', 'false');
    }
    SFX.tone(52, 26, .62, 'sine', .34, 0, .002);
    SFX.noise(.42, .16, 1800, 120, 0, { mode: 'band' });
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
        // 從 Boss 碰撞區下方進場，避免開場從頭頂直落連撞造成秒殺；縮短落地距離但仍保留落場動作。
        const bossBottom = PF.foe ? PF.foe.y + PF.foe.r + b.r + 22 : H * .46;
        b.x = W / 2; b.y = Math.max(H * .48, bossBottom); b.vx = 0; b.vy = 0; b.introDrop = true;
        syncPartyFormation(true);
        for (const m of aliveMembers()) if (m.body) m.body.node.style.transform = `translate(${m.body.x}px, ${m.body.y}px)`;
    }
}

function beginBossEngage(data) {
    if (PF.el) {
        PF.el.classList.remove('boss-entry-reveal');
        PF.el.classList.add('boss-entry-engage', 'boss-hp-charge');
    }
    // 充能這拍從他背後打一道天光：血條灌滿時，光是從他身上出來的，不是場地亮的
    const a = bossFxAnchor();
    playBossFx('rays', a.x, a.y - 40, 1.34, 2.6);
    const panel = $('boss-entrance');
    if (panel) {
        panel.classList.remove('leaving');
        panel.classList.add('on');
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

    BOSS_ENTRANCE.elapsed += dtMs;
    const t = BOSS_ENTRANCE.elapsed, tm = data.timing;
    if (data.phase === 0 && t >= tm.name) { data.phase = 1; beginBossReveal(data); }
    if (data.phase >= 1 && !data.touchedDown && t >= data.touchdownAt) {
        data.touchedDown = true; bossTouchdown(data);
    }
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
