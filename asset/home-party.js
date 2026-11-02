/* 主頁小隊閒逛展示：純視覺，不參與彈珠戰鬥或傷害計算。 */
(() => {
    const W = 430, H = 180, FLOOR_Y = 180;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const rand = (lo, hi) => lo + Math.random() * (hi - lo);

    class Background {
        constructor(width = W, height = H) {
            this.width = width; this.height = height;
            this.polita = new Image();
            this.polita.src = "asset/ui/ui-background-polita.png";
        }
        update() { /* 背景固定；只讓角色移動，避免地景捲動造成暈眩。 */ }
        draw(ctx) {
            const w = this.width, h = this.height;
            // 從波利塔背景取下方石徑與草地，固定成一條平台，角色只在平台上行走。
            ctx.fillStyle = "#19352f"; ctx.fillRect(0, 0, w, h);
            if (this.polita.complete && this.polita.naturalWidth) {
                const img = this.polita, cropY = Math.floor(img.naturalHeight * .68), cropH = Math.floor(img.naturalHeight * .16);
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(img, 0, cropY, img.naturalWidth, cropH, 0, 0, w, h);
                ctx.fillStyle = "rgba(9,25,27,.18)"; ctx.fillRect(0, 0, w, h);
            } else {
                ctx.fillStyle = "#315943"; ctx.fillRect(0, 0, w, h);
                ctx.fillStyle = "#71835a"; ctx.fillRect(0, 9, w, 4);
                ctx.fillStyle = "#a59a68"; ctx.fillRect(0, 14, w, 31);
                for (let x = 4; x < w; x += 29) {
                    ctx.fillStyle = "#687452"; ctx.fillRect(x, 17 + (x % 3), 19, 8);
                    ctx.fillStyle = "#c2b47d"; ctx.fillRect(x + 2, 17 + (x % 3), 13, 2);
                }
            }
            // 固定的前後景硬邊，保留平台層次而不製造移動錯覺。
            ctx.fillStyle = "rgba(15,40,34,.7)"; ctx.fillRect(0, FLOOR_Y, w, h - FLOOR_Y);
            ctx.fillStyle = "#263f32"; ctx.fillRect(0, FLOOR_Y - 2, w, 3);
            ctx.fillStyle = "#a8b77c"; ctx.fillRect(0, FLOOR_Y - 2, w, 1);
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
            this.width = isLeader ? 29 : 27; this.height = isLeader ? 38 : 35;
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
            const drawState = this.isCastingSkill ? "skill" : this.state === "attack" ? "attack" : "walk";
            const stateImg = this.isFrozen ? null : this.imageFor(drawState);
            const img = this.isFrozen ? this.frozenCanvas : stateImg || (drawState !== "walk" ? this.imageFor("walk") : null);
            if (img && (img.complete === undefined || img.complete) && (img.naturalWidth === undefined || img.naturalWidth)) {
                ctx.save(); ctx.translate(Math.round(this.x), 0); ctx.scale(this.direction < 0 ? -1 : 1, 1);
                ctx.imageSmoothingEnabled = false;
                if (this.isFrozen) ctx.drawImage(img, -this.width / 2, Math.round(footY - this.height));
                else {
                    // 技能素材常帶較多留白；技能時稍微放大並以腳底對齊，避免角色看起來突然縮小。
                    const skillScale = this.isCastingSkill && stateImg ? 1.35 : 1;
                    const drawW = this.width * skillScale, drawH = this.height * skillScale;
                    ctx.drawImage(img, -drawW / 2, Math.round(footY - drawH + bob), drawW, drawH);
                }
                ctx.restore();
            } else this.drawPixelFallback(ctx, footY);
            if (this.isCastingSkill) this.drawSkillEffect(ctx, now);
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
            this.background.width = width;
            this.canvas.width = Math.round(width * dpr); this.canvas.height = Math.round(H * dpr);
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); this.ctx.imageSmoothingEnabled = false;
        }
        setActive(on) { this.active = !!on; this.last = 0; }
        sync(gender, teamIds) {
            const ids = (teamIds || []).filter(id => typeof CHAR_TABLE !== "undefined" && CHAR_TABLE[id] && roster[id] && roster[id].unlocked).slice(0, 3);
            const sig = `${gender}|${ids.join(",")}`; if (sig === this.signature) return;
            this.signature = sig; this.members = [];
            const leadId = gender === "female" ? "arisa" : "alk";
            const root = `${CDN_BASE}rarity4/${leadId}/`;
            const lead = new Character({ id: leadId, name: gender === "female" ? "亞里莎" : "埃爾克", isLeader: true, index: 0,
                spriteSrc: { walk: [root + "walk_front.gif", root + "walk_back.gif"], attack: [root + "kachidoki.gif", root + "walk_front.gif"], skill: [root + "special.gif", root + "skill_ready.gif", root + "walk_front.gif"] } });
            const partyData = [lead];
            ids.forEach((id, i) => {
                const d = CHAR_TABLE[id];
                const walk = spriteCandidates("hero", id, "down");
                const attack = spriteCandidates("hero", id, "attack");
                const skill = spriteCandidates("hero", id, "skill");
                partyData.push(new Character({ id, name: d.name, index: i + 1, element: d.element,
                    spriteSrc: { walk, attack, skill } }));
            });
            const startX = W * .68, dir = 1;
            partyData.forEach((ch, i) => {
                ch.direction = dir; ch.x = startX - i * 31; ch.y = FLOOR_Y - ch.height;
                // 預填起始軌跡，避免剛出現時所有角色跳到領頭者身上。
                for (let j = 3; j >= 0; j--) ch.history.push({ distance: -j * 31, x: ch.x - j * 31, y: ch.y, direction: dir });
                this.members.push(ch);
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
            const v = lead.direction * .022 * dt; // 約 22 px/s；保持連續移動，不插入停等造成卡頓感
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
                ch.x = target.x; ch.y = FLOOR_Y - ch.height; ch.distanceTravelled = Math.max(ch.distanceTravelled, target.distance);
                ch.direction = lead.direction; ch.state = ch.attackTimer > 0 ? "attack" : "walk";
                ch.isWalking = lead.isWalking; if (ch.isWalking) ch.walkPhase += dt * .012;
                ch.addTrailPoint(ch.distanceTravelled, ch.x, ch.y);
            });
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
