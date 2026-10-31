const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), path = require('node:path');
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const functions = html.slice(html.indexOf('function paintFeverGauge()'), html.indexOf('function feverStart()')) +
    html.slice(html.indexOf('function feverOrb(point)'), html.indexOf('// 只攔正在下落的球'));
(async () => {
    for (const scale of [.5, 1, 2.2]) {
        const nodes = [], animations = []; let pulses = 0, starts = 0;
        const track = { classList: { remove() {}, add() { pulses++; } }, offsetWidth: 20 };
        const fill = { style: {}, parentElement: track, getBoundingClientRect: () => ({
            left: 100 + (400 + 2) * scale - 8, width: 16,
            top: 50 + (450 + 2) * scale - 2, height: 40, bottom: 1000 }) };
        const num = {};
        const host = { offsetWidth: 430, clientLeft: 2, clientTop: 2,
            getBoundingClientRect: () => ({ left: 100, top: 50, width: 430 * scale }),
            querySelectorAll: () => nodes.filter(n => n.isConnected), appendChild(n) { n.isConnected = true; nodes.push(n); } };
        const ctx = { FEVER: { active: false, value: 0, maxValue: 1000 }, FEVER_MS: 10000,
            PF: { el: host, foe: { x: 999, y: 999 } },
            $: id => id === 'fev-fill' ? fill : num,
            window: { matchMedia: () => ({ matches: false }) },
            feverStart: () => { ctx.FEVER.active = true; ctx.FEVER.left = 10000; starts++; },
            document: { createElement: () => ({ style: { setProperty() {} },
                animate(frames) { animations.push(frames); return { finished: Promise.resolve() }; },
                remove() { this.isConnected = false; } }) } };
        vm.createContext(ctx); vm.runInContext(functions, ctx);
        assert.equal(ctx.feverAdd(18, { x: 100, y: 300 }), 18);
        assert.equal(ctx.FEVER.value, 18); assert.equal(fill.style.height, '1.8%');
        assert.equal(nodes[0].style.left, '100px', 'origin is actual hit, not main foe');
        const end = animations[0][1].transform.match(/translate\(([^p]+)px,([^p]+)px\)/);
        assert.ok(Math.abs(Number(end[1]) - 300) < .001 && Math.abs(Number(end[2]) - 150) < .001, 'flight endpoint respects zoom and border');
        await Promise.resolve(); assert.equal(pulses, 1); assert.equal(nodes[0].isConnected, false);
        assert.equal(ctx.FEVER.value, 18, 'arrival never adds energy again');
        ctx.FEVER.value = 995; assert.equal(ctx.feverAdd(18, { x: 0, y: 0 }), 5);
        assert.equal(starts, 1); assert.equal(ctx.FEVER.value, 1000);
        assert.equal(ctx.feverAdd(18, { x: 0, y: 0 }), 0, 'no collection effect while FEVER active');
        await Promise.resolve();
        ctx.FEVER.active = false; ctx.FEVER.value = 0;
        ctx.window.matchMedia = () => ({ matches: true });
        const count = animations.length; ctx.feverAdd(18, { x: 0, y: 0 });
        assert.equal(animations.length, count, 'reduced motion skips travel but retains credit');
        assert.equal(ctx.FEVER.value, 18);
    }
    console.log('PASS: hit origin, zoom/border coordinate conversion, immediate energy credit, arrival pulse, cleanup, no double credit, full-meter activation and reduced motion.');
})().catch(err => { console.error(err); process.exitCode = 1; });
