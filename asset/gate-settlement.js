// 境界領域通關結算畫面。
// 這一層是在戰場被凍住（PF.paused）之後才蓋上來的，pfLoop 那條時間軸根本不走，
// 所以整段節拍只能用 wall-clock 的 setTimeout，數字滾動另走一支 rAF 幫浦。
window.GateSettlement = (() => {
    const timers = [];
    const tweens = new Set();
    let rafId = 0;
    let skipped = true;
    let current = null;
    let onTap = null;

    // 節拍（毫秒）：橫幅→隊員落地→傷害計數→用時→分數→印章→紀錄→戰利品翻牌
    const T = { fig: 150, figStep: 110, dmg: 700, dmgDur: 520, time: 950, timeDur: 620,
        score: 1620, scoreDur: 840, stamp: 2520, record: 2740,
        loot: 2900, lootStep: 175, burst: 860, tail: 620 };

    // 排程一律經過 after()：跳過動畫時要能一次清乾淨，殘節拍把已定格的畫面再演一次就糗了
    function after(ms, fn) { timers.push(setTimeout(fn, ms)); }
    function pump(now) {
        rafId = 0;
        for (const t of [...tweens]) {
            // rAF 的時間戳是「這一幀開始的時刻」，可能比建 tween 時的 performance.now() 還早，
            // 不夾下界的話缓動曲線會算出負值，結算數字會先閃一下負數再爬
            const k = Math.max(0, Math.min(1, (now - t.t0) / t.dur));
            t.step(k);
            if (k >= 1) { tweens.delete(t); if (t.done) t.done(); }
        }
        if (tweens.size) rafId = requestAnimationFrame(pump);
    }
    function tween(dur, step, onDone) {
        tweens.add({ t0: performance.now(), dur, step, done: onDone });
        if (!rafId) rafId = requestAnimationFrame(pump);
    }
    function stopAll() {
        timers.splice(0).forEach(clearTimeout);
        tweens.clear();
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    }

    // 01:45.23 這種「分:秒.百分秒」；結算的緊張感就落在最後那兩格小數
    function clock(ms) {
        const t = Math.max(0, Math.round(+ms || 0));
        const m = Math.floor(t / 60000), s = Math.floor(t / 1000) % 60, cs = Math.floor(t / 10) % 100;
        return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
    }
    function comma(n) { return Math.round(Math.max(0, +n || 0)).toLocaleString("en-US"); }
    function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    }

    // 音效一律走 SFX 既成的合成器；沒有 AudioContext 時靜音，不會卡住流程
    function sfxTick() { SFX.tone(1180, 0, .07, "square", .09); }
    function sfxDing() { SFX.tone(1720, 0, .38, "sine", .17, 0, .003); SFX.tone(2580, 0, .5, "sine", .06, .012, .003); }
    function sfxStamp() { SFX.noise(.13, .5, 260, 70, 0, { mode: "hp" }); SFX.tone(152, 46, .2, "square", .28); }
    function sfxBurst() { [880, 1174, 1568, 2093].forEach((f, i) => SFX.tone(f, 0, .3, "triangle", .12, i * .055, .004)); }
    function sfxFanfare() { [523, 659, 784, 1046].forEach((f, i) => SFX.tone(f, 0, .3, "square", .13, i * .07, .005)); }

    const reduced = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches);
    const teamOf = () => PF.members.slice(0, 3);

    function build(res) {
        const elLabel = ELEMENTS[res.el] ? ELEMENTS[res.el].label : "";
        const members = teamOf();
        let mvpId = null, mvpDmg = 0;
        members.forEach(m => { const d = m.runDmg || 0; if (d > mvpDmg) { mvpDmg = d; mvpId = m.ch.id; } });

        const figs = members.map(m => {
            const name = charName(m.ch.id).slice(0, 4);
            const tag = m.down ? `<span class="sc-fig-tag down">倒下</span>`
                : (m.ch.id === mvpId && mvpDmg > 0 ? `<span class="sc-fig-tag mvp">MVP</span>` : "");
            return `<div class="sc-fig${m.down ? " down" : ""}" data-dmg="${Math.round(m.runDmg || 0)}">${tag}`
                + `<div class="sc-fig-art sprite-placeholder"></div>`
                + `<div class="sc-fig-nm">${esc(name)}</div>`
                + `<div class="sc-fig-dmg">0</div></div>`;
        }).join("");

        const drops = res.drops || {};
        const firstBreak = Math.max(0, Math.floor(+res.firstBreak || 0));
        const bonusStones = Math.max(0, Math.floor(+res.bonusStones || 0));
        const rainbowTotal = Math.max(0, Math.floor(+res.shards || 0)) + Math.max(0, Math.floor(+drops.rainbow || 0)) + firstBreak;
        const bossMaterialName = ({ fire: '赤焰龍的翅膀', water: '蒼溟貝的尾巴', wind: '金鷺鷲的鳥喙', thunder: '玄雷機的核心' })[res.el];
        const dropSummary = [
            `限定突破石 ×${comma(drops.breakthrough)}${bonusStones ? `（含階級 +${bonusStones}）` : ""}`,
            res.gold ? `金幣 ×${comma(res.gold)}` : "",
            `經驗水晶 ×${comma(drops.experience)}`,
            `高階經驗水晶 ×${comma(drops.highExperience)}`,
            drops.bossMaterial ? `${bossMaterialName} ×${comma(drops.bossMaterial)}` : "",
            drops.expeditionMedal ? `境界遠征勳章 ×${comma(drops.expeditionMedal)}` : "",
            drops.singleTicket ? `單抽招募券 ×${comma(drops.singleTicket)}` : "",
            drops.tenTicket ? `十抽招募券 ×${comma(drops.tenTicket)}` : ""
        ].filter(Boolean).join("　・　");
        const cells = [
            { ic: '<img src="asset/items/crystal.png" alt="">', v: "×" + comma(rainbowTotal),
              t: firstBreak ? `通關虹彩石・含階級首破 +${firstBreak}` : "通關虹彩石", rare: true },
            res.first ? { ic: "🏆", v: "首勝", t: "首次擊破獎勵", rare: true }
                      : { ic: "🔁", v: "第 " + comma(res.win) + " 次", t: "累計擊破", rare: false },
            { ic: "🎁", v: dropSummary, t: "額外戰利品", rare: false, wide: true },
            // 速度獎勵是總分的一節，不是會掉的寶；只有虹彩石／首通的東西才值得金光爆碎
            { ic: "⏱", v: res.timeBonus > 0 ? "+" + comma(res.timeBonus) : "—", t: "速度獎勵", rare: false }
        ];
        const loot = cells.map(c => `<div class="sc-cell${c.rare ? " rare" : ""}${c.wide ? " wide" : ""}">`
            + `<span class="ic">${c.ic}</span><b class="v">${esc(c.v)}</b><span class="t">${esc(c.t)}</span></div>`).join("");

        // 橫幅上的閃爍粒子：CSS 沒有隨機值，座標就在這裡寫死成互不重疊的幾顆
        const sparks = [[9, 18], [24, 74], [39, 34], [55, 82], [70, 22], [86, 62], [12, 80], [94, 40]]
            .map(([x, y], i) => `<i class="sc-spark" style="left:${x}%;top:${y}%;animation-delay:${(i * 173) % 900}ms"></i>`).join("");

        return `<div class="sc">`
            + `<div class="sc-band in"><b>${res.first ? "STAGE CLEAR" : "VICTORY"}</b>`
            + `<i class="replay">${res.first ? "FIRST KILL" : "第 " + comma(res.win) + " 次擊破"}</i>${sparks}</div>`
            + `<div class="sc-label">${esc(res.gate)}・${esc(res.boss)}</div>`
            + `<div class="sc-sub">${esc(elLabel)}屬性｜${res.first ? "首次擊破" : "再度擊破"}｜${res.tier ? "強化 +" + res.tier : "Lv." + (res.level || 100)}</div>`
            + `<div class="sc-mid">`
            + `<div class="sc-team"><span class="sc-cap">本場輸出</span><div class="sc-figs">`
            + (figs || '<div class="sc-sub">全隊陣亡</div>') + `</div></div>`
            + `<div class="sc-stats">`
            + `<span class="sc-k">CLEAR TIME</span><div class="sc-time">00:00.00</div>`
            + `<span class="sc-k" style="margin-top:5px">TOTAL SCORE</span><div class="sc-score">0</div>`
            + `<div class="sc-detail"><span>本場傷害</span><b>${fmt(res.dmg)}</b>`
            + `<span>王的生命</span><b>${fmt(res.hp)}</b>`
            + `<span>速度滿分線</span><b>${Math.round((res.parMs || 0) / 1000)}s</b></div>`
            + `<div class="sc-record">NEW RECORD!</div>`
            + `<div class="sc-sub sc-prev"></div>`
            + `<div class="sc-stamp"><i>${esc(res.rating || "C")}</i><small>RANK</small></div>`
            + `</div></div>`
            + `<div class="sc-loot">${loot}</div>`
            + (res.unlockedTier ? `<div class="sc-sub" style="color:#ffd257">🔓 已解鎖 ${esc(res.gate)} 強化 +${res.unlockedTier}</div>` : "")
            + `<div id="gate-reward-status" class="sc-sub" role="status">確認獎勵儲存中…</div><button id="gate-reward-save-retry" class="mini-btn gold" type="button" hidden onclick="retryGateRewardSave()">重試儲存獎勵</button>`
            + `<div class="sc-btns">`
            + `<button class="mini-btn gray" onclick="gateExit()">返回大廳</button>`
            + `<button class="mini-btn gold" id="gate-retry-button" onclick="gateRetry()">再挑戰一次（${StaminaSystem.GATE_COST} 體力）</button></div>`
            + `<div class="sc-skip">點擊任意處・跳過動畫</div></div>`;
    }

    function nodes() {
        const sc = document.querySelector("#pf-result .sc");
        if (!sc) return null;
        return {
            time: sc.querySelector(".sc-time"), score: sc.querySelector(".sc-score"),
            stamp: sc.querySelector(".sc-stamp"), record: sc.querySelector(".sc-record"),
            prev: sc.querySelector(".sc-prev"), skip: sc.querySelector(".sc-skip"),
            figs: [...sc.querySelectorAll(".sc-fig")], cells: [...sc.querySelectorAll(".sc-cell")]
        };
    }

    function paintFigs() {
        document.querySelectorAll("#pf-result .sc-fig").forEach((fig, i) => {
            const art = fig.querySelector(".sc-fig-art"), m = teamOf()[i];
            if (art && m) paintSprite(art, "hero", m.ch.id, "victory", charName(m.ch.id).slice(0, 1));
        });
    }

    function prevLine(res) {
        const prev = [];
        if (res.prevMs) prev.push("舊最快 " + clock(res.prevMs));
        if (res.prevScore) prev.push("舊最高分 " + comma(res.prevScore));
        return prev.join("｜");
    }

    // 一鍵跳過：把所有節拍清掉、每個元素直接補上最終狀態，結算立刻可用
    function settle(res) {
        const n = nodes();
        if (!n) return;
        stopAll();
        skipped = true;
        n.time.textContent = clock(res.ms);
        n.score.textContent = comma(res.score);
        n.stamp.classList.add("on");
        if (res.recordTime || res.recordScore) n.record.classList.add("on");
        n.prev.textContent = prevLine(res);
        n.figs.forEach(fig => {
            fig.classList.add("shown");
            // pop 只給 MVP 標用（CSS 就只抓 .pop .mvp），全部標上會讓這層語意變成雜訊
            if (fig.querySelector(".sc-fig-tag.mvp")) fig.classList.add("pop");
            const slot = fig.querySelector(".sc-fig-dmg");
            if (slot) slot.textContent = fmt(+fig.dataset.dmg || 0);
        });
        n.cells.forEach(c => c.classList.add("shown"));
        n.skip.remove();
    }

    function show(res) {
        const panel = document.getElementById("pf-result");
        if (!panel) return;
        stopAll();
        skipped = false;
        current = res;
        panel.innerHTML = build(res);
        if (!onTap) onTap = () => { if (!skipped) settle(current); };
        panel.addEventListener("pointerdown", onTap);
        paintFigs();
        if (reduced()) { settle(res); return; }

        const n = nodes();
        if (!n) return;
        sfxFanfare();
        n.figs.forEach((fig, i) => after(T.fig + i * T.figStep, () => { fig.classList.add("in"); sfxTick(); }));
        n.figs.forEach(fig => {
            const target = +fig.dataset.dmg || 0, slot = fig.querySelector(".sc-fig-dmg");
            if (!slot || target <= 0) return;
            after(T.dmg, () => tween(T.dmgDur, k => { slot.textContent = fmt(target * (1 - Math.pow(1 - k, 3))); },
                () => { slot.textContent = fmt(target); if (fig.querySelector(".sc-fig-tag.mvp")) fig.classList.add("pop"); }));
        });
        after(T.time, () => {
            const target = res.ms || 0;
            tween(T.timeDur, k => { n.time.textContent = clock(target * (1 - Math.pow(1 - k, 2))); },
                () => { n.time.textContent = clock(target); });
        });
        after(T.score, () => {
            const target = res.score || 0;
            tween(T.scoreDur, k => { n.score.textContent = comma(target * (1 - Math.pow(1 - k, 3))); },
                () => { n.score.textContent = comma(target); n.score.classList.add("lock"); sfxDing(); });
        });
        after(T.stamp, () => { n.stamp.classList.add("on"); sfxStamp(); FX.shake(); });
        after(T.record, () => {
            if (!(res.recordTime || res.recordScore)) return;
            n.record.classList.add("on");
            n.prev.textContent = prevLine(res);
            SFX.tone(1046, 1568, .26, "square", .14);
        });
        n.cells.forEach((cell, i) => {
            const at = T.loot + i * T.lootStep;
            after(at, () => { cell.classList.add("flip"); sfxTick(); });
            if (cell.classList.contains("rare")) after(at + T.burst, () => { cell.classList.add("burst"); sfxBurst(); });
        });
        after(T.loot + (n.cells.length - 1) * T.lootStep + T.burst + T.tail, () => { skipped = true; n.skip.remove(); });
    }

    function hide() {
        stopAll();
        skipped = true;
        const panel = document.getElementById("pf-result");
        if (panel && onTap) panel.removeEventListener("pointerdown", onTap);
    }

    return Object.freeze({ clock, comma, show, hide });
})();
