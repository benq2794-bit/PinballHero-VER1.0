(function () {
    "use strict";

    const WORLD = window.GAME_DATA.combatRules.physics;
    const W = WORLD.width, H = WORLD.height, TAU = Math.PI * 2;
    const CATALOG = Object.freeze({
        knight: Object.freeze(["golden slash", "wind-ring slash", "rainbow sword storm"]),
        fighter: Object.freeze(["three-hit combo", "four-hit combo", "five-hit finisher"]),
        ranger: Object.freeze(["single energy shot", "double energy shot", "piercing energy burst"]),
        special: Object.freeze(["gold-white blast", "cyan-violet blast", "large blast with magic circle"]),
        supporter: Object.freeze(["green buff aura", "enhanced buff aura", "field burst, magic seal and leaves"])
    });
    const DURATION = { knight: [1600, 2150, 2800], fighter: [750, 850, 950], ranger: [420, 480, 560], special: [950, 1050, 1450], supporter: [4600, 4600, 4600] };
    const effects = [], impacts = [];
    let container = null, canvas = null, ctx = null, raf = 0, lastNow = 0;
    let fighterAtlas = null;

    const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const ease = v => 1 - Math.pow(1 - clamp(v), 3);
    const rand = (a, b) => a + Math.random() * (b - a);

    function image(src) {
        if (typeof Image === "undefined") return null;
        const img = new Image();
        img.src = src;
        return img;
    }

    function ensureCanvas() {
        if (canvas && canvas.isConnected) return true;
        container = document.getElementById("pf-vfx");
        if (!container) return false;
        canvas = document.createElement("canvas");
        canvas.className = "skill-fx-canvas power-flip-preview-fx";
        canvas.setAttribute("aria-hidden", "true");
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
        container.appendChild(canvas);
        ctx = canvas.getContext("2d");
        if (!ctx) {
            canvas.remove();
            canvas = null;
            return false;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (typeof applySkillFxOpacity === "function") applySkillFxOpacity(canvas);
        return true;
    }

    function play(type, x, y, angle = 0, level = 1, visualScale = 1, beamLength = 760, options = {}) {
        if (!Object.prototype.hasOwnProperty.call(CATALOG, type) || !Number.isInteger(level) || level < 1 || level > 3) return false;
        if (!ensureCanvas()) return false;
        if (visualScale && typeof visualScale === "object") {
            options = visualScale;
            visualScale = 1;
        } else if (beamLength && typeof beamLength === "object") {
            options = beamLength;
            beamLength = 760;
        }
        effects.push({
            type, x, y, angle, level, visualScale: Math.max(.5, visualScale || 1), beamLength,
            options: options || {}, started: performance.now(), seed: (Math.random() * 0x7fffffff) | 0,
            sequence: typeof PF === 'undefined' ? null : PF.foeSeq,
            particles: [], sparks: [], bursts: [], hits: [], knightParticles: [], fighterParticles: []
        });
        if (effects.length > 16) effects.splice(0, effects.length - 16);
        if (!raf) {
            lastNow = performance.now();
            raf = requestAnimationFrame(frame);
        }
        return true;
    }

    function impact(type, x, y, level, options = {}) {
        if (!Object.prototype.hasOwnProperty.call(CATALOG, type) || !Number.isInteger(level) || level < 1 || level > 3 || !ensureCanvas()) return false;
        const now = performance.now(), state = options.state;
        if (type === 'fighter' && state) {
            const fx = effects.find(effect => effect.options.state === state);
            if (fx) fx.hits.push({ at: now - fx.started, x, y, major: state.hits === 2 + level });
        }
        impacts.push({ type, x, y, level, wall: !!options.wall, critical: !!options.critical,
            started: now, sequence: typeof PF === 'undefined' ? null : PF.foeSeq,
            duration: options.wall ? 140 : 210 + level * 25 });
        if (impacts.length > 40) impacts.splice(0, impacts.length - 40);
        if (!raf) { lastNow = now; raf = requestAnimationFrame(frame); }
        return true;
    }

    function drawImpact(hit, elapsed) {
        const p = clamp(elapsed / hit.duration), alpha = Math.pow(1 - p, 2);
        const colors = { knight: '#ffe6a3', fighter: '#ffb468', ranger: rangerColors(hit.level)[0], special: '#d4b0ff', supporter: '#a8ffd2' };
        const size = (hit.wall ? 12 : 24 + hit.level * 7) * (hit.critical ? 1.2 : 1), color = colors[hit.type];
        ctx.save(); ctx.translate(hit.x, hit.y); ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 10;
        const spokes = hit.wall ? 5 : 8 + hit.level * 2;
        for (let i = 0; i < spokes; i++) {
            const angle = i * TAU / spokes + .3;
            const inner = size * (.12 + p), outer = size * (1 + p * 1.6) * (i % 2 ? .65 : 1);
            ctx.lineWidth = (hit.wall ? 1.5 : 3.5) * (1 - p) + .5;
            ctx.beginPath(); ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
            ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer); ctx.stroke();
        }
        if (!hit.wall) {
            ctx.rotate(hit.type === 'knight' ? -.65 : Math.PI / 4);
            ctx.strokeStyle = '#fff9e7'; ctx.lineWidth = (6 + hit.level) * (1 - p); ctx.shadowBlur = 16;
            ctx.beginPath(); ctx.moveTo(-size * (1 - p), 0); ctx.lineTo(size * (1 - p), 0);
            ctx.moveTo(0, -size * .55 * (1 - p)); ctx.lineTo(0, size * .55 * (1 - p)); ctx.stroke();
        }
        ctx.restore();
    }

    function clear() {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        effects.length = 0;
        impacts.length = 0;
        if (ctx) ctx.clearRect(0, 0, W, H);
        if (canvas) canvas.remove();
        canvas = null;
        ctx = null;
        container = null;
    }

    function frame(now) {
        raf = 0;
        if (!ctx || !canvas || !canvas.isConnected) { clear(); return; }
        const elapsedDelta = Math.max(0, now - lastNow);
        const paused = typeof PF !== 'undefined' && PF.paused;
        const delta = paused ? 0 : Math.min(50, elapsedDelta);
        lastNow = now;
        ctx.clearRect(0, 0, W, H);
        for (let i = effects.length - 1; i >= 0; i--) {
            const fx = effects[i];
            if (paused) fx.started = Math.min(now, fx.started + elapsedDelta);
            const elapsed = now - fx.started, state = fx.options.state;
            if (fx.type === 'knight' && state && state.body.powerFlip !== state && fx.knightEnd === undefined) fx.knightEnd = elapsed / 1000 + .22;
            const duration = fx.knightEnd === undefined ? DURATION[fx.type][fx.level - 1] : fx.knightEnd * 1000;
            if (elapsed >= duration || typeof PF !== 'undefined' && fx.sequence !== PF.foeSeq) {
                effects.splice(i, 1);
                continue;
            }
            if (fx.type === "knight") drawKnight(fx, elapsed / 1000);
            else if (fx.type === "fighter") drawFighter(fx, elapsed, delta);
            else if (fx.type === "ranger") drawRanger(fx, elapsed / 1000);
            else if (fx.type === "special") drawSpecial(fx, elapsed / 1000, delta);
            else drawSupporter(fx, elapsed / 1000);
        }
        for (let i = impacts.length - 1; i >= 0; i--) {
            const hit = impacts[i];
            if (paused) hit.started = Math.min(now, hit.started + elapsedDelta);
            const elapsed = now - hit.started;
            if (elapsed >= hit.duration || typeof PF !== 'undefined' && hit.sequence !== PF.foeSeq) impacts.splice(i, 1);
            else drawImpact(hit, elapsed);
        }
        if (effects.length || impacts.length) raf = requestAnimationFrame(frame);
        else clear();
    }

    function strokeArc(g, x, y, r, start, end, color, width, alpha = 1, blur = 0) {
        g.save();
        g.globalAlpha = alpha;
        g.strokeStyle = color;
        g.lineWidth = width;
        g.lineCap = "round";
        g.shadowColor = color;
        g.shadowBlur = blur;
        g.beginPath();
        g.arc(x, y, r, start, end);
        g.stroke();
        g.restore();
    }

    function ring(g, x, y, r, angle, c1, c2, alpha, thick = 3) {
        for (let i = 0; i < 4; i++) {
            const start = angle + i * TAU / 4;
            strokeArc(g, x, y, r, start, start + 1.13, c1, thick, alpha * (1 - i * .1), 8);
            strokeArc(g, x, y, r, start + .15, start + .7, c2, 1.5, alpha * .9, 2);
        }
    }

    function goldenSlash(g, x, y, angle, alpha) {
        g.save();
        g.translate(x, y);
        g.rotate(angle);
        g.globalAlpha = alpha;
        const r = 69, start = -1.05, end = 1.25;
        g.shadowColor = "#ffbc35";
        g.shadowBlur = 15;
        const grad = g.createLinearGradient(-75, -55, 78, 58);
        grad.addColorStop(0, "#ff9e24");
        grad.addColorStop(.38, "#ffce4d");
        grad.addColorStop(.68, "#fff5b0");
        grad.addColorStop(1, "#ffffff");
        g.fillStyle = grad;
        g.beginPath();
        for (let i = 0; i <= 40; i++) {
            const t = i / 40, a = start + (end - start) * t, thick = Math.pow(Math.sin(Math.PI * t), .65) * 19;
            const rr = r + thick * .55, px = Math.cos(a) * rr, py = Math.sin(a) * rr;
            i ? g.lineTo(px, py) : g.moveTo(px, py);
        }
        for (let i = 40; i >= 0; i--) {
            const t = i / 40, a = start + (end - start) * t, thick = Math.pow(Math.sin(Math.PI * t), .65) * 19;
            const rr = r - thick * .55;
            g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        g.closePath();
        g.fill();
        g.shadowBlur = 3;
        g.strokeStyle = "#fff9d6";
        g.lineWidth = 2;
        g.stroke();
        g.globalAlpha = alpha * .36;
        g.shadowBlur = 8;
        g.strokeStyle = "#f8b43c";
        g.lineWidth = 5;
        g.beginPath();
        g.arc(0, 0, 63, start - .7, start - .04);
        g.stroke();
        g.restore();
    }

    function windBlade(g, x, y, r, angle, size, alpha) {
        g.save();
        g.translate(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
        g.rotate(angle + Math.PI / 2 + .32);
        g.globalAlpha = alpha;
        g.shadowColor = "#56ff72";
        g.shadowBlur = 10;
        const grad = g.createLinearGradient(-size / 2, 0, size / 2, 0);
        grad.addColorStop(0, "rgba(25,200,75,0)");
        grad.addColorStop(.45, "#31ed68");
        grad.addColorStop(.72, "#e8ffe8");
        grad.addColorStop(1, "rgba(120,255,145,0)");
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(-size * .52, 8);
        g.quadraticCurveTo(0, -size * .33, size * .54, -2);
        g.quadraticCurveTo(size * .15, size * .07, -size * .52, 8);
        g.fill();
        g.strokeStyle = "#efffed";
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(-size * .37, 4);
        g.quadraticCurveTo(0, -size * .23, size * .43, -2);
        g.stroke();
        g.restore();
    }

    function rainbow(g, x, y, spin, phase, alpha) {
        const r = 105 + ease(clamp((phase - .22) / .2)) * 105;
        g.save();
        g.translate(x, y);
        g.rotate(spin);
        g.globalAlpha = alpha;
        g.globalCompositeOperation = "screen";
        const colors = ["#ffb864", "#fff6a1", "#73f9ff", "#8ca8ff", "#e6a1ff", "#ff93c4"];
        for (let j = 0; j < 6; j++) {
            const a = j * TAU / 6 + Math.sin(phase * 12 + j) * .12;
            for (let k = 0; k < 2; k++) {
                strokeArc(g, 0, 0, r + k * 10 + j % 2 * 3, a + .07 * k, a + 1.1, colors[j], k ? 2.4 : 6, (k ? .45 : .72) * alpha, k ? 3 : 12);
            }
            windBlade(g, 0, 0, r + 3, a + .7, 60, .65 * alpha);
        }
        g.restore();
    }

    function outerLongSwords(g, x, y, spin, phase, alpha) {
        const radius = 105 + ease(clamp((phase - .22) / .2)) * 105;
        g.save();
        g.translate(x, y);
        g.globalAlpha = alpha;
        for (let i = 0; i < 5; i++) {
            const a = spin + i * TAU / 5;
            g.save();
            g.rotate(a);
            g.translate(radius, 0);
            g.rotate(Math.PI / 2 + .3);
            const length = 86, h = 10;
            g.shadowColor = "#a5fff1";
            g.shadowBlur = 12;
            const blade = g.createLinearGradient(-h, 0, h, 0);
            blade.addColorStop(0, "#138f83");
            blade.addColorStop(.35, "#75f5dd");
            blade.addColorStop(.52, "#f4fff6");
            blade.addColorStop(1, "#27bca5");
            g.fillStyle = blade;
            g.beginPath();
            g.moveTo(0, -length * .67);
            g.lineTo(h, -length * .28);
            g.lineTo(h * .75, length * .35);
            g.lineTo(0, length * .63);
            g.lineTo(-h * .75, length * .35);
            g.lineTo(-h, -length * .28);
            g.closePath();
            g.fill();
            g.shadowBlur = 0;
            g.strokeStyle = "#ddfff3";
            g.lineWidth = 1.5;
            g.stroke();
            g.strokeStyle = "rgba(255,255,255,.9)";
            g.lineWidth = 1.2;
            g.beginPath();
            g.moveTo(0, -length * .58);
            g.lineTo(0, length * .42);
            g.stroke();
            g.globalAlpha = alpha * .35;
            g.strokeStyle = "#69fbd2";
            g.lineWidth = 3;
            g.beginPath();
            g.moveTo(-h * .6, length * .38);
            g.quadraticCurveTo(-20, length * .58, -29, length * .8);
            g.stroke();
            g.restore();
        }
        g.restore();
    }

    function drawKnight(fx, t) {
        const scale = Math.min(1, W / 420, H / 650) * fx.visualScale;
        const fade = fx.knightEnd === undefined ? [.15, .2, .35][fx.level - 1] : .22;
        const duration = (fx.knightEnd ?? DURATION.knight[fx.level - 1] / 1000) - fade;
        const spinRate = fx.level === 1 ? 8.4 : fx.level === 2 ? 16.8 : 21;
        const spin = t * spinRate, windSpin = fx.level >= 2 ? t * (fx.level === 2 ? 25.2 : 31.5) : 0;
        const stormSpin = fx.level === 3 ? t * 13.5 : 0;
        const dt = Math.max(0, t - (fx.lastT || 0));
        if (fx.level === 3 && !fx.knightBurst && t >= .34) {
            fx.knightBurst = true;
            spawnKnightParticles(fx, 65, 145, ["#eaffff", "#fff3a3", "#8be6ff", "#d9a2ff", "#ffa4e8"]);
        }
        if (fx.level === 3 && t > .5 && t < 1.65 && Math.random() < dt * 20) {
            spawnKnightParticles(fx, 3, rand(120, 165), ["#ffcf7c", "#8ef7ff", "#ff8fda", "#a79cff"]);
        }
        if (fx.level >= 2 && t < duration && Math.random() < dt * 18) {
            spawnKnightParticles(fx, 2, 85, ["#a7ffff", "#e3ffff"]);
        }
        fx.lastT = t;
        const x = fx.options.follow?.x ?? fx.x, y = fx.options.follow?.y ?? fx.y;
        const alpha = clamp((duration + fade - t) / fade), intro = ease(t / .13);
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        if (fx.level === 3) {
            const grow = ease(clamp((t - .26) / .23)), outerA = clamp((t - .1) / .25) * alpha;
            if (t < .3) {
                for (let i = 0; i < 7; i++) strokeArc(ctx, 0, 0, 125 - t * 130, stormSpin * .1 + i * .9, stormSpin * .1 + i * .9 + .36, ["#ffcf7b", "#a6e9ff", "#e2a4ff"][i % 3], 2, .5, 8);
            }
            if (t > .27) {
                rainbow(ctx, 0, 0, stormSpin, t, outerA * grow);
                outerLongSwords(ctx, 0, 0, stormSpin, t, outerA * grow);
            }
            if (t > .33 && t < .82) {
                const q = ease((t - .33) / .49);
                strokeArc(ctx, 0, 0, 85 + q * 200, 0, TAU, "#e5f8ff", 6, (1 - q) * .66, 18);
                strokeArc(ctx, 0, 0, 82 + q * 205, 0, TAU, "#a4d5ff", 2, (1 - q) * .7, 3);
            }
        }
        if (fx.level >= 2) {
            const a = alpha * ease(clamp((t - .1) / .23));
            ring(ctx, 0, 0, 93, windSpin, "#53e3ff", "#e4ffff", a, 4);
            ring(ctx, 0, 0, 101, -windSpin * .55, "#39bfd6", "#aaffff", a * .52, 2);
            for (let i = 0; i < 3; i++) windBlade(ctx, 0, 0, 87, windSpin + i * TAU / 3 + (i % 2 ? .42 : -.22), 58, a * .92);
        }
        const phase = ((spin / TAU % 1) + 1) % 1;
        goldenSlash(ctx, 0, 0, spin + Math.sin(phase * TAU) * .22, intro * alpha);
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        for (let i = fx.knightParticles.length - 1; i >= 0; i--) {
            const p = fx.knightParticles[i];
            p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(.978, dt * 60); p.vy *= Math.pow(.978, dt * 60);
            if (p.age >= p.life) { fx.knightParticles.splice(i, 1); continue; }
            ctx.globalAlpha = (1 - p.age / p.life) * .9 * alpha; ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 7;
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
            ctx.fillRect(-p.size * 2, -p.size * .4, p.size * 4, p.size * .8); ctx.restore();
        }
        ctx.restore();
        if (fx.level === 3) {
            const flash = fx.knightBurst ? Math.max(0, .35 - Math.max(0, t - .34)) : 0;
            if (flash > 0) {
                ctx.fillStyle = `rgba(196,235,255,${flash * .18})`;
                ctx.fillRect(-x / scale, -y / scale, W / scale, H / scale);
            }
        }
        ctx.restore();
    }

    function spawnKnightParticles(fx, count, radius, colors) {
        for (let i = 0; i < count; i++) {
            const a = rand(0, TAU), speed = rand(75, 255), life = rand(.25, .8);
            fx.knightParticles.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius,
                vx: Math.cos(a) * speed - Math.sin(a) * 65, vy: Math.sin(a) * speed + Math.cos(a) * 65,
                life, age: 0, size: rand(1, 3.4), color: colors[i % colors.length] });
        }
        if (fx.knightParticles.length > 180) fx.knightParticles.splice(0, fx.knightParticles.length - 180);
    }

    function drawFighter(fx, elapsed, delta) {
        if (!fighterAtlas) fighterAtlas = image("asset/fx/pf-fighter-preview.png");
        if (!fighterAtlas || !fighterAtlas.complete || !fighterAtlas.naturalWidth) return;
        const sizeScale = [.82, 1.04, 1.22][fx.level - 1], scale = Math.min(1, W / 720, H / 560);
        const t = elapsed;
        let shake = fx.shake || 0;
        for (const hit of fx.hits) {
            if (hit.rendered) continue;
            hit.rendered = true;
            const dx = hit.x - fx.x, dy = hit.y - fx.y;
            hit.localX = (dx * Math.cos(fx.angle) + dy * Math.sin(fx.angle)) / scale;
            hit.localY = (-dx * Math.sin(fx.angle) + dy * Math.cos(fx.angle)) / scale;
            shake = Math.max(shake, hit.major ? 12 : 4);
            fx.flash = hit.major ? .32 : .10;
            spawnFighterBurst(fx, hit.localX, hit.localY, hit.major, hit.at);
        }
        shake *= Math.pow(.81, delta / 16);
        fx.flash = (fx.flash || 0) * Math.pow(.73, delta / 16);
        fx.shake = shake;
        if (delta > 0 || fx.shakeX === undefined) {
            fx.shakeX = rand(-shake, shake) * scale;
            fx.shakeY = rand(-shake, shake) * scale;
        }
        ctx.save();
        ctx.translate(fx.x + fx.shakeX, fx.y + fx.shakeY);
        ctx.rotate(fx.angle);
        ctx.scale(scale, scale);
        function sprite(row, frame, x, y, size, rotation = 0, alpha = 1, flip = false) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.scale(flip ? -1 : 1, 1);
            ctx.globalAlpha = alpha;
            ctx.drawImage(fighterAtlas, frame * 384, row * 384, 384, 384, -size / 2, -size / 2, size, size);
            ctx.restore();
        }
        for (let i = 0; i < fx.hits.length; i++) {
            const hit = fx.hits[i], major = hit.major, age = t - hit.at;
            const lifetime = major ? 280 : 150;
            if (age < 0 || age >= lifetime) continue;
            const progress = clamp(age / lifetime), frame = Math.min(7, Math.floor(progress * 8));
            const x = hit.localX, y = hit.localY;
            const size = (major ? 360 : 230) * sizeScale * (.86 + .24 * Math.sin(progress * Math.PI));
            const row = major || fx.level === 3 ? 2 : fx.level - 1;
            sprite(row, frame, x, y, size, i % 2 ? -.2 : .2, 1, i % 2 === 1);
            if (age < 220) {
                const p = ease(age / 220);
                fighterCircle(x, y, 12 + (major ? 135 : 64) * p, major ? "#ffe7a6" : "#ffba65", (major ? 8 : 4) * (1 - p), 1 - p);
                fighterGlow(x, y, major ? 160 : 95, major ? "#fff2a9" : "#ffad5c", (1 - p) * (major ? .38 : .2));
            }
            if (major && age < 450) for (let k = 0; k < 3; k++) {
                const p = clamp((age - k * 43) / 330);
                if (p > 0) fighterCircle(x, y, 30 + p * (100 + k * 42), "#ffca69", 4 * (1 - p), .7 * (1 - p));
            }
        }
        for (let i = 0; i < fx.hits.length; i++) {
            const hit = fx.hits[i], age = t - hit.at;
            if (age < 0 || age > 170) continue;
            const p = clamp(age / 170), a = 1 - p;
            ctx.save();
            ctx.translate(hit.localX, hit.localY);
            ctx.save();
            ctx.translate(-106 + 75 * ease(age / 65), (i % 3 - 1) * 20);
            ctx.rotate((i % 2 ? 1 : -1) * .3);
            ctx.globalAlpha = a;
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#ff8b31";
            ctx.fillStyle = "#ffdc9e";
            ctx.strokeStyle = "#e88b36";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-25, -17); ctx.lineTo(-12, -32); ctx.lineTo(17, -31); ctx.lineTo(32, -16);
            ctx.lineTo(31, 13); ctx.lineTo(8, 28); ctx.lineTo(-22, 19); ctx.closePath();
            ctx.fill(); ctx.stroke();
            for (let k = 0; k < 3; k++) ctx.strokeRect(-7 + k * 12, -23, 1, 15);
            ctx.restore();
            for (let k = 0; k < 3; k++) {
                ctx.globalAlpha = a;
                ctx.strokeStyle = "#ffb761";
                ctx.lineWidth = 3 * a;
                ctx.beginPath(); ctx.moveTo(-178 - age * .2, -38 + k * 28); ctx.lineTo(-111 - age * .07, -32 + k * 28); ctx.stroke();
            }
            ctx.restore();
        }
        for (let i = fx.fighterParticles.length - 1; i >= 0; i--) {
            const p = fx.fighterParticles[i], age = (elapsed - p.born) / 1000;
            if (age >= p.life) { fx.fighterParticles.splice(i, 1); continue; }
            p.x += p.vx * delta / 1000; p.y += p.vy * delta / 1000;
            p.vx *= Math.pow(.97, delta / 16); p.vy *= Math.pow(.97, delta / 16);
            const alpha = clamp((p.life - age) / p.life);
            fighterGlow(p.x, p.y, p.r * 5, p.color, alpha * .26);
            ctx.fillStyle = p.color; ctx.globalAlpha = alpha; ctx.fillRect(p.x, p.y, p.r * 1.8, p.r * 1.8);
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * .022, p.y - p.vy * .022);
            ctx.strokeStyle = p.color; ctx.lineWidth = p.r * .7; ctx.stroke();
        }
        if (fx.flash > .01) {
            ctx.globalAlpha = fx.flash * .22; ctx.fillStyle = "#ffd895";
            ctx.fillRect(-fx.x / scale, -fx.y / scale, W / scale, H / scale);
        }
        ctx.restore();
    }

    function spawnFighterBurst(fx, x, y, major, born) {
        const count = major ? 105 : 26, colors = ["#fff5cc", "#ffe087", "#ff9d3f", "#f15a23"];
        for (let i = 0; i < count; i++) {
            const a = rand(-Math.PI, Math.PI), speed = rand(major ? 130 : 80, major ? 580 : 320), life = rand(.22, major ? .8 : .5);
            fx.fighterParticles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life,
                r: rand(major ? 2 : 1, major ? 5 : 3), color: colors[i % colors.length], born });
        }
        if (fx.fighterParticles.length > 700) fx.fighterParticles.splice(0, fx.fighterParticles.length - 700);
    }

    function fighterCircle(x, y, radius, color, width, alpha) {
        ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width;
        ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.stroke(); ctx.restore();
    }
    function fighterGlow(x, y, radius, color, alpha) {
        ctx.save(); ctx.globalAlpha = alpha;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, color); grad.addColorStop(.28, color); grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2); ctx.restore();
    }

    function drawRanger(fx, t) {
        const scale = Math.min(1, W / 480, H / 680);
        const dirX = Math.cos(fx.angle), dirY = Math.sin(fx.angle), sideX = -dirY, sideY = dirX;
        const width = fx.options.width ?? 12 + fx.level * 8;
        const offsets = (fx.level === 1 ? [0] : fx.level === 2 ? [-.3, .3] : [0, -.35, .35, -.7, .7]).map(offset => offset * width);
        const colors = rangerColors(fx.level), fade = Math.pow(clamp(1 - t * 1000 / DURATION.ranger[fx.level - 1]), 1.6);
        const length = fx.beamLength;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * .12; ctx.strokeStyle = colors[0]; ctx.lineWidth = width * 2;
        ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.lineTo(fx.x + dirX * length, fx.y + dirY * length); ctx.stroke();
        for (const offset of offsets) {
            const startX = fx.x + sideX * offset, startY = fx.y + sideY * offset;
            const endX = startX + dirX * length, endY = startY + dirY * length;
            const size = fx.level === 3 && offset === 0 ? 9 : fx.level === 1 ? 7 : 5;
            ctx.globalAlpha = fade * .75; ctx.strokeStyle = colors[1]; ctx.shadowColor = colors[0]; ctx.shadowBlur = 16;
            ctx.lineWidth = size * 2 * fade + 1;
            ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke();
            ctx.globalAlpha = fade; ctx.strokeStyle = colors[2]; ctx.lineWidth = Math.max(1, size * .45 * fade);
            ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke();
            for (let i = 1; i <= 4; i++) {
                const distance = length * ((i / 5 + t * 1.8) % 1);
                drawEnergyShot(startX + dirX * distance, startY + dirY * distance, dirX, dirY, size * .6, colors, scale * .65);
            }
        }
        ctx.globalAlpha = fade;
        for (let i = 0; i < 6 + fx.level * 2; i++) {
            const a = i * TAU / (6 + fx.level * 2), radius = 10 + t * 90;
            rangerDot(fx.x + Math.cos(a) * radius, fx.y + Math.sin(a) * radius, 2 * fade, colors[0], 7);
        }
        ctx.restore();
    }

    function rangerColors(level) {
        return level === 1 ? ["#ffca52", "#ff8a21", "#fff5bc"] :
            level === 2 ? ["#67ff9e", "#20bfae", "#f1fff2"] : ["#b0e7ff", "#6a8dff", "#ffffff"];
    }
    function rangerDot(x, y, radius, color, blur) {
        ctx.save(); ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = blur;
        ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.fill(); ctx.restore();
    }
    function drawEnergyShot(x, y, dirX, dirY, size, colors, scale) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(dirY, dirX) + Math.PI / 2);
        ctx.shadowColor = colors[1]; ctx.shadowBlur = 24 * scale;
        const grad = ctx.createLinearGradient(0, -35 * scale, 0, 40 * scale);
        grad.addColorStop(0, colors[2]); grad.addColorStop(.4, colors[0]); grad.addColorStop(1, "rgba(15,30,80,0)");
        ctx.fillStyle = grad; ctx.beginPath();
        ctx.moveTo(0, -40 * scale);
        ctx.bezierCurveTo(size * 1.5, -11 * scale, size * 1.2, 4 * scale, 0, 34 * scale);
        ctx.bezierCurveTo(-size * 1.2, 4 * scale, -size * 1.5, -11 * scale, 0, -40 * scale);
        ctx.fill(); ctx.shadowBlur = 8 * scale; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2 * scale;
        ctx.beginPath(); ctx.moveTo(0, -32 * scale); ctx.lineTo(0, 12 * scale); ctx.stroke(); ctx.restore();
    }

    function specialRand(fx) {
        fx.seed = (fx.seed * 1664525 + 1013904223) >>> 0;
        return fx.seed / 4294967296;
    }
    function specialRange(fx, a, b) { return a + (b - a) * specialRand(fx); }
    function specialInit(fx) {
        if (fx.initialized) return;
        fx.initialized = true;
        const radius = [0, 88, 145, 218][fx.level], n = [0, 85, 155, 270][fx.level];
        const colors = fx.level === 1 ? ["#fff6c8", "#ffd06c", "#ff9e3b", "#fff"] :
            fx.level === 2 ? ["#fff", "#b9f9ff", "#59d8ff", "#9d82ff", "#e2c5ff"] :
                ["#fff", "#f6c9ff", "#a979ff", "#ffbf60", "#ff77d1", "#78d8ff"];
        for (let i = 0; i < n; i++) {
            const a = specialRange(fx, 0, TAU), speed = specialRange(fx, radius * .38, radius * 1.9);
            const life = specialRange(fx, .27, .85);
            fx.particles.push({ x: 0, y: 0, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life, age: 0,
                r: specialRange(fx, .8, fx.level === 3 ? 3.4 : 2.8), color: colors[Math.floor(specialRand(fx) * colors.length)],
                drag: specialRange(fx, .87, .96), shape: specialRand(fx) > .68 ? 1 : 0 });
        }
        for (let i = 0; i < fx.level * 22 + 18; i++) {
            const a = specialRange(fx, 0, TAU), speed = specialRange(fx, radius * .7, radius * 2.5);
            fx.sparks.push({ x: 0, y: 0, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
                life: specialRange(fx, .13, .45), age: 0, color: colors[Math.floor(specialRand(fx) * colors.length)] });
        }
        fx.bursts.push({ age: 0, radius, color: fx.level === 1 ? "#ffcf77" : fx.level === 2 ? "#a1e6ff" : "#d6a4ff" });
        if (fx.level >= 2) fx.bursts.push({ age: -.085, radius: radius * .77, color: fx.level === 2 ? "#a49aff" : "#ffbd75" });
        if (fx.level === 3) fx.bursts.push({ age: -.17, radius: radius * .9, color: "#ff6ce7" });
    }

    function drawSpecial(fx, t, delta) {
        specialInit(fx);
        const baseRadius = [0, 88, 145, 218][fx.level];
        const scale = fx.options.radius ? fx.options.radius / baseRadius : fx.visualScale;
        ctx.save();
        ctx.beginPath(); ctx.rect(13, 13, W - 26, H - 26); ctx.clip();
        ctx.translate(fx.x, fx.y); ctx.scale(scale, scale);
        if (fx.level === 3) magicCircle(t);
        if (t < .33) {
            const flash = Math.max(0, 1 - t / .33);
            specialGlow(0, 0, baseRadius * (.48 + t * 2), fx.level === 1 ? "#ffdb89" : fx.level === 2 ? "#a3eaff" : "#c69bff", .27 * flash);
            specialGlow(0, 0, baseRadius * .24 + baseRadius * t, "#fff", .45 * flash);
        }
        for (const b of fx.bursts) {
            const age = t + b.age;
            if (age < 0 || age > .65) continue;
            const k = age / .65, r = b.radius * (.12 + 1.05 * (1 - Math.pow(1 - k, 2.5))), a = Math.pow(1 - k, 1.65);
            ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = b.color;
            ctx.lineWidth = (fx.level === 3 ? 5 : 3.5) * (1 - k) + .6;
            ctx.shadowBlur = fx.level === 3 ? 19 : 12; ctx.shadowColor = b.color;
            ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
            ctx.globalAlpha = a * .36; ctx.lineWidth = 11 * (1 - k); ctx.stroke(); ctx.restore();
        }
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        for (const p of fx.particles) {
            p.age += delta / 1000; p.x += p.vx * delta / 1000; p.y += p.vy * delta / 1000;
            p.vx *= Math.pow(p.drag, delta / 16); p.vy *= Math.pow(p.drag, delta / 16);
            const k = p.age / p.life, alpha = Math.pow(1 - k, 1.3);
            if (p.age >= p.life) continue;
            ctx.globalAlpha = alpha; ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = fx.level === 3 ? 8 : 5;
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
            if (p.shape) ctx.fillRect(-p.r * 2, -p.r * .42, p.r * 4, p.r * .84);
            else { ctx.beginPath(); ctx.arc(0, 0, p.r, 0, TAU); ctx.fill(); }
            ctx.restore();
        }
        ctx.shadowBlur = 0;
        for (const p of fx.sparks) {
            p.age += delta / 1000; p.x += p.vx * delta / 1000; p.y += p.vy * delta / 1000;
            const k = p.age / p.life;
            if (p.age >= p.life) continue;
            ctx.globalAlpha = (1 - k) * .9; ctx.strokeStyle = p.color; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * .028 * (1 - k), p.y - p.vy * .028 * (1 - k)); ctx.stroke();
        }
        ctx.restore(); ctx.restore();
    }

    function specialGlow(x, y, radius, color, alpha) {
        ctx.save(); ctx.globalAlpha = alpha;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, color); grad.addColorStop(.22, color); grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.fill(); ctx.restore();
    }

    function magicCircle(t) {
        if (t < 0 || t > 1.38) return;
        const alpha = clamp(t / .16) * clamp((1.38 - t) / .4), shock = clamp(t / .65);
        const radius = 218 * (.12 + 1.05 * (1 - Math.pow(1 - shock, 2.5))) * .78;
        ctx.save(); ctx.globalAlpha = alpha * .88; ctx.globalCompositeOperation = "screen";
        const circle = (r, color, width, blur = 0) => {
            ctx.strokeStyle = color; ctx.lineWidth = width; ctx.shadowColor = color; ctx.shadowBlur = blur;
            ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); ctx.shadowBlur = 0;
        };
        const polygon = (n, r, rot, color, width) => {
            ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
            for (let i = 0; i < n; i++) {
                const a = rot + i * TAU / n, x = Math.cos(a) * r, y = Math.sin(a) * r;
                i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            }
            ctx.closePath(); ctx.stroke();
        };
        ctx.save(); ctx.rotate(t * .38);
        circle(radius, "#b783ff", 2.4, 8); circle(radius * .964, "#f0d4ff", .8); circle(radius * .915, "#9d68f7", 1.2);
        for (let i = 0; i < 48; i++) {
            const a = i * TAU / 48, r1 = radius * (i % 4 === 0 ? .918 : .947), r2 = radius * .985;
            ctx.strokeStyle = i % 4 === 0 ? "#ffe0a9" : "#d8b8ff"; ctx.lineWidth = i % 4 === 0 ? 1.5 : .7;
            ctx.beginPath(); ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); ctx.stroke();
        }
        for (let i = 0; i < 12; i++) {
            const a = i * TAU / 12;
            ctx.save(); ctx.rotate(a); ctx.translate(0, -radius * .873); ctx.rotate(Math.PI / 4);
            ctx.strokeStyle = "#ffe4b2"; ctx.lineWidth = 1.1; ctx.strokeRect(-3.4, -3.4, 6.8, 6.8); ctx.restore();
        }
        ctx.restore();
        ctx.save(); ctx.rotate(-t * .66);
        circle(radius * .84, "#ffcb90", 1.35, 4); circle(radius * .805, "#bd92ff", .85);
        polygon(8, radius * .77, -Math.PI / 2, "#cba9ff", 1.15); polygon(8, radius * .77, -Math.PI / 2 + Math.PI / 8, "#8de5ff", .8);
        for (let i = 0; i < 8; i++) {
            const a = i * TAU / 8;
            ctx.save(); ctx.rotate(a); ctx.translate(0, -radius * .72); ctx.strokeStyle = "#e6c7ff"; ctx.lineWidth = 1.15;
            ctx.beginPath(); ctx.moveTo(-radius * .06, 0); ctx.quadraticCurveTo(0, -radius * .13, radius * .06, 0);
            ctx.quadraticCurveTo(0, radius * .06, -radius * .06, 0); ctx.stroke(); ctx.restore();
        }
        ctx.restore();
        ctx.save(); ctx.rotate(t * .95);
        circle(radius * .57, "#ffe4c2", 1.5, 4); circle(radius * .525, "#ad85ff", .9);
        polygon(3, radius * .49, -Math.PI / 2, "#ffe5b9", 1.65); polygon(3, radius * .49, Math.PI / 2, "#c6a6ff", 1.65);
        for (let i = 0; i < 6; i++) {
            const a = i * TAU / 6, x = Math.cos(a) * radius * .43, y = Math.sin(a) * radius * .43;
            ctx.strokeStyle = "#d6b8ff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, radius * .046, 0, TAU); ctx.stroke();
        }
        ctx.restore();
        ctx.save(); ctx.rotate(-t * 1.3);
        circle(radius * .29, "#f8d9ff", 1.3); circle(radius * .21, "#9ceeff", .9);
        for (let i = 0; i < 4; i++) {
            ctx.rotate(Math.PI / 2); ctx.strokeStyle = "#ffdfb5"; ctx.lineWidth = 1.3;
            ctx.beginPath(); ctx.moveTo(0, -radius * .12); ctx.lineTo(radius * .055, 0); ctx.lineTo(0, radius * .12);
            ctx.lineTo(-radius * .055, 0); ctx.closePath(); ctx.stroke();
        }
        ctx.restore();
        for (let i = 0; i < 4; i++) {
            const a = i * Math.PI / 2 + t * .22, x = Math.cos(a) * radius * .88, y = Math.sin(a) * radius * .88;
            const grad = ctx.createRadialGradient(x, y, 0, x, y, radius * .11);
            grad.addColorStop(0, "rgba(255,237,196,.7)"); grad.addColorStop(1, "rgba(255,237,196,0)");
            ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(x, y, radius * .11, 0, TAU); ctx.fill();
        }
        ctx.restore();
    }

    function supportRing(x, y, radius, color, width, alpha) {
        ctx.save(); ctx.globalAlpha = alpha; ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU);
        ctx.strokeStyle = color; ctx.lineWidth = width; ctx.shadowColor = color; ctx.shadowBlur = 12; ctx.stroke(); ctx.restore();
    }
    function supportStar(x, y, radius, color, alpha = 1) {
        ctx.save(); ctx.translate(x, y); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 12;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = i * Math.PI / 4 - Math.PI / 2, r = i % 2 ? radius * .23 : radius;
            const px = Math.cos(a) * r, py = Math.sin(a) * r;
            i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.closePath(); ctx.fill(); ctx.restore();
    }

    function supportMagicSeal(x, y, t, level, alpha) {
        ctx.save(); ctx.translate(x, y); ctx.globalAlpha = alpha;
        const r = level === 1 ? 49 : level === 2 ? 65 : 82, rot = t * .32;
        const circle = (rad, color, width) => { ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); };
        ctx.shadowColor = "#77ffc0"; ctx.shadowBlur = 9;
        circle(r, "#a7ffcd", 1.8); circle(r - 4, "#5edbb2", .75); circle(r * .77, "#b7ffe0", 1.2);
        circle(r * .72, "#70d6bd", .8); circle(r * .37, "#d8ffd1", 1.5); ctx.shadowBlur = 0;
        ctx.save(); ctx.rotate(rot);
        for (let i = 0; i < 48; i++) {
            const ang = i * Math.PI / 24; ctx.save(); ctx.rotate(ang);
            ctx.strokeStyle = i % 4 === 0 ? "#e6ffd0" : "#6cd5ac"; ctx.lineWidth = i % 4 === 0 ? 1.6 : .65;
            ctx.beginPath(); ctx.moveTo(0, -r + 7); ctx.lineTo(0, -r + (i % 4 === 0 ? 15 : 11)); ctx.stroke();
            if (i % 4 === 0) { ctx.beginPath(); ctx.moveTo(0, -r - 3); ctx.lineTo(3, -r); ctx.lineTo(0, -r + 3); ctx.lineTo(-3, -r); ctx.closePath(); ctx.stroke(); }
            ctx.restore();
        }
        ctx.restore(); ctx.save(); ctx.rotate(-rot * .78);
        for (let k = 0; k < 2; k++) {
            const n = k ? 8 : 6, rr = r * (k ? .64 : .71);
            ctx.strokeStyle = k ? "#a8ffdd" : "#d4ffb0"; ctx.lineWidth = k ? 1.1 : 1.5; ctx.beginPath();
            for (let i = 0; i <= n; i++) {
                const ang = (i % n) * TAU / n - Math.PI / 2 + (k ? Math.PI / 8 : 0), xx = Math.cos(ang) * rr, yy = Math.sin(ang) * rr;
                i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
            }
            ctx.stroke();
        }
        for (let i = 0; i < 6; i++) {
            const ang = i * Math.PI / 3, px = Math.cos(ang) * r * .53, py = Math.sin(ang) * r * .53;
            ctx.save(); ctx.translate(px, py); ctx.rotate(ang); ctx.strokeStyle = "#c5ffe4"; ctx.lineWidth = .85;
            ctx.beginPath(); ctx.moveTo(0, -10); ctx.bezierCurveTo(9, -4, 9, 5, 0, 11); ctx.bezierCurveTo(-9, 5, -9, -4, 0, -10); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 9); ctx.stroke(); ctx.restore();
        }
        ctx.restore();
        for (let i = 0; i < 4; i++) {
            ctx.save(); ctx.rotate(i * Math.PI / 2 + rot * .5); ctx.strokeStyle = "#e7ffb5"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, -r * .83); ctx.quadraticCurveTo(9, -r * .95, 0, -r * 1.06);
            ctx.quadraticCurveTo(-9, -r * .95, 0, -r * .83); ctx.stroke(); ctx.restore();
        }
        ctx.restore();
    }

    function drawSupporter(fx, t) {
        const scale = Math.min(1, W / 420, H / 620) * fx.visualScale;
        const anchorX = fx.options.follow?.x ?? fx.x, anchorY = fx.options.follow?.y ?? fx.y;
        const x = 210, y = 360;
        ctx.save(); ctx.translate(anchorX, anchorY); ctx.scale(scale, scale); ctx.translate(-210, -360);
        const fieldX = (W / 2 - anchorX) / scale + 210, fieldY = (H / 2 - anchorY) / scale + 360;
        const burst = Math.max(0, 1 - Math.abs(t - .37) / .37);
        if (fx.level === 3 && t < 1.35) {
            const p = Math.max(0, (t - .17) / .75), a = Math.max(0, 1 - p);
            if (p < 1) {
                ctx.fillStyle = `rgba(126,255,187,${.1 * a})`; ctx.fillRect(fieldX - 190, fieldY - 220, 380, 440);
                supportRing(fieldX, fieldY, 22 + 310 * p, "#b7ffe4", 5, a * .9);
                supportRing(fieldX, fieldY, 12 + 250 * p, "#6df7d4", 3, a * .7);
                for (let i = 0; i < 18; i++) supportStar(fieldX - 185 + i * 91 % 370, fieldY - 204 + i * 127 % 410, 4 + 12 * p, "#b8ffda", a);
            }
        }
        const active = t > .27 && t < 4.6;
        if (active && fx.level === 3) {
            const a = Math.min(1, (t - .27) * 3) * Math.min(1, (4.6 - t) * 1.8);
            supportMagicSeal(x, y, t, fx.level, a * .86);
        }
        if (active) {
            const a = Math.min(1, (t - .27) * 4) * Math.min(1, (4.6 - t) * 2);
            for (let j = 0; j < fx.level + 2; j++) {
                const r = 38 + j * 10 + Math.sin(t * 4 + j) * 3;
                supportRing(x, y, r, j % 2 ? "#6de8c5" : "#c7ff91", 1.4, a * (.42 - j * .05));
            }
            for (let i = 0; i < 18 + fx.level * 8; i++) {
                const ang = i * 2.399 + t * (i % 2 ? -.65 : .65), r = 27 + i % 7 * 9 + fx.level * 5;
                supportStar(x + Math.cos(ang) * r, y + Math.sin(ang) * r * .7, 1.6 + i % 4,
                    i % 3 ? "#8effc7" : "#f3f8a0", a * (.5 + i % 3 * .15));
            }
        }
        if (active && fx.level === 3) {
            const fadeIn = Math.min(1, (t - .27) * 2.7), fadeOut = Math.min(1, (4.6 - t) * 1.5);
            for (let i = 0; i < 39; i++) {
                const seed = i * 2.39996323, phase = i * .173 % 1, life = (t * .34 + phase) % 1, travel = life * 290;
                const lx = x + Math.sin(seed) * 92 + Math.sin(t * 1.8 + seed * 2) * 20 + Math.cos(life * 9 + seed) * 16;
                const ly = y - 126 + travel;
                const alpha = Math.max(0, Math.min(1, life * 8, (1 - life) * 7)) * fadeIn * fadeOut * (.5 + i % 4 * .11);
                const size = (.48 + i % 5 * .15) * 1.05;
                ctx.save(); ctx.translate(lx, ly); ctx.rotate(t * (i % 2 ? 1.9 : -1.7) + seed); ctx.scale(size, size);
                ctx.globalAlpha = alpha; ctx.shadowBlur = 8; ctx.shadowColor = "#a7ff9b";
                const leaf = ctx.createLinearGradient(-6, -11, 8, 12);
                leaf.addColorStop(0, i % 3 === 0 ? "#e3ff9c" : "#b4ffbd"); leaf.addColorStop(1, i % 3 === 0 ? "#8ecf67" : "#35bb89");
                ctx.fillStyle = leaf; ctx.beginPath(); ctx.moveTo(0, -12);
                ctx.bezierCurveTo(13, -8, 10, 7, 0, 13); ctx.bezierCurveTo(-11, 6, -12, -7, 0, -12); ctx.fill();
                ctx.shadowBlur = 0; ctx.strokeStyle = "#edffccaa"; ctx.lineWidth = .8; ctx.beginPath();
                ctx.moveTo(0, -10); ctx.quadraticCurveTo(1, 1, 0, 11); ctx.stroke(); ctx.restore();
            }
        }
        const halo = ctx.createRadialGradient(x, y, 12, x, y, 48);
        halo.addColorStop(0, '#44cda900'); halo.addColorStop(.5, '#89ffca55'); halo.addColorStop(1, '#44cda900');
        ctx.globalAlpha = clamp((4.6 - t) * 2);
        ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, 48, 0, TAU); ctx.fill();
        if (t < .85) {
            const p = t / .85, alpha = (1 - p) * .95;
            supportRing(x, y, 25 + p * (45 + fx.level * 18), "#d9ffb7", 4, alpha);
            supportRing(x, y, 10 + p * (30 + fx.level * 10), "#7dfde4", 2, alpha);
            for (let k = 0; k < 12; k++) {
                const a = k * Math.PI / 6 + t * 2, r = 28 + p * (35 + fx.level * 12);
                supportStar(x + Math.cos(a) * r, y + Math.sin(a) * r, 4, "#d5ffb4", alpha);
            }
        }
        if (burst) {
            ctx.globalAlpha = burst * .14; ctx.fillStyle = "#d9ffe8";
            ctx.fillRect(-anchorX / scale + 210, -anchorY / scale + 360, W / scale, H / scale);
        }
        ctx.restore();
    }

    fighterAtlas = image("asset/fx/pf-fighter-preview.png");
    window.PowerFlipVFX = Object.freeze({
        play,
        impact,
        clear,
        catalog: CATALOG,
        activeCount: () => effects.length + impacts.length
    });
})();
