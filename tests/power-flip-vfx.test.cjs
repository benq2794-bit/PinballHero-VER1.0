const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const source = read('asset/fx/power-flip-vfx.js');
const combat = read('asset/fx/power-flip.js');
const html = read('index.html');
const liveRenderer = html.match(/function showPowerFlipVFX\([\s\S]*?\n\}/)?.[0] || '';
const classes = ['knight', 'fighter', 'ranger', 'special', 'supporter'];
const levels = [1, 2, 3];
const close = (a, b, label) => assert.ok(Math.abs(a - b) < 1e-8, `${label}: ${a} != ${b}`);
const paints = calls => calls.filter(call => ['stroke', 'fill', 'fillRect', 'strokeRect', 'drawImage'].includes(call.op));
const sprites = calls => calls.filter(call => call.op === 'drawImage');
const point = (matrix, x, y) => [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]];

// Browsers silently ignore NaN globalAlpha assignments; reject them at the canvas boundary.
function recorder() {
    let calls = [], stack = [], currentPath = [];
    let state = { matrix: [1, 0, 0, 1, 0, 0], globalAlpha: 1, globalCompositeOperation: 'source-over',
        fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, shadowBlur: 0, shadowColor: 'transparent', lineCap: 'butt' };
    const valid = (value, label) => {
        if (typeof value === 'number') assert.ok(Number.isFinite(value), `${label} must be finite, got ${value}`);
        if (typeof value === 'string') {
            assert.doesNotMatch(value, /NaN|Infinity|undefined/, label);
            const rgba = value.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([^\)]+)\)$/);
            if (rgba) assert.ok(Number(rgba[1]) >= 0 && Number(rgba[1]) <= 1, `${label} alpha is in range`);
        }
    };
    const record = (op, args) => {
        args.forEach((value, index) => {
            valid(value, op);
            if (op === 'drawImage' && index === 0) assert.equal(typeof value, 'string', 'atlas source is set');
            else if (!(op === 'arc' && index === 5 && typeof value === 'boolean')) {
                assert.equal(typeof value, 'number', `${op} coordinate/size must be numeric`);
            }
        });
        state.matrix.forEach(value => valid(value, `${op} transform`));
        const call = { op, args: [...args], matrix: [...state.matrix], alpha: state.globalAlpha,
            fillStyle: state.fillStyle, strokeStyle: state.strokeStyle, lineWidth: state.lineWidth };
        calls.push(call);
        return call;
    };
    const multiply = ([a, b, c, d, e, f]) => {
        const m = state.matrix;
        state.matrix = [m[0] * a + m[2] * b, m[1] * a + m[3] * b,
            m[0] * c + m[2] * d, m[1] * c + m[3] * d,
            m[0] * e + m[2] * f + m[4], m[1] * e + m[3] * f + m[5]];
    };
    const methods = {
        save() { stack.push({ ...state, matrix: [...state.matrix] }); },
        restore() { assert.ok(stack.length, 'restore must match save'); state = stack.pop(); },
        setTransform(...args) { record('setTransform', args); state.matrix = [...args]; },
        translate(x, y) { record('translate', [x, y]); multiply([1, 0, 0, 1, x, y]); },
        rotate(angle) { record('rotate', [angle]); multiply([Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0]); },
        scale(x, y) { record('scale', [x, y]); multiply([x, 0, 0, y, 0, 0]); },
        beginPath() { currentPath = []; },
        clearRect(...args) { record('clearRect', args); },
        clip() { record('clip', []); },
        drawImage(image, ...args) { assert.ok(image.complete && image.naturalWidth); record('drawImage', [image.src, ...args]); }
    };
    for (const op of ['moveTo', 'lineTo', 'arc', 'rect', 'quadraticCurveTo', 'bezierCurveTo', 'closePath']) {
        methods[op] = (...args) => {
            if (op === 'arc') assert.ok(args[2] >= 0, 'arc radius must be nonnegative');
            const call = record(op, args);
            currentPath.push({ op, args: call.args, matrix: call.matrix });
        };
    }
    for (const op of ['stroke', 'fill', 'fillRect', 'strokeRect']) {
        methods[op] = (...args) => {
            const call = record(op, args);
            if (op === 'stroke' || op === 'fill') call.path = [...currentPath];
        };
    }
    for (const op of ['createLinearGradient', 'createRadialGradient']) {
        methods[op] = (...args) => {
            record(op, args);
            const gradient = { kind: op, stops: [], addColorStop(offset, color) {
                valid(offset, 'gradient stop'); valid(color, 'gradient color');
                assert.ok(offset >= 0 && offset <= 1); this.stops.push([offset, color]);
            } };
            return gradient;
        };
    }
    const context = new Proxy(methods, {
        get(target, key) {
            if (key in target) return target[key];
            assert.ok(key in state, `unexpected canvas API: ${String(key)}`);
            return state[key];
        },
        set(target, key, value) {
            valid(value, String(key));
            if (key === 'globalAlpha') assert.ok(typeof value === 'number' && value >= 0 && value <= 1, `globalAlpha out of range: ${value}`);
            state[key] = value;
            return true;
        }
    });
    return { context, take() {
        assert.equal(stack.length, 0, 'each frame balances canvas save/restore');
        assert.equal(state.globalAlpha, 1, 'alpha does not leak between effects/frames');
        assert.equal(state.globalCompositeOperation, 'source-over', 'blend mode does not leak');
        const result = calls; calls = []; return result;
    } };
}

function setup({ hasContainer = true, hasContext = true, dpr = 1 } = {}) {
    let now = 10000, nextId = 0;
    const frames = new Map(), canvases = [], drawing = recorder();
    const container = { appendChild(canvas) {
        assert.equal(canvases.filter(node => node.isConnected).length, 0, 'only one overlay canvas may be attached');
        canvas.isConnected = true;
    } };
    class FakeImage {
        constructor() { this.complete = true; this.naturalWidth = this.width = 3072; this.height = 1152; }
    }
    const ctx = {
        document: { getElementById: id => id === 'pf-vfx' && hasContainer ? container : null,
            createElement(tag) {
                assert.equal(tag, 'canvas');
                const canvas = { style: {}, isConnected: false, setAttribute() {},
                    getContext: kind => { assert.equal(kind, '2d'); return hasContext ? drawing.context : null; },
                    remove() { this.isConnected = false; } };
                canvases.push(canvas); return canvas;
            } },
        Image: FakeImage, devicePixelRatio: dpr, performance: { now: () => now },
        // Centered randomness keeps shake/particle comparisons reproducible.
        Math: Object.assign(Object.create(Math), { random: () => .5 }),
        PF: { paused: false, foeSeq: 1, vfx: true },
        requestAnimationFrame(callback) {
            assert.equal(frames.size, 0, 'all effects/impacts share one RAF');
            frames.set(++nextId, callback); return nextId;
        },
        cancelAnimationFrame: id => frames.delete(id), console
    };
    ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(read('asset/game-data.js'), ctx);
    vm.runInContext(source, ctx);
    return { ctx, renderer: ctx.PowerFlipVFX, canvases, frames,
        get now() { return now; },
        advance(ms) { assert.ok(ms >= 0); now += ms; },
        frame(ms = 0) {
            this.advance(ms);
            assert.equal(frames.size, 1, 'a live effect schedules exactly one frame');
            const [id, callback] = frames.entries().next().value;
            frames.delete(id); callback(now);
            return drawing.take();
        },
        clean() {
            assert.equal(ctx.PowerFlipVFX.activeCount(), 0, 'no effects or impacts remain');
            assert.equal(frames.size, 0, 'no RAF leaks after cleanup');
            assert.ok(canvases.every(canvas => !canvas.isConnected), 'no overlay canvas leaks after cleanup');
            drawing.take();
        }
    };
}

// The damage stub reports impact exactly where the live damage boundary does.
function addCombat(h, type, level, radiusRank = 0) {
    const c = h.ctx, noop = () => {};
    const body = { x: 210, y: 500, vx: 0, vy: -600, r: 20, ball: { classList: { add: noop, remove: noop } } };
    const ch = { id: 'leader', hp: 100, gauge: 42 }, member = { ch, body, down: false };
    const hits = [], plays = [], radii = [];
    Object.assign(c.PF, { running: true, ready: true, members: [member], foe: { x: 210, y: 200, r: 30 }, extraFoes: [] });
    Object.assign(c, { combo: [0, 9, 15, 39][level], comboAt: 1, teamIds: ['leader'], roster: { leader: ch },
        CHAR_TABLE: { leader: { type, element: 'fire' } }, enemy: { hp: 1e9 },
        CRIT_DMG: 1.5, rollCrit: () => false, atkOf: () => 100, talentRank: () => 0,
        mainAccountBonus: () => ({ powerFlipDamage: 0 }), elementMultiplier: () => 1,
        showPassiveFX: noop, showPassiveHitFeedback: noop, checkKill: noop,
        aliveMembers: () => [member], addCd: (m, n) => { m.ch.gauge += n; },
        FX: { pop: noop }, SFX: { powerFlip: noop, hit: noop },
        flipLevel: () => [9, 15, 39].filter(n => c.combo >= n).length,
        applyDamage(who, damage, options) {
            const state = options.pfState;
            hits.push({ at: h.now, count: state.hits, x: options.target.x, y: options.target.y, state });
            c.combo += options.combo || 0;
            c.PowerFlipVFX.impact(state.type, options.target.x, options.target.y, state.lv, { state, critical: options.critical });
            return damage;
        }
    });
    vm.runInContext(read('asset/type-effects.js'), c);
    c.typeEffects = c.TypeEffects.create({ isActive: requested => requested === 'special' && type === 'special',
        getTalent: id => id === 'special_burst_radius' ? radiusRank : 0, isFever: () => false });
    vm.runInContext(read('asset/enemy-wave.js') + combat + '\n' + liveRenderer, c);
    const play = c.showPowerFlipVFX, inRadius = c.enemyTargetsInRadius;
    c.showPowerFlipVFX = (...args) => { plays.push(args); return play(...args); };
    c.enemyTargetsInRadius = (x, y, radius) => { radii.push(radius); return inRadius(x, y, radius); };
    c.launchPowerFlip(body);
    assert.equal(body.powerFlip.lv, level);
    return { c, body, member, hits, plays, radii };
}

// All fifteen variants coexist, but fighter sprites require a real hit event.
{
    const h = setup();
    assert.deepEqual(Object.keys(h.renderer.catalog), classes);
    for (const type of classes) {
        assert.equal(h.renderer.catalog[type].length, 3);
        for (const level of levels) assert.equal(h.renderer.play(type, 210, 300, .35, level), true);
    }
    assert.equal(h.renderer.activeCount(), 15);
    const first = h.frame();
    assert.ok(paints(first).length > 0, 'non-fighter effects draw immediately');
    assert.equal(sprites(first).length, 0, 'no fabricated fighter atlas sprites on play');
    for (const time of [1, 16, 84, 85, 170, 255, 340, 400, 600, 749, 750, 849, 850, 949, 950, 1000, 1300, 1450, 1600, 2150, 2800, 4599, 4600]) {
        const calls = h.frame(10000 + time - h.now);
        assert.equal(sprites(calls).length, 0, 'elapsed time alone never creates fighter hits');
        if (time === 1000) assert.equal(h.renderer.activeCount(), 8, 'expired ranger/fighter/PF1 blast do not linger');
        if (time === 1300) assert.equal(h.renderer.activeCount(), 7, 'there is no artificial all-15 preview timeline');
    }
    assert.equal(h.canvases.length, 1, 'all 15 variants use one canvas');
    h.clean();
}
console.log('PASS: all 15 PF variants use a finite, balanced canvas; fighter previews fabricate no hits.');

for (const level of levels) {
    const h = setup(), { c, body, member, hits, plays } = addCombat(h, 'fighter', level);
    const state = body.powerFlip, start = h.now, count = 2 + level;
    c.powerFlipContact(member, c.PF.foe);
    assert.equal(plays.length, 1);
    assert.equal(plays[0][7].state, state, 'contact passes the real PF state through the HTML wrapper');
    assert.equal(paints(h.frame()).length, 0, 'contact alone cannot fabricate fists, sprites or particles');
    let regularSize;
    for (let i = 0; i < count; i++) {
        if (i) {
            h.advance(84); c.updatePowerFlip(84);
            assert.equal(hits.length, i, 'no hit before the real 85ms combat interval');
            assert.equal(sprites(h.frame()).filter(call => call.args[1] === 0).length, 0, 'no new sprite before a hit');
            h.advance(1);
        }
        c.PF.foe.x = 210 + i * 11; c.PF.foe.y = 200 + i * 7;
        c.updatePowerFlip(i ? 1 : 0);
        assert.equal(hits.length, i + 1, 'the first update hits immediately, subsequent hits respect the cooldown');
        assert.equal(state.hits, i + 1);
        const fresh = sprites(h.frame()).filter(call => call.args[1] === 0);
        assert.equal(fresh.length, 1, 'exactly one atlas animation begins per actual hit');
        const sprite = fresh[0], major = i === count - 1;
        assert.equal(sprite.args[2], (major || level === 3 ? 2 : level - 1) * 384, 'correct regular/finisher atlas row');
        const center = point(sprite.matrix, 0, 0);
        close(center[0], c.PF.foe.x, 'sprite follows the real hit x');
        close(center[1], c.PF.foe.y, 'sprite follows the real hit y');
        if (!i) regularSize = sprite.args[7];
        if (major) assert.ok(sprite.args[7] > regularSize * 1.5, 'only the actual last hit gets the large finisher');
        else close(sprite.args[7], regularSize, 'non-final hits remain regular size');
    }
    assert.deepEqual(hits.map(hit => hit.at - start), Array.from({ length: count }, (_, i) => i * 85));
    assert.deepEqual(hits.map(hit => hit.count), Array.from({ length: count }, (_, i) => i + 1));
    assert.equal(body.powerFlip, null, 'combat ends at exactly 3/4/5 hits');
    h.advance(151); c.updatePowerFlip(151);
    assert.equal(hits.length, count, 'no extra damage after combo completion');
    assert.equal(sprites(h.frame()).length, 1, 'only the real finisher remains after normal hit sprites expire');
    assert.equal(sprites(h.frame(129)).length, 0, 'finisher expires 280ms after its actual hit');
    h.frame(1000); h.clean();
}
// An interrupted combo must not finish itself; an unrelated state cannot feed it.
{
    const h = setup(), { c, body, member, hits } = addCombat(h, 'fighter', 3);
    c.powerFlipContact(member, c.PF.foe); c.updatePowerFlip(0); h.frame();
    c.clearPowerFlip(body);
    for (const dt of [85, 85, 85, 85]) {
        h.advance(dt); c.updatePowerFlip(dt);
        assert.equal(sprites(h.frame()).filter(call => call.args[1] === 0).length, 0, 'aborted combo creates no later strikes');
    }
    assert.equal(hits.length, 1);
    h.renderer.impact('fighter', 50, 60, 3, { state: { hits: 5 } });
    assert.equal(sprites(h.frame()).length, 0, 'a different state produces only the dedicated impact, never this combo sprite');
    h.frame(1000); h.clean();
}
console.log('PASS: real fighter combat produces exactly 3/4/5 immediate, 85ms-spaced hits and a final-hit-only finisher.');

for (const type of ['knight', 'supporter']) {
    for (const level of levels) {
        const h = setup(), body = { x: 90, y: 320 }, state = { body };
        body.powerFlip = state;
        assert.equal(h.renderer.play(type, 210, 300, .2, level, 1, 760, { state, follow: body }), true);
        for (const [ms, x, y] of [[0, 90, 320], [400, 315, 450], [50, 0, 0]]) {
            body.x = x; body.y = y;
            const calls = h.frame(ms);
            assert.deepEqual(calls.find(call => call.op === 'translate').args, [x, y], `${type} PF${level} follows the real body, including zero coordinates`);
            const anchor = calls.find(call => call.op === 'arc' && call.args[2] === (type === 'knight' ? 63 : 48));
            assert.ok(anchor, 'body-centered slash/halo is rendered');
            const center = point(anchor.matrix, anchor.args[0], anchor.args[1]);
            close(center[0], x, 'visible slash/halo center tracks body x');
            close(center[1], y, 'visible slash/halo center tracks body y');
            assert.ok(paints(calls).length > 0);
        }
        body.powerFlip = null;
        h.frame();
        h.frame(219);
        assert.equal(h.renderer.activeCount(), 1, `${type} does not vanish abruptly when the body state clears`);
        h.frame(1);
        if (type === 'knight') h.clean();
        else {
            assert.equal(h.renderer.activeCount(), 1, 'support aura survives consumed launch state, unlike the knight tail');
            h.frame(3930); h.clean();
        }
    }
}
console.log('PASS: knight/supporter follow the live body; knight state removal leaves only its 220ms tail.');

for (const level of levels) {
    for (const [rank, talentScale] of [[0, 1], [3, 1.36], [5, 1.6]]) {
        const h = setup(), { c, body, member, plays, radii } = addCombat(h, 'special', level, rank);
        const state = body.powerFlip;
        c.powerFlipContact(member, c.PF.foe);
        const radius = (80 + level * 35) * talentScale;
        close(radii[0], radius, 'real special damage query radius');
        assert.equal(plays[0][7].state, state);
        close(plays[0][7].radius, radius, 'actual radius reaches renderer options');
        const calls = h.frame(325), color = ['#ffcf77', '#a1e6ff', '#d6a4ff'][level - 1];
        const burst = calls.find(call => call.op === 'stroke' && call.strokeStyle === color && call.path.some(part => part.op === 'arc'));
        assert.ok(burst, 'special burst is drawn');
        const arc = burst.path.find(part => part.op === 'arc');
        const worldRadius = arc.args[2] * Math.hypot(arc.matrix[0], arc.matrix[1]);
        close(worldRadius, radius * (.12 + 1.05 * (1 - Math.pow(.5, 2.5))), 'visual burst scales to the real talent-adjusted radius');
        h.frame(2000); h.clean();
    }
}
for (const level of levels) {
    for (const length of [760, 431]) {
        const h = setup(), angle = -.63, x = 173, y = 481, lanes = [1, 2, 5][level - 1];
        h.renderer.play('ranger', x, y, angle, level, 1, length);
        for (const ms of [0, 1, 15]) {
            const lines = h.frame(ms).filter(call => call.op === 'stroke' && call.path.length === 2 && call.path[0].op === 'moveTo' && call.path[1].op === 'lineTo');
            const beams = lines.filter(call => {
                const [a, b] = call.path.map(part => point(part.matrix, ...part.args));
                return Math.abs(Math.hypot(b[0] - a[0], b[1] - a[1]) - length) < 1e-8;
            });
            const coreColor = ['#fff5bc', '#f1fff2', '#ffffff'][level - 1];
            assert.equal(beams.filter(beam => beam.strokeStyle === coreColor).length, lanes, `PF${level} ranger draws every full-length beam core on the first frame, not a travelling reveal`);
            for (const beam of beams) {
                const [a, b] = beam.path.map(part => point(part.matrix, ...part.args));
                close(b[0] - a[0], Math.cos(angle) * length, 'beam end x');
                close(b[1] - a[1], Math.sin(angle) * length, 'beam end y');
                close((a[0] - x) * Math.cos(angle) + (a[1] - y) * Math.sin(angle), 0, 'beam starts at the launch plane');
                assert.ok(beam.alpha > 0, 'full beam is visible immediately');
            }
        }
        h.frame(1000); h.clean();
    }
}
console.log('PASS: special visuals match actual rank 0/3/5 burst radii; all ranger levels draw full beams immediately.');

for (const level of levels) {
    const h = setup();
    h.renderer.play('supporter', 210, 360, 0, level);
    const before = h.frame(200);
    const early = h.frame(200), late = h.frame(1600);
    const seal = calls => calls.filter(call => call.op === 'stroke' && call.strokeStyle === '#a7ffcd');
    const leaves = calls => calls.filter(call => call.op === 'stroke' && call.strokeStyle === '#edffccaa');
    const field = calls => calls.filter(call => call.op === 'fillRect' && typeof call.fillStyle === 'string' && call.fillStyle.startsWith('rgba(126,255,187,'));
    assert.equal(seal(before).length, 0, 'seal waits until the aura is active');
    assert.equal(leaves(before).length, 0, 'leaves wait until the aura is active');
    for (const calls of [early, late]) {
        assert.equal(seal(calls).length, level === 3 ? 1 : 0, 'magic seal is PF3-only');
        assert.equal(leaves(calls).length, level === 3 ? 39 : 0, 'falling leaves are PF3-only');
    }
    assert.equal(field(early).length, level === 3 ? 1 : 0, 'field burst is PF3-only');
    assert.equal(field(late).length, 0, 'field burst expires independently of the persistent aura');
    h.frame(2600); h.clean();
}

// Pause may redraw or retain the canvas, but neither route may advance the effect.
const fingerprint = calls => JSON.stringify(paints(calls), (key, value) => typeof value === 'number' ? Math.round(value * 1e9) / 1e9 : value);
for (const type of classes) {
    const h = setup(), body = { x: 210, y: 300 }, state = { body, hits: 1 };
    body.powerFlip = state;
    h.renderer.play(type, 210, 300, .35, 3, 1, 760, { state, follow: body });
    if (type === 'knight') h.frame(350); // Include the PF3 particle burst in the frozen frame.
    h.renderer.impact(type, 220, 310, 3, { state, critical: true });
    const before = h.frame(100), count = h.renderer.activeCount();
    assert.ok(paints(before).length > 0);
    h.ctx.PF.paused = true;
    for (const ms of [5000, 7000]) {
        const paused = h.frame(ms);
        assert.equal(h.renderer.activeCount(), count, `${type}: paused wall time cannot expire effects/impacts`);
        if (paints(paused).length) assert.equal(fingerprint(paused), fingerprint(before), `${type}: pause freezes rendered geometry, alpha and particles`);
        else assert.equal(paused.filter(call => call.op === 'clearRect').length, 0, 'pause must not erase the frozen image');
    }
    h.ctx.PF.paused = false;
    h.frame(1);
    assert.equal(h.renderer.activeCount(), count, 'resume advances only the new unpaused delta');
    h.frame(5000); h.clean();
}
console.log('PASS: supporter PF3 seal/leaves stay gated; pause freezes geometry, alpha, particles and impact/effect expiry.');

// Public input validation must not allocate a canvas or schedule an empty loop.
{
    const h = setup();
    for (const type of ['', 'mage', 'constructor', 'toString', '__proto__', null, undefined]) {
        assert.equal(h.renderer.play(type, 0, 0, 0, 1), false);
        assert.equal(h.renderer.impact(type, 0, 0, 1), false);
    }
    for (const level of [0, -1, 4, 1.5, NaN, Infinity, '2', null]) {
        assert.equal(h.renderer.play('knight', 0, 0, 0, level), false);
        assert.equal(h.renderer.impact('knight', 0, 0, level), false);
    }
    assert.equal(h.canvases.length, 0);
    h.clean();
}
for (const options of [{ hasContainer: false }, { hasContext: false }]) {
    const h = setup(options);
    assert.equal(h.renderer.play('ranger', 10, 20), false);
    assert.equal(h.renderer.impact('knight', 10, 20, 1), false);
    h.clean();
}
for (const paused of [false, true]) {
    const h = setup();
    for (const type of classes) for (const level of levels) {
        h.renderer.play(type, 210, 300, 0, level);
        h.renderer.impact(type, 220, 310, level);
    }
    assert.equal(h.renderer.activeCount(), 30, 'effects and dedicated impacts are both tracked');
    h.frame(16); h.ctx.PF.paused = paused; h.ctx.PF.foeSeq++;
    assert.equal(paints(h.frame(16)).length, 0, 'old-wave effects and impacts cannot draw in the new wave, even paused');
    h.clean();
}
{
    const h = setup({ dpr: 3 });
    for (let i = 0; i < 3; i++) {
        h.renderer.play('knight', 10, 20);
        h.renderer.impact('fighter', 30, 40, 2);
        const canvas = h.canvases.at(-1), world = h.ctx.GAME_DATA.combatRules.physics;
        assert.equal(canvas.width, world.width * 2, 'canvas DPR is capped at two');
        assert.equal(canvas.height, world.height * 2);
        h.frame(16); h.renderer.clear(); h.renderer.clear(); h.clean();
        assert.equal(h.renderer.impact('knight', 12, 500, 1, { wall: true }), true, 'impact can create its own canvas after clear');
        assert.ok(paints(h.frame()).length > 0, 'wall feedback draws immediately');
        h.frame(139); assert.equal(h.renderer.activeCount(), 1);
        h.frame(1); h.clean();
    }
    h.renderer.play('supporter', 210, 300);
    h.canvases.at(-1).remove(); h.frame(); h.clean();
}
for (const level of levels) {
    const h = setup();
    h.renderer.impact('knight', 20, 30, level);
    h.frame(210 + level * 25 - 1); assert.equal(h.renderer.activeCount(), 1);
    h.frame(1); h.clean();
}

// Preserve the source-level integration guards alongside behavioral coverage.
assert.match(source, /fx\.level === 3 && t < 1\.35/);
assert.match(source, /active && fx\.level === 3/);
assert.match(combat, /showPowerFlipVFX\('fighter', target\.x, target\.y, angle, state\.lv, 1, 760, \{ state \}\)/);
assert.match(combat, /showPowerFlipVFX\('supporter', b\.x, b\.y, 0, state\.lv, 1, 760, \{ state, follow: b \}\)/);
assert.match(combat, /showPowerFlipVFX\(state\.type, state\.body\.x, state\.body\.y, angle, state\.lv, 1, 760,\s*\{ state, follow: state\.body \}\)/);
assert.match(html, /asset\/fx\/power-flip-vfx\.js/);
assert.match(liveRenderer, /return window\.PowerFlipVFX\.play\(type, x, y, angle, level, visualScale, beamLength, options\)/);
assert.match(html, /window\.PowerFlipVFX\.impact\(state\.type, e\.x, e\.y, state\.lv, \{ state, critical: opt\.critical \}\)/);
assert.doesNotMatch(html, /const PF_FX =/);
assert.doesNotMatch(liveRenderer, /background-image|\.animate\(/);
console.log('PASS: invalid inputs, missing canvas/context, wave changes, repeated clear/restart and expiry leak no canvas or RAF; live options/impact integration is wired.');
