/* FEVER 速度感特效：速度線＋霓虹粒子＋鏡頭震動。
   畫在 #pf-vfx 的獨立 canvas 上，由 feverStart() 啟動、feverEnd() 收掉；
   開頭 450ms 是密集衝刺，之後只留少量細線持續飄，FEVER 結束時淡出。 */
(function () {
    "use strict";
    const LINE_COLORS = ["#ffffff", "#00ffff"];
    const P_COLORS = ["#ff007f", "#ffd700", "#ffffff"];
    const ENTRY_MS = 450;
    const ENTRY_CAP = 84;
    const AMBIENT_CAP = 26;
    const FADE_MS = 260;

    let canvas = null, g = null, raf = 0;
    let lines = [], parts = [];
    let w = 0, h = 0;
    let t0 = 0, running = false, fading = false, fadeAt = 0;
    let lastFrame = 0, lastLineAt = 0;
    let shakeEls = [], shakeAmp = 0;

    const rnd = (a, b) => a + Math.random() * (b - a);
    const lerp = (a, b, k) => a + (b - a) * k;

    function spawnLine(entry) {
        const left = Math.random() < 0.5;
        const speed = entry ? rnd(18, 46) : rnd(14, 26);
        lines.push({
            x: left ? Math.random() * (w * 0.15) : w * 0.85 + Math.random() * (w * 0.15),
            y: h + 40,
            speed,
            len: speed * (entry ? 3.2 : 2.2),
            width: entry ? rnd(2, 5) : rnd(1.5, 3),
            color: Math.random() < 0.7 ? LINE_COLORS[0] : LINE_COLORS[1],
            alpha: entry ? 1 : 0.6
        });
    }

    function spawnBurst(cx, cy, n) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, sp = rnd(5, 17);
            parts.push({
                x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                size: rnd(3, 8),
                color: P_COLORS[(Math.random() * 3) | 0],
                alpha: 1, decay: rnd(0.02, 0.05)
            });
        }
    }

    function applyShake(k) {
        if (shakeAmp > 0.15) {
            const t = performance.now() * 0.22;
            const ox = Math.round(Math.sin(t) * shakeAmp);
            const oy = Math.round(Math.cos(t * 1.2) * shakeAmp);
            for (const el of shakeEls) el.style.translate = `${ox}px ${oy}px`;
            shakeAmp = lerp(shakeAmp, 0, Math.min(1, 0.10 * k));
        } else if (shakeAmp) {
            shakeAmp = 0;
            for (const el of shakeEls) el.style.translate = "";
        }
    }

    function step(now) {
        if (!running) return;
        const k = Math.min(3, Math.max(0.2, (now - lastFrame) / 16.67));
        lastFrame = now;
        const t = now - t0;
        const entry = t < ENTRY_MS;

        if (entry) {
            for (let i = 0; i < 3 && lines.length < ENTRY_CAP; i++) spawnLine(true);
        } else if (lines.length < AMBIENT_CAP && now - lastLineAt > 32) {
            spawnLine(false);
            lastLineAt = now;
        }

        g.clearRect(0, 0, w, h);

        for (let i = lines.length - 1; i >= 0; i--) {
            const p = lines[i];
            p.y -= p.speed * k;
            if (p.y < -p.len) { lines.splice(i, 1); continue; }
            g.globalAlpha = p.alpha;
            g.fillStyle = p.color;
            if (p.color === LINE_COLORS[1]) { g.shadowBlur = 6; g.shadowColor = p.color; }
            g.fillRect(p.x, p.y, p.width, p.len);
            g.shadowBlur = 0;
        }

        g.globalCompositeOperation = "screen";
        for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i];
            p.x += p.vx * k;
            p.y += p.vy * k;
            p.alpha -= p.decay * k;
            if (p.alpha <= 0) { parts.splice(i, 1); continue; }
            g.globalAlpha = p.alpha;
            g.shadowBlur = 12;
            g.shadowColor = p.color;
            g.fillStyle = p.color;
            g.beginPath();
            g.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            g.fill();
        }
        g.shadowBlur = 0;
        g.globalAlpha = 1;
        g.globalCompositeOperation = "source-over";

        applyShake(k);

        if (fading) {
            const left = 1 - (now - fadeAt) / FADE_MS;
            canvas.style.opacity = Math.max(0, left).toFixed(3);
            if (left <= 0) { hardStop(); return; }
        }
        raf = requestAnimationFrame(step);
    }

    function hardStop() {
        cancelAnimationFrame(raf);
        raf = 0;
        running = false;
        if (canvas) { canvas.remove(); canvas = null; g = null; }
        for (const el of shakeEls) el.style.translate = "";
        shakeEls = [];
        lines = []; parts = []; shakeAmp = 0; fadeAt = 0; fading = false;
    }

    function start(container, opts) {
        if (!container) return;
        hardStop();
        opts = opts || {};
        w = container.clientWidth || 430;
        h = container.clientHeight || 760;
        canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;image-rendering:pixelated";
        canvas.dataset.feverRush = "1";
        container.appendChild(canvas);
        g = canvas.getContext("2d");

        const field = opts.field || null;
        shakeEls = field ? [field,
            field.parentElement && field.parentElement.querySelector(".pf-bg"),
            field.parentElement && field.parentElement.querySelector(".pf-turf"),
            field.parentElement && field.parentElement.querySelector(".pf-grid")
        ].filter(Boolean) : [];

        const cx = opts.x == null ? w / 2 : opts.x;
        const cy = opts.y == null ? h * 0.72 : opts.y;
        spawnBurst(cx, cy, 22);
        setTimeout(() => { if (running) spawnBurst(cx + rnd(-46, 46), cy + rnd(-60, 40), 16); }, 110);
        setTimeout(() => { if (running) spawnBurst(cx + rnd(-70, 70), cy + rnd(-90, 50), 16); }, 220);
        setTimeout(() => { if (running) spawnBurst(cx + rnd(-80, 80), cy + rnd(-120, 30), 12); }, 330);

        t0 = performance.now();
        lastFrame = t0; lastLineAt = t0;
        shakeAmp = opts.shake == null ? 12 : opts.shake;
        fading = false;
        running = true;
        raf = requestAnimationFrame(step);
    }

    function stop() {
        if (!running || fading) return;
        fading = true;
        fadeAt = performance.now();
        shakeAmp = 0;
        for (const el of shakeEls) el.style.translate = "";
    }

    window.FeverRush = { start, stop };
})();
