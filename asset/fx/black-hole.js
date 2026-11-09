/* 空間撕裂：先炸後吸。
   外圈用 pixelfx 的 outhole-eclipse（MIT）點陣光芒，160×144 一格、24 幀，這裡以 2 倍整數放大；
   素材中間那顆黑盤已在離線階段挖掉（outhole-eclipse-nocore.png），只留光環與射線；
   震波、裂縫、向心拖尾與碎片全部用 Canvas 手繪，維持同一套像素格。
   時間軸（ms）：0–300 外炸、300–2700 吸入、2700–3000 收束；draw() 只依 t 計算，可任意跳格。 */
(function () {
    "use strict";
    const FW = 160, FH = 144, K = 2;                      // 素材格 → 畫布像素
    const BLAST_END = 300, PULL_END = 2700, END = 3000;
    const R_SINK = 10;                                    // 碎片被吃掉的半徑（畫布像素）
    const A_OUT = 700, A_IN = -900;

    const COL = {
        v1: "#42156d", v2: "#7c2eb8", v3: "#c07ef5",
        c1: "#3fd8ff", c2: "#a8f4ff", white: "#ffffff", hot: "#fff6cf"
    };

    const hash = n => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
    const lerp = (a, b, k) => a + (b - a) * k;
    const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
    const easeOut = k => 1 - (1 - k) * (1 - k);
    const easeIn = k => k * k;

    const IMG = new Image();
    IMG.src = "asset/fx/pixelfx/outhole-eclipse-nocore.png";
    const ready = new Promise(res => { IMG.onload = () => res(true); IMG.onerror = () => res(false); });

    function rng(seed) {
        let s = seed >>> 0 || 1;
        return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    }
    function disc(g, cx, cy, r, col) {
        if (r <= 0) return;
        g.fillStyle = col;
        const R = Math.round(r), x0 = Math.round(cx), y0 = Math.round(cy);
        for (let y = -R; y <= R; y++) {
            const w = Math.floor(Math.sqrt(Math.max(0, R * R - y * y)));
            if (w < 0) continue;
            g.fillRect(x0 - w, y0 + y, w * 2 + 1, 1);
        }
    }
    // 破碎像素弧：靠雜訊跳格＋半徑抖動，避免出現完美正圓的細線
    function arc(g, cx, cy, r, col, size, skip, wobble, seed, alpha, squash) {
        if (r <= 0) return;
        g.fillStyle = col; g.globalAlpha = alpha;
        squash = squash == null ? 1 : squash;
        const N = Math.max(20, Math.round(r * 1.9));
        for (let i = 0; i < N; i++) {
            if (hash(i * 1.7 + seed) < skip) continue;
            const a = i / N * Math.PI * 2;
            const rr = r + (hash(i * 3.1 + seed) - 0.5) * wobble;
            g.fillRect(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr * squash), size, size);
        }
        g.globalAlpha = 1;
    }

    // 震波：每格半徑與厚度都各自跳動，連成一圈粗糙的碎塊，不會變成等距白點
    function shockwave(g, cx, cy, r, col, seed, alpha, squash) {
        if (r <= 2) return;
        squash = squash == null ? 1 : squash;
        g.fillStyle = col;
        const N = Math.max(28, Math.round(r * 3.2));
        for (let i = 0; i < N; i++) {
            const a = i / N * Math.PI * 2;
            const rr = r + (hash(i * 2.7 + seed) - 0.5) * (6 + r * 0.14);
            const th = 2 + Math.round(hash(i * 1.3 + seed) * 4);
            for (let d = 0; d < th; d += 2) {
                g.globalAlpha = alpha * (1 - d / (th + 3));
                g.fillRect(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * (rr + d) * squash), 2, 2);
            }
        }
        g.globalAlpha = 1;
    }

    function makeParticles(seed) {
        const rnd = rng(seed);
        const list = [];
        for (let i = 0; i < 190; i++) {
            const escape = rnd() < 0.26;                   // 少數碎片飛太遠，追不回來
            const r0 = 38 + rnd() * 16;
            const vr = escape ? 190 + rnd() * 210 : 45 + rnd() * 75;
            const size = rnd() < 0.35 ? 4 : rnd() < 0.7 ? 2 : 1;
            const p = {
                th0: rnd() * Math.PI * 2, r0, vr, size, escape,
                w: 0.5 + rnd() * 1.4,
                swirl: 0.9 + rnd() * 2.4,
                hue: rnd(),
                decay: 0.34 + rnd() * 0.24
            };
            const ts = BLAST_END / 1000;
            p.v1 = p.vr + A_OUT * ts;
            p.r1 = p.r0 + p.vr * ts + 0.5 * A_OUT * ts * ts;
            p.tStop = p.v1 / -A_IN;
            p.rPeak = p.r1 + p.v1 * p.v1 / (2 * -A_IN);
            p.tPeak = ts + p.tStop;
            p.tGone = p.escape ? 0.85 + rnd() * 0.5
                : Math.min(2.78, p.tPeak + Math.log(Math.max(1.05, p.rPeak / R_SINK)) / p.decay);
            list.push(p);
        }
        return list;
    }

    function particleAt(p, t, cx, cy) {
        const ts = t / 1000;
        let r, spin;
        if (ts <= BLAST_END / 1000) {
            r = p.r0 + p.vr * ts + 0.5 * A_OUT * ts * ts;
            spin = p.w * ts;
        } else if (ts <= p.tPeak) {
            const dt = ts - BLAST_END / 1000;
            r = p.r1 + p.v1 * dt + 0.5 * A_IN * dt * dt;
            spin = p.w * (ts + 1.2 * dt * dt);
        } else {
            r = p.rPeak * Math.exp(-p.decay * (ts - p.tPeak));
            spin = p.w * (p.tPeak + 1.2 * Math.pow(ts - BLAST_END / 1000, 2)) + p.swirl * (ts - p.tPeak);
        }
        const th = p.th0 + spin;
        return { x: cx + Math.cos(th) * r, y: cy + Math.sin(th) * r * 0.9, r };
    }

    // 外炸時往前播（光芒伸出去），吸入時倒著播（光芒被收回），收束再補一段外放
    function rayFrame(t) {
        if (t < BLAST_END) return Math.round(lerp(21, 3, clamp01(t / BLAST_END)));
        if (t < PULL_END) return Math.round(lerp(3, 20, easeOut(clamp01((t - BLAST_END) / (PULL_END - BLAST_END)))));
        return Math.round(lerp(20, 23, clamp01((t - PULL_END) / 180)));
    }

    // 向心流：頭端粗、尾端細的長條，越靠近洞越亮，並且帶一點螺旋，才像真的被捲進去
    function inflows(g, cx, cy, t, fadeOut) {
        for (let i = 0; i < 44; i++) {
            const ph = ((t - BLAST_END) / (560 + (i % 7) * 170) + i * 0.137) % 1;
            const r0 = lerp(250, R_SINK + 8, Math.pow(ph, 1.35));
            const a0 = i * 2.399 + t * 0.0012;
            const len = 26 + 46 * (1 - ph) * (0.5 + hash(i * 3.3));
            g.fillStyle = i % 4 === 0 ? COL.white : i % 2 ? COL.c1 : COL.c2;
            for (let d = 0; d < len; d += 3) {
                const q = r0 + d;
                const a = a0 + (q - r0) * 0.0045 + ph * 0.8;   // 外端偏一點，形成螺旋
                const f = d / len;
                g.globalAlpha = Math.sin(Math.PI * ph) * (1 - f * 0.7) * fadeOut;
                const s = f < 0.3 ? 3 : 2;
                g.fillRect(Math.round(cx + Math.cos(a) * q), Math.round(cy + Math.sin(a) * q * 0.94), s, s);
            }
        }
        // 收縮的環：一圈一圈往洞裡掉，補足「被吸」的節奏
        for (let i = 0; i < 3; i++) {
            const ph = ((t - BLAST_END) / 1500 + i / 3) % 1;
            const r = lerp(240, 52, Math.pow(ph, 1.3));
            arc(g, cx, cy, r, COL.v3, 2, 0.52, 12, 3.1 + i * 4.7, Math.sin(Math.PI * ph) * 0.38 * fadeOut, 0.94);
        }
        g.globalAlpha = 1;
    }

    function draw(g, W, H, t, cfg, parts) {
        cfg = cfg || {};
        const cx = (cfg.cx == null ? W / 2 : cfg.cx) | 0;
        const cy = (cfg.cy == null ? H * 0.52 : cfg.cy) | 0;
        const k = cfg.scale || 1;
        if (cfg.clear !== false) g.clearRect(0, 0, W, H);
        if (t < 0 || t > END) return;
        const fadeOut = t > END - 140 ? 1 - (t - (END - 140)) / 140 : 1;
        const rsink = R_SINK * k;

        /* ---- 外炸：白閃、厚震波、裂縫 ---- */
        if (t < 520) {
            const k1 = clamp01(t / 300);
            if (t < 90) {
                g.globalAlpha = (1 - t / 90) * 0.95;
                disc(g, cx, cy, (18 + 26 * (t / 90)) * k, COL.white);
                g.globalAlpha = (1 - t / 90) * 0.42;
                disc(g, cx, cy, (34 + 46 * (t / 90)) * k, COL.c2);
            }
            const r1 = (42 + 150 * easeOut(k1)) * k;
            shockwave(g, cx, cy, r1, COL.white, 1.7, 0.95 * (1 - k1) * fadeOut);
            shockwave(g, cx, cy, r1 - 6, COL.c2, 4.3, 0.85 * (1 - k1) * fadeOut);
            shockwave(g, cx, cy, r1 + 9, COL.v2, 8.1, 0.6 * (1 - k1) * fadeOut);
            if (t > 70) {
                const k2 = clamp01((t - 70) / 460);
                shockwave(g, cx, cy, (48 + 190 * easeOut(k2)) * k, COL.v3, 11.9, 0.42 * (1 - k2) * fadeOut);
            }
            const ck = 1 - clamp01((t - 120) / 330);
            if (ck > 0) {
                for (let i = 0; i < 8; i++) {
                    const a0 = i * 1.9 + 0.35;
                    const len = (52 + 62 * hash(i * 2.7 + 3)) * easeOut(k1) * k;
                    for (let d = 34; d < len; d += 4) {
                        const a = a0 + (hash(i * 5.3 + d) - 0.5) * 0.3;
                        g.globalAlpha = ck * fadeOut * (1 - (d / len) * 0.45);
                        g.fillStyle = d < len * 0.45 ? COL.white : COL.c1;
                        g.fillRect(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d), 2, 2);
                    }
                }
            }
            g.globalAlpha = 1;
        }

        /* ---- 吸入：向心拖尾與收縮環 ---- */
        if (t > BLAST_END && t < PULL_END + 240) inflows(g, cx, cy, t, fadeOut);

        /* ---- 中央光環：pixelfx 點陣射線，2 倍整數放大（黑盤已挖空） ---- */
        if (IMG.complete && IMG.naturalWidth) {
            const f = rayFrame(t);
            const a = (t < 70 ? t / 70 : 1) * fadeOut;
            // 收束時用裁切圓把光環往中心壓掉，比直接淡出有「被抽走」的感覺
            const shrink = t > PULL_END ? 1 - easeIn(clamp01((t - PULL_END) / 210)) : 1;
            g.save();
            if (shrink < 1) {
                g.beginPath();
                g.arc(cx, cy, Math.max(0.5, 200 * k * shrink), 0, Math.PI * 2);
                g.clip();
            }
            g.globalAlpha = a;
            g.imageSmoothingEnabled = false;
            g.drawImage(IMG, f * FW, 0, FW, FH, cx - FW * K * k / 2, cy - FH * K * k / 2, FW * K * k, FH * K * k);
            g.restore();
        }

        /* ---- 碎片 ---- */
        if (parts) {
            const ts = t / 1000;
            for (const p of parts) {
                if (ts > p.tGone) continue;
                const q = particleAt(p, t, cx, cy);
                if (q.r < rsink + 2) continue;
                let alpha = 1;
                if (p.escape) alpha = 1 - clamp01((ts - (p.tGone - 0.45)) / 0.45);
                else if (ts > p.tGone - 0.2) alpha = clamp01((p.tGone - ts) / 0.2);
                const heat = clamp01(1 - (ts - 0.1) / 0.65);   // 先白熱、後轉紫
                const col = p.escape
                    ? (heat > 0.55 ? COL.white : heat > 0.25 ? COL.c2 : COL.c1)
                    : (heat > 0.6 ? COL.hot : heat > 0.3 ? COL.c2 : (p.hue > 0.55 ? COL.v3 : COL.c1));
                const prev = particleAt(p, Math.max(0, t - 46), cx, cy);
                const dx = q.x - prev.x, dy = q.y - prev.y;
                const dist = Math.hypot(dx, dy);
                g.fillStyle = col;
                g.globalAlpha = alpha * fadeOut;
                if (dist > 5) {
                    const n = Math.min(8, Math.floor(dist / 2.2));
                    for (let i = 0; i < n; i++) {
                        const s = Math.max(1, p.size - 1);
                        g.fillRect(Math.round(q.x - dx * (i / n)), Math.round(q.y - dy * (i / n)), s, s);
                    }
                } else {
                    g.fillRect(Math.round(q.x), Math.round(q.y), p.size, p.size);
                }
                if (!p.escape && ts > p.tGone - 0.1 && q.r < rsink + 10) {
                    g.globalAlpha = 0.9 * fadeOut;
                    g.fillStyle = COL.c2;
                    g.fillRect(Math.round(q.x) - 1, Math.round(q.y), 4, 1);
                    g.fillRect(Math.round(q.x), Math.round(q.y) - 1, 1, 4);
                }
            }
            g.globalAlpha = 1;
        }

        /* ---- 收束：整圈往內壓，最後一閃 ---- */
        if (t > PULL_END) {
            const kk = clamp01((t - PULL_END) / 260);
            shockwave(g, cx, cy, (250 * (1 - easeIn(kk)) + 8) * k, COL.c2, 3.3, (1 - kk) * 0.95 * fadeOut);
            shockwave(g, cx, cy, (190 * (1 - easeIn(kk)) + 6) * k, COL.white, 7.7, (1 - kk) * 0.8 * fadeOut);
            if (t > 2860) {
                const fl = clamp01((t - 2860) / 100);
                g.globalAlpha = (1 - fl) * 0.95 * fadeOut;
                disc(g, cx, cy, (10 + 24 * fl) * k, COL.white);
                shockwave(g, cx, cy, (22 + 60 * fl) * k, COL.c2, 2.9, (1 - fl) * 0.8 * fadeOut);
                // 壓縮到底後炸出來的碎屑
                for (let i = 0; i < 26; i++) {
                    const a = i * 2.399 + 0.6;
                    const d = (6 + 76 * easeOut(fl) * (0.55 + hash(i * 1.7) * 0.9)) * k;
                    g.globalAlpha = (1 - fl) * 0.9 * fadeOut;
                    g.fillStyle = i % 3 ? COL.c2 : COL.white;
                    const s = fl < 0.4 ? 4 : 2;
                    g.fillRect(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d * 0.94), s, s);
                }
            }
        }
        g.globalAlpha = 1;
    }

    function shake(t) {
        if (t < 0 || t > END) return 0;
        if (t < 360) return 6 * (1 - t / 360);
        if (t > PULL_END) return 4 * Math.max(0, 1 - (t - PULL_END) / 260);
        return 1.6;
    }

    function play(container, opts) {
        opts = opts || {};
        const cssW = opts.w || container.clientWidth || 430;
        const cssH = opts.h || container.clientHeight || 760;
        const out = document.createElement("canvas");
        out.className = "skill-fx-canvas";
        out.width = cssW; out.height = cssH;
        out.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;image-rendering:pixelated";
        const g = out.getContext("2d");
        g.imageSmoothingEnabled = false;
        container.appendChild(out);
        if (typeof applySkillFxOpacity === "function") applySkillFxOpacity(out);
        const parts = makeParticles(opts.seed || 0x9e3779b9);
        // 整體時長可壓縮（opts.ms）：0–300ms 起爆保留原速，後面那段長拖尾依比例收乾，收束留最後 200ms
        const total = Math.min(END, Math.max(700, opts.ms || END));
        const tail = 200;
        const pullEndAt = Math.max(BLAST_END + 120, total - tail);
        const warp = total >= END ? (t => t) : (t => {
            if (t <= BLAST_END) return t;
            if (t <= pullEndAt) return BLAST_END + (t - BLAST_END) * (PULL_END - BLAST_END) / (pullEndAt - BLAST_END);
            return PULL_END + (t - pullEndAt) * (END - PULL_END) / Math.max(1, total - pullEndAt);
        });
        const t0 = performance.now() + (opts.delay || 0);
        let raf = 0, dead = false;
        const stop = () => {
            if (dead) return;
            dead = true; cancelAnimationFrame(raf); out.remove();
        };
        const fadeMs = 260;                      // 收尾溶解，跟連攜標題一起收到零
        const step = () => {
            if (dead) return;
            // 綁定連攜節點：換場/怪物死亡時 boss-vfx 被整個收掉，撕裂不能自己多跑一段
            if (opts.tieTo && !opts.tieTo.isConnected) { stop(); return; }
            const raw = performance.now() - t0;
            const t = warp(raw);
            const s = shake(t);
            const jx = s ? Math.round((Math.random() - 0.5) * s) : 0;
            const jy = s ? Math.round((Math.random() - 0.5) * s) : 0;
            g.save(); g.translate(jx, jy);
            draw(g, cssW, cssH, t, { cx: opts.x || cssW / 2, cy: opts.y || cssH * 0.52, scale: opts.scale || 1 }, parts);
            g.restore();
            out.style.opacity = raw <= total - fadeMs ? "1"
                : Math.max(0, 1 - (raw - (total - fadeMs)) / fadeMs).toFixed(3);
            if (raw > total) { stop(); if (opts.onEnd) opts.onEnd(); return; }
            raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return { node: out, stop };
    }

    window.BlackHoleFX = { draw, play, shake, makeParticles, ready, END, BLAST_END, PULL_END, K };
})();
