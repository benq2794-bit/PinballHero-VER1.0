/* 主頁小隊閒逛展示：純視覺，不參與彈珠戰鬥或傷害計算。 */
(() => {
    // 走道位於背景圖約 87% 高度；角色腳底固定在走道面，不貼著展示區最下緣。
    const W = 430, H = 180, FLOOR_Y = 158;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const rand = (lo, hi) => lo + Math.random() * (hi - lo);

    class Background {
        constructor(width = W, height = H) {
            this.width = width; this.height = height;
            this.scene = new Image();
            this.scene.src = "asset/home/party-stage-bg.png";
            this.backgroundOffset = 0;
            this.floorOffset = 0;
            this.decorClock = 0;
            // 固定星點，讓角色展示區接續主頁宇宙海報，不使用會捲動的地景。
            this.stars = Array.from({ length:18 }, (_, i) => ({
                x:(i * 71 + 29) % width, y:10 + ((i * 43 + 17) % 132), r:i % 5 === 0 ? 1.5 : .8,
                a:.18 + (i % 4) * .07
            }));
        }
        update(dt, speed = 0) {
            // 遠景慢速視差、腳下平台全速反向移動，讓隊伍像走在地面上。
            const travel = speed * dt / 1000;
            this.backgroundOffset += travel * .18;
            this.floorOffset += travel;
            this.decorClock += dt;
        }
        drawSceneDecor(ctx, width, layer) {
            const sx = width / W, period = W * sx;
            const offset = ((this.floorOffset * sx) % period + period) % period;
            const first = Math.floor(offset / period) - 1;
            const last = Math.ceil((offset + width) / period) + 1;
            const pulse = .82 + Math.sin(this.decorClock * .0022) * .08;
            for (let tile = first; tile <= last; tile++) {
                const x = tile * period - offset;
                ctx.save();
                if (Math.abs(tile % 2) === 1) { ctx.translate(x + period, 0); ctx.scale(-1, 1); }
                else ctx.translate(x, 0);
                ctx.scale(sx, 1);

                // 小型石造噴水池放在遠景步道中央；冷藍水光與原場景星光同色系。
                const drawFountain = () => {
                    const cx = W / 2, baseY = 146;
                    const glow = ctx.createRadialGradient(cx, baseY - 3, 1, cx, baseY - 3, 38);
                    glow.addColorStop(0, `rgba(91,190,244,${pulse * .2})`);
                    glow.addColorStop(1, "rgba(54,127,190,0)");
                    ctx.fillStyle = glow; ctx.beginPath(); ctx.ellipse(cx, baseY - 3, 38, 13, 0, 0, Math.PI * 2); ctx.fill();

                    ctx.lineCap = "round";
                    ctx.strokeStyle = "rgba(126,211,248,.55)"; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(cx - 3, baseY - 13); ctx.quadraticCurveTo(cx - 13, baseY - 30, cx - 8, baseY - 36); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(cx + 3, baseY - 13); ctx.quadraticCurveTo(cx + 13, baseY - 30, cx + 8, baseY - 36); ctx.stroke();
                    ctx.fillStyle = "rgba(176,235,255,.8)";
                    ctx.fillRect(cx - 9, baseY - 37, 2, 3); ctx.fillRect(cx + 7, baseY - 34, 2, 3);

                    ctx.fillStyle = "rgba(4,12,25,.5)";
                    ctx.beginPath(); ctx.ellipse(cx, baseY, 28, 5, 0, 0, Math.PI * 2); ctx.fill();
                    const stone = ctx.createLinearGradient(cx, baseY - 18, cx, baseY - 2);
                    stone.addColorStop(0, "#5c7f9c"); stone.addColorStop(.48, "#2e4d6d"); stone.addColorStop(1, "#192e49");
                    ctx.fillStyle = stone;
                    ctx.beginPath(); ctx.moveTo(cx - 19, baseY - 15); ctx.lineTo(cx - 15, baseY - 5);
                    ctx.quadraticCurveTo(cx, baseY - 1, cx + 15, baseY - 5); ctx.lineTo(cx + 19, baseY - 15); ctx.closePath(); ctx.fill();
                    ctx.fillStyle = "#729bb5"; ctx.beginPath(); ctx.ellipse(cx, baseY - 15, 20, 4, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = "rgba(161,224,246,.7)"; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.ellipse(cx, baseY - 15, 15, 2.2, 0, 0, Math.PI * 2); ctx.stroke();
                    ctx.fillStyle = "#294865"; ctx.fillRect(cx - 3, baseY - 23, 6, 8);
                    ctx.fillStyle = "#88b7cf"; ctx.beginPath(); ctx.ellipse(cx, baseY - 24, 10, 3, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = "#385b79"; ctx.fillRect(cx - 8, baseY - 27, 16, 3);
                    ctx.fillStyle = `rgba(167,235,255,${pulse})`;
                    ctx.beginPath(); ctx.arc(cx, baseY - 31, 2, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = "rgba(160,225,250,.5)";
                    ctx.fillRect(cx - 22, baseY - 5, 44, 1); ctx.fillRect(cx - 15, baseY - 2, 30, 1);
                };
                if (layer === "far") {
                    drawFountain();
                }

                // 路燈與長椅跟地面使用相同捲動量，角色經過時會自然走到它們前面。
                const drawLamp = (lx) => {
                    const pole = ctx.createLinearGradient(lx - 2, 0, lx + 2, 0);
                    pole.addColorStop(0, "#182d46"); pole.addColorStop(.5, "#6288a2"); pole.addColorStop(1, "#172a43");
                    ctx.fillStyle = pole; ctx.fillRect(lx - 1, 118, 3, 34);
                    ctx.fillStyle = "#334f6b"; ctx.fillRect(lx - 4, 150, 9, 3); ctx.fillRect(lx - 1, 115, 3, 3);
                    ctx.fillStyle = "#526f88"; ctx.fillRect(lx - 3, 114, 6, 2); ctx.fillRect(lx + 1, 116, 9, 2);
                    ctx.fillStyle = `rgba(107,198,244,${pulse * .13})`;
                    ctx.beginPath(); ctx.ellipse(lx + 7, 120, 12, 17, 0, 0, Math.PI * 2); ctx.fill();
                    const glass = ctx.createLinearGradient(lx + 2, 0, lx + 9, 0);
                    glass.addColorStop(0, "#427495"); glass.addColorStop(.5, "#b7eaff"); glass.addColorStop(1, "#315a78");
                    ctx.fillStyle = glass; ctx.fillRect(lx + 3, 117, 7, 4); ctx.fillRect(lx + 2, 116, 9, 1);
                    ctx.fillStyle = "rgba(223,246,255,.7)"; ctx.fillRect(lx + 4, 117, 2, 1);
                };
                const drawBench = (bx) => {
                    ctx.fillStyle = "rgba(4,11,22,.45)";
                    ctx.beginPath(); ctx.ellipse(bx + 17, 153, 21, 3, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = "#253c58"; ctx.fillRect(bx + 2, 140, 30, 3); ctx.fillRect(bx + 4, 135, 26, 3);
                    ctx.fillStyle = "#4e6e87"; ctx.fillRect(bx + 4, 134, 26, 1); ctx.fillRect(bx + 4, 139, 26, 1);
                    ctx.fillStyle = "#6d8da2"; ctx.fillRect(bx + 3, 132, 28, 2);
                    ctx.fillStyle = "#29415c"; ctx.fillRect(bx + 5, 143, 2, 8); ctx.fillRect(bx + 27, 143, 2, 8);
                    ctx.fillStyle = "#64829a"; ctx.fillRect(bx + 4, 145, 4, 2); ctx.fillRect(bx + 26, 145, 4, 2);
                    ctx.fillStyle = "rgba(157,208,232,.38)"; ctx.fillRect(bx + 6, 133, 20, 1);
                };
                if (layer === "ground") {
                    drawLamp(72); drawLamp(354);
                    drawBench(112); drawBench(286);
                }
                ctx.restore();
            }
        }
        draw(ctx) {
            const w = this.width, h = this.height;
            ctx.save();
            if (this.scene.complete && this.scene.naturalWidth) {
                // 把背景拆成遠景與地面兩層，左右鏡像循環，避免移動時露出空白。
                const image = this.scene, splitY = Math.floor(image.naturalHeight * .81);
                const scale = h / image.naturalHeight, tileW = image.naturalWidth * scale;
                const farH = splitY * scale, floorH = h - farH;
                ctx.imageSmoothingEnabled = false;
                const drawLoop = (offset, sy, sh, y, dh) => {
                    const first = Math.floor(offset / tileW) - 1;
                    const last = Math.ceil((offset + w) / tileW) + 1;
                    for (let tile = first; tile <= last; tile++) {
                        const x = tile * tileW - offset;
                        ctx.save();
                        if (Math.abs(tile % 2) === 1) {
                            ctx.translate(x + tileW, 0); ctx.scale(-1, 1);
                            ctx.drawImage(image, 0, sy, image.naturalWidth, sh, 0, y, tileW, dh);
                        } else {
                            ctx.drawImage(image, 0, sy, image.naturalWidth, sh, x, y, tileW, dh);
                        }
                        ctx.restore();
                    }
                };
                drawLoop(this.backgroundOffset, 0, splitY, 0, farH);
                this.drawSceneDecor(ctx, w, "far");
                drawLoop(this.floorOffset, splitY, image.naturalHeight - splitY, farH, floorH);
                this.drawSceneDecor(ctx, w, "ground");
                // 輕微暗化角色活動區，讓小尺寸像素角色仍清楚突出。
                const shade = ctx.createLinearGradient(0, h * .45, 0, h);
                shade.addColorStop(0, "rgba(5,12,25,.08)"); shade.addColorStop(1, "rgba(5,12,25,.34)");
                ctx.fillStyle = shade; ctx.fillRect(0, 0, w, h);
                ctx.restore();
                return;
            }
            // 淡淡的宇宙光暈承接新主頁海報，保留透明區讓主背景自然透出。
            const haze = ctx.createRadialGradient(w * .5, h * .68, 4, w * .5, h * .68, w * .52);
            haze.addColorStop(0, "rgba(51,111,174,.20)"); haze.addColorStop(.58, "rgba(29,70,121,.09)"); haze.addColorStop(1, "rgba(8,14,29,0)");
            ctx.fillStyle = haze; ctx.fillRect(0, 0, w, h);
            this.stars.forEach((s, i) => {
                ctx.globalAlpha = s.a; ctx.fillStyle = i % 3 === 0 ? "#c9efff" : "#ffffff";
                ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
            });
            ctx.globalAlpha = 1;
            // 中央傳送門只留低對比圓弧，避免和角色、按鈕搶視線。
            ctx.strokeStyle = "rgba(102,177,228,.12)"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.ellipse(w * .5, h * .59, 69, 48, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
            ctx.beginPath(); ctx.ellipse(w * .5, h * .59, 58, 39, 0, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
            // 角色腳下的寬幅能量台：銀藍內圈配合紅藍雙色核心，固定不移動。
            const floor = ctx.createRadialGradient(w * .5, FLOOR_Y - 6, 3, w * .5, FLOOR_Y - 6, w * .47);
            floor.addColorStop(0, "rgba(45,104,148,.34)"); floor.addColorStop(.72, "rgba(17,40,67,.42)"); floor.addColorStop(1, "rgba(8,15,29,0)");
            ctx.fillStyle = floor; ctx.beginPath(); ctx.ellipse(w * .5, FLOOR_Y - 5, w * .48, 18, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = "rgba(157,211,238,.5)"; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.ellipse(w * .5, FLOOR_Y - 4, w * .43, 10, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = "rgba(81,151,203,.24)"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.ellipse(w * .5, FLOOR_Y - 4, w * .34, 6, 0, 0, Math.PI * 2); ctx.stroke();
            // 地面接觸線很淡，讓角色站穩但不形成新的硬邊。
            const line = ctx.createLinearGradient(0, 0, w, 0);
            line.addColorStop(0, "rgba(101,163,204,0)"); line.addColorStop(.5, "rgba(174,222,243,.34)"); line.addColorStop(1, "rgba(101,163,204,0)");
            ctx.fillStyle = line; ctx.fillRect(0, FLOOR_Y - 1, w, 1);
            ctx.restore();
        }
    }

    class Character {
        constructor({ id, name, spriteSrc, isLeader = false, index = 0, element = "wind" }) {
            this.id = id; this.name = name || id; this.spriteSrc = spriteSrc; this.isLeader = isLeader; this.index = index; this.element = element;
            this.x = 0; this.y = FLOOR_Y; this.direction = 1; this.speed = 0; this.distanceTravelled = 0;
            this.history = []; this.state = "walk"; this.isCastingSkill = false; this.skillFrameCounter = 0;
            this.isFrozen = false; this.frozenCanvas = null;
            this.attackTimer = 0; this.idleTimer = 0; this.walkTimer = rand(1800, 3300);
            this.walkPhase = rand(0, Math.PI * 2); this.isWalking = false;
            this.stepCycle = Math.floor(this.walkPhase / (Math.PI * 2)); this.stepDust = [];
            this.nextAmbientAction = rand(2600, 6200); this.ambientAction = null; this.ambientActionTime = 0;
            this.width = isLeader ? 29 : 27; this.height = isLeader ? 38 : 35;
            this.alphaBoundsCache = new WeakMap(); this.alphaBoundsCanvas = null;
            this.images = Object.create(null); this.imageLoads = Object.create(null); this.failedImages = new Set();
            this.sources = spriteSrc || {};
        }
        sourcesFor(state) {
            const entry = this.sources[state] || this.sources.walk || [];
            return Array.isArray(entry) ? entry : [entry];
        }
        imageFor(state) {
            if (this.images[state]) return this.images[state];
            if (this.failedImages.has(state)) return null;
            if (this.imageLoads[state]) return null;
            const queue = [...new Set(this.sourcesFor(state).filter(Boolean))];
            if (!queue.length) return null;
            this.imageLoads[state] = true;
            const tryNext = () => {
                const src = queue.shift();
                if (!src) { this.imageLoads[state] = false; this.failedImages.add(state); return; }
                const img = new Image(); img.crossOrigin = "anonymous";
                img.onload = () => { this.images[state] = img; this.imageLoads[state] = false; };
                img.onerror = tryNext; img.src = src;
            };
            tryNext(); return null;
        }
        visibleBounds(img, now) {
            if (!img || !img.naturalWidth || !img.naturalHeight) return null;
            const animated = /\.gif(?:$|[?#])/i.test(img.currentSrc || img.src || "");
            const cached = this.alphaBoundsCache.get(img);
            if (cached && now - cached.time < (cached.failed ? 3000 : animated ? 120 : Infinity)) return cached.bounds;
            let bounds = { x:0, y:0, width:img.naturalWidth, height:img.naturalHeight }, failed = false;
            try {
                if (!this.alphaBoundsCanvas) this.alphaBoundsCanvas = document.createElement("canvas");
                const canvas = this.alphaBoundsCanvas;
                canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
                const c = canvas.getContext("2d", { willReadFrequently:true });
                c.clearRect(0, 0, canvas.width, canvas.height); c.drawImage(img, 0, 0);
                const pixels = c.getImageData(0, 0, canvas.width, canvas.height).data;
                let left = canvas.width, top = canvas.height, right = -1, bottom = -1;
                for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
                    if (pixels[(y * canvas.width + x) * 4 + 3] > 20) {
                        if (x < left) left = x; if (x > right) right = x;
                        if (y < top) top = y; if (y > bottom) bottom = y;
                    }
                }
                if (right >= left && bottom >= top) bounds = { x:left, y:top, width:right - left + 1, height:bottom - top + 1 };
            } catch (_) { failed = true; }
            this.alphaBoundsCache.set(img, { bounds, time:now, failed });
            return bounds;
        }
        addTrailPoint(distance, x, y) {
            const last = this.history[this.history.length - 1];
            if (last && Math.abs(last.distance - distance) < .01 && Math.hypot(last.x - x, last.y - y) < .5) return;
            this.history.push({ distance, x, y, direction: this.direction });
            const keepAfter = this.distanceTravelled - 360;
            while (this.history.length > 3 && this.history[1].distance < keepAfter) this.history.shift();
        }
        sampleTrail(distance) {
            if (!this.history.length) return { x: this.x, y: this.y, distance, direction: this.direction };
            if (distance <= this.history[0].distance) return { ...this.history[0], distance };
            for (let i = 1; i < this.history.length; i++) {
                const a = this.history[i - 1], b = this.history[i];
                if (distance <= b.distance) {
                    const t = b.distance === a.distance ? 1 : (distance - a.distance) / (b.distance - a.distance);
                    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, distance, direction: b.direction };
                }
            }
            return { ...this.history[this.history.length - 1], distance };
        }
        updateAmbient(dt) {
            const cycle = Math.floor(this.walkPhase / (Math.PI * 2));
            if (this.isWalking && cycle > this.stepCycle) {
                // 每次完整步伐只揚起兩顆小塵光，角色各自錯開節奏。
                for (let i = 0; i < 2; i++) this.stepDust.push({
                    x:this.x + (Math.random() - .5) * 9, y:FLOOR_Y - 2,
                    vx:(Math.random() - .5) * 12, vy:-rand(9, 19), life:rand(180, 300), maxLife:300
                });
            }
            this.stepCycle = cycle;
            const seconds = dt / 1000;
            this.stepDust = this.stepDust.filter(p => {
                p.life -= dt; p.x += p.vx * seconds; p.y += p.vy * seconds; p.vy += 24 * seconds;
                return p.life > 0;
            });

            if (this.ambientAction) {
                this.ambientActionTime -= dt;
                if (this.ambientActionTime <= 0) {
                    this.ambientAction = null;
                    this.nextAmbientAction = rand(4200, 7600);
                }
            } else {
                this.nextAmbientAction -= dt;
                if (this.nextAmbientAction <= 0 && !this.isCastingSkill && this.state !== "attack") {
                    this.ambientAction = "cheer";
                    this.ambientActionTime = 700;
                }
            }
        }
        freeze() {
            this.isFrozen = true;
            const img = this.imageFor("walk");
            if (!img || !img.complete || !img.naturalWidth) return;
            this.frozenCanvas = document.createElement("canvas");
            this.frozenCanvas.width = this.width; this.frozenCanvas.height = this.height;
            const c = this.frozenCanvas.getContext("2d"); c.imageSmoothingEnabled = false;
            c.drawImage(img, 0, 0, this.width, this.height);
        }
        unfreeze() { this.isFrozen = false; this.frozenCanvas = null; }
        draw(ctx, groundY, now) {
            const footY = groundY - 1;
            const bob = this.isWalking && !this.isCastingSkill ? Math.round(Math.sin(this.walkPhase) * 1.15) : 0;
            ctx.fillStyle = "rgba(0,0,0,.4)";
            ctx.beginPath(); ctx.ellipse(this.x, footY, this.width * (.38 - Math.abs(bob) * .025), 3, 0, 0, Math.PI * 2); ctx.fill();
            // 腳步塵光畫在角色後方，快速淡出，不遮住道路或人物。
            this.stepDust.forEach(p => {
                ctx.globalAlpha = Math.max(0, p.life / p.maxLife) * .42;
                ctx.fillStyle = "#c8eaff"; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 1);
            });
            ctx.globalAlpha = 1;
            const drawState = this.isCastingSkill ? "skill" : this.state === "attack" ? "attack" : "walk";
            const stateImg = this.isFrozen ? null : this.imageFor(drawState);
            const img = this.isFrozen ? this.frozenCanvas : stateImg || (drawState !== "walk" ? this.imageFor("walk") : null);
            const actionProgress = this.ambientAction ? 1 - this.ambientActionTime / 700 : 0;
            const actionLift = this.ambientAction === "cheer" && !this.isCastingSkill && this.state !== "attack"
                ? Math.round(Math.sin(actionProgress * Math.PI) * 2) : 0;
            this.drawAmbientCue(ctx, footY, actionProgress);
            if (img && (img.complete === undefined || img.complete) && (img.naturalWidth === undefined || img.naturalWidth)) {
                ctx.save(); ctx.translate(Math.round(this.x), 0); ctx.scale(this.direction < 0 ? -1 : 1, 1);
                ctx.imageSmoothingEnabled = false;
                if (this.isFrozen) ctx.drawImage(img, -this.width / 2, Math.round(footY - this.height));
                else {
                    if (this.isCastingSkill && stateImg) {
                        // 技能素材可能有透明留白：裁掉留白，按走路素材的可見範圍等比例縮放並貼齊腳底。
                        const skillBox = this.visibleBounds(stateImg, now), walkImg = this.imageFor("walk");
                        const walkBox = walkImg && walkImg.complete && walkImg.naturalWidth ? this.visibleBounds(walkImg, now) : null;
                        if (skillBox && walkBox) {
                            const targetW = this.width * walkBox.width / walkImg.naturalWidth;
                            const targetH = this.height * walkBox.height / walkImg.naturalHeight;
                            const scale = Math.min(targetW / skillBox.width, targetH / skillBox.height);
                            const drawW = skillBox.width * scale, drawH = skillBox.height * scale;
                            ctx.drawImage(stateImg, skillBox.x, skillBox.y, skillBox.width, skillBox.height,
                                -drawW / 2, Math.round(footY - drawH + bob - actionLift), drawW, drawH);
                        } else {
                            ctx.drawImage(img, -this.width / 2, Math.round(footY - this.height + bob - actionLift), this.width, this.height);
                        }
                    } else {
                        ctx.drawImage(img, -this.width / 2, Math.round(footY - this.height + bob - actionLift), this.width, this.height);
                    }
                }
                ctx.restore();
            } else this.drawPixelFallback(ctx, footY - actionLift);
            if (this.isCastingSkill) this.drawSkillEffect(ctx, now);
        }
        drawAmbientCue(ctx, footY, progress) {
            if (!this.ambientAction || this.isCastingSkill || this.state === "attack") return;
            // 光點沿角色輪廓散開，整體寬高約等於角色本身，並畫在人物後方。
            const pulse = Math.sin(progress * Math.PI), cx = this.x;
            const cy = footY - this.height * .56, rx = this.width * .58, ry = this.height * .47;
            ctx.save(); ctx.globalAlpha = .22 + pulse * .42;
            ctx.shadowBlur = 4; ctx.shadowColor = "#8edfff";
            for (let i = 0; i < 4; i++) {
                const angle = i * Math.PI / 2 + progress * .7;
                const x = Math.round(cx + Math.cos(angle) * rx), y = Math.round(cy + Math.sin(angle) * ry);
                const color = i % 2 ? "#ffe08a" : "#a9e8ff";
                ctx.fillStyle = color;
                ctx.fillRect(x - 1, y - 3, 2, 6); ctx.fillRect(x - 3, y - 1, 6, 2);
                ctx.fillStyle = "#ffffff"; ctx.fillRect(x - 1, y - 1, 2, 2);
            }
            ctx.restore();
        }
        drawPixelFallback(ctx, footY) {
            const colors = this.isLeader
                ? (this.id === "arisa" ? ["#eecbd9", "#f4e8e2", "#c85275"] : ["#80503a", "#3982bb", "#b35e43"])
                : (this.element === "fire" ? ["#d84e40", "#ffca6b", "#543b45"] : this.element === "water" ? ["#4a9ad2", "#dcf5ff", "#42627d"] : this.element === "thunder" ? ["#e1bb43", "#fff2a5", "#665832"] : ["#4a9c71", "#dcf4ad", "#345945"]);
            const px = Math.round(this.x - 7), py = Math.round(footY - 27);
            ctx.fillStyle = "#20202b"; ctx.fillRect(px + 3, py, 9, 5); ctx.fillRect(px + 1, py + 4, 13, 10);
            ctx.fillStyle = colors[0]; ctx.fillRect(px + 4, py + 2, 7, 7);
            ctx.fillStyle = colors[1]; ctx.fillRect(px + 4, py + 8, 8, 5);
            ctx.fillStyle = colors[2]; ctx.fillRect(px + 2, py + 13, 11, 8);
            ctx.fillStyle = "#252b36";
            const step = this.isWalking ? Math.round(Math.sin(this.walkPhase) * 2) : 0;
            ctx.fillRect(px + 3 - step, py + 20, 4, 6); ctx.fillRect(px + 9 + step, py + 20, 4, 6);
            ctx.fillStyle = "#f6e7c5"; ctx.fillRect(px + (this.direction > 0 ? 9 : 4), py + 5, 2, 2);
        }
        drawSkillEffect(ctx, now) {
            const f = this.skillFrameCounter, colors = ["#ffe98a", "#a9e8ff", "#ffffff"];
            for (let i = 0; i < 8; i++) {
                const a = (i * Math.PI / 4) + f * .19, r = 11 + ((f * 3 + i * 7) % 15);
                const x = Math.round(this.x + Math.cos(a) * r), y = Math.round(FLOOR_Y - this.height * .58 + Math.sin(a) * r * .5);
                ctx.fillStyle = colors[(i + f) % colors.length]; ctx.fillRect(x, y, 2 + (i % 2), 2 + (i % 2));
            }
        }
    }

    class Party {
        constructor(canvas) {
            this.canvas = canvas; this.ctx = canvas && canvas.getContext("2d"); this.background = new Background();
            this.members = []; this.active = false; this.last = 0; this.acc = 0;
            this.skillWait = rand(5000, 10000); this.skillElapsed = 0; this.castingTimer = 0; this.caster = null;
            this.attackWait = rand(2400, 4700); this.signature = "";
            this.resize(); requestAnimationFrame(t => this.loop(t));
        }
        resize() {
            if (!this.canvas || !this.ctx) return;
            const dpr = Math.max(1, window.devicePixelRatio || 1);
            const width = this.canvas.clientWidth || W;
            const height = this.canvas.clientHeight || H;
            // 模擬座標固定為 430×180，依實際顯示尺寸縮放，避免窄版畫布裁掉隊伍行走路徑。
            this.background.width = W; this.background.height = H;
            this.canvas.width = Math.round(width * dpr); this.canvas.height = Math.round(height * dpr);
            this.ctx.setTransform(dpr * width / W, 0, 0, dpr * height / H, 0, 0);
            this.ctx.imageSmoothingEnabled = false;
        }
        setActive(on) { this.active = !!on; this.last = 0; }
        sync(teamIds) {
            const ids = (teamIds || []).filter(id => typeof CHAR_TABLE !== "undefined" && CHAR_TABLE[id] && roster[id] && roster[id].unlocked).slice(0, 3);
            const sig = ids.join(","); if (sig === this.signature) return;
            this.signature = sig; this.members = [];
            ids.forEach((id, i) => {
                const d = CHAR_TABLE[id];
                const walk = spriteCandidates("hero", id, "down");
                const attack = spriteCandidates("hero", id, "attack");
                const skill = spriteCandidates("hero", id, "skill");
                this.members.push(new Character({ id, name: d.name, index: i, isLeader: i === 0, element: d.element,
                    spriteSrc: { walk, attack, skill } }));
            });
            const startX = W * .68, dir = 1;
            this.members.forEach((ch, i) => {
                ch.direction = dir; ch.x = startX - i * 31; ch.y = FLOOR_Y - ch.height;
                // 預填起始軌跡，避免剛出現時所有角色跳到領頭者身上。
                for (let j = 3; j >= 0; j--) ch.history.push({ distance: -j * 31, x: ch.x - j * 31, y: ch.y, direction: dir });
            });
            myParty = this.members; window.myParty = this.members;
        }
        loop(now) {
            requestAnimationFrame(t => this.loop(t));
            if (!this.ctx || !this.canvas) return;
            if (!this.active || document.hidden) { this.last = now; return; }
            const dt = this.last ? Math.min(50, now - this.last) : 16.67; this.last = now;
            this.update(dt, now); this.draw(now);
        }
        update(dt, now) {
            if (!this.members.length) { this.background.update(dt, 0); return; }
            const lead = this.members[0]; let movingSpeed = 0;
            if (this.castingTimer > 0) {
                this.castingTimer -= dt; this.skillElapsed += dt;
                if (this.caster) this.caster.skillFrameCounter = Math.floor(this.skillElapsed / 1000 * 12);
                if (this.castingTimer <= 0) {
                    if (this.caster) { this.caster.isCastingSkill = false; this.caster.state = "walk"; }
                    this.caster = null; this.skillElapsed = 0; this.skillWait = rand(5000, 10000);
                }
            }

            // 技能只切換施法者的動畫；整隊照常走動、跟隨與轉向，避免看起來像整個畫面卡住。
            if (this.castingTimer <= 0) this.skillWait -= dt;
            this.attackWait -= dt;
            // 讓隊伍在窄幅展示區也能看出確實走過路面；原本 22 px/s 太慢，
            // 小尺寸畫面容易只看到走路動畫的上下晃動。
            const v = lead.direction * .046 * dt; // 約 46 px/s，持續往返移動
            lead.x += v; lead.distanceTravelled += Math.abs(v); lead.speed = v / dt * 1000;
            if (lead.x >= W - 24) { lead.x = W - 24; lead.direction = -1; }
            else if (lead.x <= 24) { lead.x = 24; lead.direction = 1; }
            movingSpeed = lead.speed;
            lead.walkPhase += dt * .012;
            lead.addTrailPoint(lead.distanceTravelled, lead.x, FLOOR_Y - lead.height);
            lead.state = lead.attackTimer > 0 ? "attack" : "walk";
            lead.isWalking = true;
            this.members.forEach((ch, i) => {
                if (i === 0) return;
                const prev = this.members[i - 1], target = prev.sampleTrail(prev.distanceTravelled - 31);
                // 以短時間常數柔順追上路徑點；隊伍距離恢復時不瞬間滑位。
                const followBlend = 1 - Math.exp(-dt / 38);
                ch.x += (target.x - ch.x) * followBlend;
                ch.y = FLOOR_Y - ch.height; ch.distanceTravelled = Math.max(ch.distanceTravelled, target.distance);
                // 隊友走到轉彎位置才改變面向，不再和領頭者同一影格集體轉身。
                ch.direction = target.direction || prev.direction; ch.state = ch.attackTimer > 0 ? "attack" : "walk";
                ch.isWalking = lead.isWalking; if (ch.isWalking) ch.walkPhase += dt * .012;
                ch.addTrailPoint(ch.distanceTravelled, ch.x, ch.y);
            });
            this.members.forEach(ch => ch.updateAmbient(dt));
            this.members.forEach(ch => { if (ch.attackTimer > 0) { ch.attackTimer -= dt; if (ch.attackTimer <= 0) ch.state = "walk"; } });
            if (this.attackWait <= 0 && this.members.length) {
                const attacker = this.members[Math.floor(Math.random() * this.members.length)];
                attacker.attackTimer = rand(420, 700); attacker.state = "attack";
                this.attackWait = rand(2600, 5200);
            }
            if (this.castingTimer <= 0 && this.skillWait <= 0 && this.members.length) {
                this.caster = this.members[Math.floor(Math.random() * this.members.length)];
                this.caster.isCastingSkill = true; this.caster.state = "skill"; this.caster.skillFrameCounter = 0;
                this.castingTimer = rand(1200, 1750); this.skillElapsed = 0;
            }
            this.background.update(dt, movingSpeed);
        }
        draw(now) {
            const ctx = this.ctx; ctx.clearRect(0, 0, W, H); ctx.imageSmoothingEnabled = false;
            this.background.draw(ctx);
            this.members.forEach(ch => ch.draw(ctx, FLOOR_Y, now));
        }
    }

    let myParty = [];
    window.myParty = myParty;
    window.Character = Character; window.Party = Party; window.Background = Background;
    const canvas = document.getElementById("hm-party-canvas");
    window.homeParty = canvas ? new Party(canvas) : null;
    window.addEventListener("resize", () => window.homeParty && window.homeParty.resize());
})();
