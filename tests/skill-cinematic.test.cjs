const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const start = html.indexOf('function startSkillCinematic(m, onImpact)');
const end = html.indexOf('// 由施放佇列呼叫', start);
assert.ok(start >= 0 && end > start, 'cinematic function source is present');

const scheduled = [];
const drawing = {
    clearRect() {}, save() {}, restore() {}, strokeText() {}, fillText() {},
    set imageSmoothingEnabled(value) {}
};
const makeNode = () => ({
    classList: { add() {}, remove() {} }, style: {}, dataset: {}, hidden: false,
    remove() {}, setAttribute() {}, appendChild() {}, getContext: () => drawing
});
const ctx = {
    SKILL_CINEMATIC: { active: false, startedAt: 0, until: 0, canvas: null, ctx: null, raf: 0,
        specialImage: null, hiddenFace: null, faceVisibility: '', particles: [] },
    PF: { foe: { x: 210, y: 180 }, vfx: { appendChild() {} }, el: { classList: { add() {}, remove() {} } } },
    SKILLS: { hero: { name: '測試技能', tag: '測試特性' } },
    CHAR_TABLE: { hero: { name: '測試角色', element: 'fire', type: 'knight' } },
    FX: { pops: [] }, W: 430, H: 760, CDN_BASE: '',
    document: { createElement: makeNode }, performance: { now: () => 0 },
    artRef: () => null,
    requestAnimationFrame(callback) { scheduled.push(callback); return scheduled.length; },
    cancelAnimationFrame() {}
};
vm.createContext(ctx);
vm.runInContext(html.slice(start, end), ctx);
const member = { ch: { id: 'hero' }, body: { x: 200, y: 500, r: 20 }, fighter: null };
ctx.startSkillCinematic(member, () => {});
assert.equal(scheduled.length, 1, 'initial cinematic frame is scheduled');
assert.doesNotThrow(() => scheduled.shift()(16), 'first cinematic frame draws title without throwing');
assert.equal(scheduled.length, 1, 'cinematic continues scheduling frames after its first draw');
console.log('PASS: skill cinematic first frame and animation loop stay alive.');
