// BOSS 機制特效：把「有數值、沒畫面」的王關機制翻成看得懂的視覺。
// 只讀狀態、不改判定；接線靠包裹既有全域函式，避免動到 index.html 的戰鬥邏輯。
const BOSS_MECH_FX = {
    telegraph: .55,     // 俯衝預警窗口（秒）：只讀 e.timer，攻擊時間一點都不延後
    ringLead: 4000,     // 冷卻環最後 4 秒才亮，避免整場都有一圈雜訊
    doomLead: 1300,     // 讀條剩這麼久 → 準星釘在每顆球上，講清楚「倒數完打誰」
    critical: .25,      // 讀條剩 25% 開始紅框閃
    criticalFast: .12
};

const BMX = { layer: null, seq: -1, ring: null, aim: null, lock: null, dome: null, count: null,
    tethers: [], doom: [], immuneAt: 0, killAt: 0 };

function bmxLayer() {
    if (!PF.field) return null;
    if (BMX.layer && BMX.layer.isConnected) return BMX.layer;
    const l = el("div", "bmx-layer");
    BMX.layer = l; BMX.seq = -1;
    BMX.ring = BMX.aim = BMX.lock = BMX.dome = BMX.count = null;
    BMX.tethers = []; BMX.doom = [];
    PF.field.appendChild(l);
    return l;
}

function bmxNode(cache, key, cls, parent, inner) {
    let n = cache[key];
    if (n && n.isConnected) return n;
    n = el("div", cls);
    if (inner) n.innerHTML = inner;
    (parent || BMX.layer).appendChild(n);
    cache[key] = n;
    return n;
}

function bmxPlace(n, x, y) {
    n.style.left = x + "px";
    n.style.top = y + "px";
}

// 跟 tickRegularEnemyAttack 同一個選目標規則：最近的一隻活著的角色
function bmxDiveTarget() {
    const targets = aliveMembers();
    let best = null, bd = Infinity;
    for (const m of targets) {
        const d = Math.hypot(m.body.x - PF.foe.x, m.body.y - PF.foe.y);
        if (d < bd) { bd = d; best = m; }
    }
    return best;
}

function bmxRingState(now) {
    if (PF.bossSummonActive) {
        const all = PF.summonedFoes.length;
        return { cls: "immune", p: all ? PF.summonedFoes.filter(enemyUnitAlive).length / all : 1 };
    }
    if (PF.breakUntil > now) return { cls: "break", p: clamp((PF.breakUntil - now) / 6000, 0, 1) };
    if (PF.weak) {
        const left = PF.weak.at + PF.weak.dur - now;
        return { cls: "charge", p: clamp(left / Math.max(1, PF.weak.dur), 0, 1) };
    }
    if (PF.nextCastAt > now && PF.nextCastAt - now <= BOSS_MECH_FX.ringLead) {
        return { cls: "cool", p: 1 - (PF.nextCastAt - now) / BOSS_MECH_FX.ringLead };
    }
    return null;
}

function bossMechPump(now) {
    now = now || performance.now();
    const layer = bmxLayer();
    if (!layer) return;
    const boss = PF.foe;
    const frame = $("pf-frame");
    const active = boss && enemy.boss && enemy.hp > 0 && !bossEntranceFreezesBattle() &&
        !!PF.el && (!frame || frame.offsetWidth);
    if (!active) {
        if (BMX.layer) BMX.layer.textContent = "";
        BMX.ring = BMX.aim = BMX.lock = BMX.dome = BMX.count = null;
        BMX.tethers = []; BMX.doom = [];
        PF.el && PF.el.classList.remove("bmx-critical");
        return;
    }
    if (BMX.seq !== PF.foeSeq) { BMX.seq = PF.foeSeq; layer.textContent = ""; BMX.ring = BMX.aim = BMX.lock = BMX.dome = BMX.count = null; BMX.tethers = []; BMX.doom = []; }

    // 1) 王身上那一顆環：冷卻／蓄力／破防／無敵，一個元件講完四個倒數
    const st = bmxRingState(now);
    if (st) {
        const ring = bmxNode(BMX, "ring", "bmx-ring " + st.cls, layer);
        if (!ring.classList.contains(st.cls)) ring.className = "bmx-ring " + st.cls;
        ring.style.setProperty("--d", Math.round((boss.r + 34) * 2) + "px");
        ring.style.setProperty("--p", st.p.toFixed(3));
        bmxPlace(ring, boss.x, boss.y);
    } else if (BMX.ring) { BMX.ring.remove(); BMX.ring = null; }

    // 2) 俯衝預警：目標框＋往目標跑的瞄準線；顏色就是俯衝速度等級
    const gateBoss = enemy.boss && gateOn() && !TRAINING_MODE;
    const tier = gateBoss ? (PF.bossEnraged ? "tier-rage" : "tier-mid") : "";
    const ready = !boss.diving && (boss.castingUntil || 0) <= now && !PF.bossSummonActive && now >= (PF.stunUntil || 0);
    const secs = boss.timer == null ? 99 : boss.timer;
    if (ready && secs <= BOSS_MECH_FX.telegraph) {
        const target = bmxDiveTarget();
        if (target) {
            const k = 1 + clamp(secs / BOSS_MECH_FX.telegraph, 0, 1) * .55;   // 越接近出招，框收得越緊
            const dx = target.body.x - boss.x, dy = target.body.y - boss.y;
            const ang = Math.atan2(dy, dx);
            const line = bmxNode(BMX, "aim", "bmx-aimline" + (tier ? " " + tier : ""), layer);
            line.className = "bmx-aimline" + (tier ? " " + tier : "");
            line.style.width = Math.max(0, Math.hypot(dx, dy) - target.body.r - 6) + "px";
            line.style.left = boss.x + "px";
            line.style.top = boss.y + "px";
            line.style.transform = `translateY(-50%) rotate(${ang}rad)`;
            const lock = bmxNode(BMX, "lock", "bmx-lock" + (tier ? " " + tier : ""), layer, "<i></i><i></i><i></i><i></i>");
            lock.className = "bmx-lock" + (tier ? " " + tier : "");
            lock.style.setProperty("--k", k.toFixed(3));
            bmxPlace(lock, target.body.x, target.body.y);
        }
    } else {
        if (BMX.aim) { BMX.aim.remove(); BMX.aim = null; }
        if (BMX.lock) { BMX.lock.remove(); BMX.lock = null; }
    }

    // 3) 召喚無敵：護罩罩住王，每隻還活著的嘍囉一條牽引線——「為什麼打不到」直接畫出來
    if (PF.bossSummonActive) {
        const dome = bmxNode(BMX, "dome", "bmx-dome", layer);
        dome.style.width = Math.round(boss.r * 5.4) + "px";
        dome.style.height = Math.round(boss.r * 4.1) + "px";
        bmxPlace(dome, boss.x, boss.y - boss.r * .18);
        const alive = PF.summonedFoes.filter(enemyUnitAlive);
        while (BMX.tethers.length < alive.length) BMX.tethers.push(el("div", "bmx-tether"));
        while (BMX.tethers.length > alive.length) BMX.tethers.pop().remove();
        alive.forEach((u, i) => {
            const n = BMX.tethers[i];
            if (!n.isConnected) layer.appendChild(n);
            const dx = u.x - boss.x, dy = u.y - boss.y;
            n.style.width = Math.hypot(dx, dy) + "px";
            n.style.left = boss.x + "px";
            n.style.top = boss.y + "px";
            n.style.transform = `translateY(-50%) rotate(${Math.atan2(dy, dx)}rad)`;
        });
        const cnt = bmxNode(BMX, "count", "bmx-summon-count", layer);
        cnt.textContent = `無敵中・先清嘍囉 ${alive.length}/${PF.summonedFoes.length}`;
        bmxPlace(cnt, boss.x, Math.max(70, boss.y - boss.r - 96));
    } else {
        if (BMX.dome) { BMX.dome.remove(); BMX.dome = null; }
        if (BMX.count) { BMX.count.remove(); BMX.count = null; }
        if (BMX.tethers.length) { BMX.tethers.forEach(n => n.remove()); BMX.tethers = []; }
    }

    // 4) 讀條臨界：早就存在卻沒人掛的紅框接上；越接近歸零閃越快
    if (PF.weak) {
        const left = PF.weak.at + PF.weak.dur - now;
        const ratio = left / Math.max(1, PF.weak.dur);
        const warn = ratio <= BOSS_MECH_FX.critical;
        PF.el.classList.toggle("weak-screen", warn);
        PF.el.classList.toggle("bmx-critical", ratio <= BOSS_MECH_FX.criticalFast);
        // 5) 懲罰來源：倒數快到底就把準星釘在每顆球上，毀滅砲落下來才有原因
        if (left <= BOSS_MECH_FX.doomLead) {
            const targets = aliveMembers();
            while (BMX.doom.length < targets.length) BMX.doom.push(el("div", "bmx-doom-mark"));
            while (BMX.doom.length > targets.length) BMX.doom.pop().remove();
            targets.forEach((m, i) => {
                const n = BMX.doom[i];
                if (!n.isConnected) layer.appendChild(n);
                bmxPlace(n, m.body.x, m.body.y);
            });
        } else if (BMX.doom.length) { BMX.doom.forEach(n => n.remove()); BMX.doom = []; }
    } else {
        PF.el.classList.remove("bmx-critical");
        if (BMX.doom.length) { BMX.doom.forEach(n => n.remove()); BMX.doom = []; }
    }

    // 6) 蓄力／崩潰槽：markup 一直在，是 HUD 那兩條 display:none 把它壓死
    const gauge = $("boss-down-gauge"), fill = gauge && gauge.firstElementChild;
    if (gauge && fill) {
        const brk = PF.breakUntil > now;
        const imm = PF.bossSummonActive;
        gauge.classList.toggle("brk", brk);
        gauge.classList.toggle("imm", imm && !brk);
        const p = brk ? (PF.breakUntil - now) / 6000
            : PF.weak ? (PF.weak.at + PF.weak.dur - now) / Math.max(1, PF.weak.dur)
            : imm ? 1 : 0;
        fill.style.width = (clamp(p, 0, 1) * 100).toFixed(1) + "%";
    }
}

// 無敵期間打王：傷害被吞掉是判定，不是畫面；這裡只補「為什麼是 0」
function bmxImmuneFeedback() {
    const now = performance.now();
    const boss = PF.foe;
    if (!boss || now - BMX.immuneAt < 420) return;
    BMX.immuneAt = now;
    FX.pop(boss.x, boss.y - boss.r - 14, "免疫", "weak", .95, "#9ff2ff");
    const dome = BMX.dome;
    if (dome && dome.isConnected) {
        dome.style.animation = "none"; void dome.offsetWidth;
        dome.style.animation = "";
    }
}

// 擊破那一拍要跟小怪分開：小怪只有 300ms 翻轉，王給最重的一層
function bmxBossDeath() {
    const now = performance.now();
    if (now - BMX.killAt < 1200) return;
    BMX.killAt = now;
    const boss = PF.foe;
    if (!boss || !PF.field) return;
    const a = bossFxAnchor();
    triggerHitStop(120, now);
    playBossFx("burst", a.x, a.y - 26, 1.85, 1.85);      // 這條橫條一直只有宣告、沒人呼叫
    playBossFx("slam", a.x, a.y, 1.3, 2.4);
    const shock = el("div", "bmx-kill-shock");
    bmxPlace(shock, a.x, a.y);
    PF.field.appendChild(shock);
    setTimeout(() => shock.remove(), 780);
    if (PF.vfx) {
        const flash = el("div", "boss-whiteout");
        PF.vfx.appendChild(flash);
        setTimeout(() => flash.remove(), 260);
    }
    FX.shake();
    const title = el("div", "bmx-kill-title");
    title.innerHTML = "BOSS 擊破<small>首領癱瘓・獎勵結算中</small>";
    (PF.vfx || PF.field).appendChild(title);
    setTimeout(() => title.remove(), 940);
}

(function installBossMechFx() {
    const origApply = window.applyDamage;
    if (typeof origApply === "function") {
        window.applyDamage = function (srcCh, dmg, opt) {
            const dealt = origApply.apply(this, arguments);
            if (dealt === 0 && dmg > 0 && PF.bossSummonActive && gateOn() && !TRAINING_MODE &&
                (!opt || !opt.target || opt.target === PF.foe)) bmxImmuneFeedback();
            return dealt;
        };
    }
    const origCheckKill = window.checkKill;
    if (typeof origCheckKill === "function") {
        window.checkKill = function () {
            const firstBlood = enemy.boss && enemy.hp <= 0 && PF.waveResolvedSeq !== PF.foeSeq && !bossEntranceFreezesBattle();
            const r = origCheckKill.apply(this, arguments);
            if (firstBlood) bmxBossDeath();
            return r;
        };
    }

    let raf = 0;
    (function loop() {
        raf = requestAnimationFrame(loop);
        try { bossMechPump(); } catch (e) { /* 特效不準把戰鬥弄停 */ }
    })();

    window.BossMechFx = { pump: bossMechPump, cfg: BOSS_MECH_FX, death: bmxBossDeath, raf: () => raf };
})();
