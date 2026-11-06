const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const src = html.slice(html.indexOf('function squadLabel('), html.indexOf('// ===== 編成'))
    + html.slice(html.indexOf('function toggleTeam('), html.indexOf('// ===== 隊長'))
    + html.slice(html.indexOf('function focusOwnedRoster('), html.indexOf('function buildRoster('));

// 虛擬時鐘：雙擊判定靠 performance.now()，測試自己推進時間，不等真實毫秒。
let clock = 0, seq = 0;
const pending = new Map();
const nodes = [];
function el(name) {
    const cls = new Set();
    const node = { name, classList: { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c) }, cls };
    nodes.push(node);
    return node;
}
const advance = ms => {
    const to = clock + ms;
    for (;;) {
        const due = [...pending.entries()].filter(([, t]) => t.at <= to).sort((a, b) => a[1].at - b[1].at);
        if (!due.length) break;
        const [id, timer] = due[0];
        pending.delete(id);
        clock = timer.at;
        timer.fn();
    }
    clock = to;
};
const logs = [];
let scrolls = 0;
const ctx = {
    TEAM_MAX: 3, SQUAD_COUNT: 4,
    performance: { now: () => clock },
    setTimeout: (fn, ms) => { const id = ++seq; pending.set(id, { at: clock + ms, fn }); return id; },
    clearTimeout: id => { pending.delete(id); },
    document: { querySelectorAll: sel => sel === "#team .armed" ? nodes.filter(n => n.cls.has("armed")) : [] },
    $: () => ({ scrollIntoView: () => scrolls++ }),
    log: msg => logs.push(msg), charName: id => id,
    roster: {}, unisonMap: {}, teamIds: [], squads: [], squadOn: 0, squadView: 0, editIds: [],
    syncTeamField() { ctx.fieldSyncs++; }, spawnEnemy: () => {}, spawnFoe: () => {}, saveGame: () => {}, updateUI: () => {}
};
ctx.fieldSyncs = 0;
vm.createContext(ctx);
vm.runInContext(src, ctx);
const make = (id, extra = {}) => Object.assign({ id, unlocked: true, lvl: 1, shards: 0 }, extra);
function setup(squads, squadOn = 0, squadView = squadOn) {
    ctx.roster = { a: make('a'), b: make('b'), c: make('c'), d: make('d') };
    ctx.squads = squads.map(list => list.slice());
    ctx.squadOn = squadOn; ctx.squadView = squadView;
    ctx.teamIds = ctx.squads[squadOn].slice();
    ctx.editIds = ctx.squads[squadView].slice();
    ctx.unisonMap = {}; logs.length = 0; ctx.fieldSyncs = 0;
    nodes.length = 0; clock = 0; pending.clear(); scrolls = 0;
    return ctx;
}
// 模擬卡片上的點擊：把節點塞進全域 __card，走的是 index.html 裡 onclick 同一條路。
function tap(key, node, id) {
    ctx.__card = node;
    vm.runInContext(`tapTwice('${key}', this.__card, () => toggleTeam('${id}'))`, ctx);
}
// 空角色槽的動作是捲到名冊，不是換人。
function tapSlot(key, node) {
    ctx.__card = node;
    vm.runInContext(`tapTwice('${key}', this.__card, () => focusOwnedRoster())`, ctx);
}

// 雙擊才換人：第一下只亮框，第二下才真的下場。
{
    setup([['a', 'b', 'c'], ['d'], [], []]);
    const card = el('member-b');
    tap("out:b", card, "b");
    assert.deepEqual(ctx.editIds, ['a', 'b', 'c'], '第一下不能把人拿掉');
    assert.equal(card.cls.has('armed'), true, '第一下亮金框');
    assert.equal(ctx.fieldSyncs, 0, '第一下不碰戰場');

    clock += 120;
    tap("out:b", card, "b");
    assert.deepEqual(ctx.editIds, ['a', 'c'], '350ms 內同一張第二下才下場');
    assert.deepEqual(ctx.teamIds, ['a', 'c'], '編輯實戰隊時戰場即時跟變');
    assert.equal(card.cls.has('armed'), false, '換人後金框收掉');
    assert.equal(ctx.fieldSyncs, 1);
}
// 超過間隔＝重新上膛，不是雙擊。
{
    setup([['a', 'b'], [], [], []]);
    const card = el('member-a');
    tap("out:a", card, "a");
    advance(400);
    assert.equal(card.cls.has('armed'), false, '350ms 後自動收框');
    tap("out:a", card, "a");
    assert.deepEqual(ctx.editIds, ['a', 'b'], '過期後的第一下只重新上膛');
    assert.equal(card.cls.has('armed'), true);
    clock += 100;
    tap("out:a", card, "a");
    assert.deepEqual(ctx.editIds, ['b'], '重新上膛後再補第二下才生效');
}
// 換一張卡就重新計時，不會把兩張各點一下湊成雙擊。
{
    setup([['a', 'b'], [], [], []]);
    const x = el('card-a'), y = el('card-b');
    tap("out:a", x, "a");
    clock += 60;
    tap("out:b", y, "b");
    assert.deepEqual(ctx.editIds, ['a', 'b'], '點兩張不同卡不會下場');
    assert.equal(x.cls.has('armed'), false, '上膛狀態轉到最後點的那張');
    assert.equal(y.cls.has('armed'), true);
}
// 被擋下來的雙擊不能留金框。
{
    setup([['a'], [], [], []]);
    const card = el('last-a');
    tap("out:a", card, "a");
    clock += 50;
    tap("out:a", card, "a");
    assert.deepEqual(ctx.editIds, ['a'], '最後一人不能下場');
    assert.equal(card.cls.has('armed'), false, '被擋掉也不留框');
    assert.match(logs.join('\n'), /至少要留一名角色上場/);
}
{
    setup([['a', 'b', 'c'], [], [], []]);
    const card = el('bench-d');
    tap("in:d", card, "d");
    clock += 50;
    tap("in:d", card, "d");
    assert.equal(ctx.editIds.length, 3, '滿隊時雙擊也不會硬塞人');
    assert.equal(card.cls.has('armed'), false);
    assert.match(logs.join('\n'), /已經有 3 人/);
}
// 名冊雙擊加入：非實戰那一隊只改自己，戰場不動。
{
    setup([['a', 'b'], ['c'], [], []], 0, 1);
    const card = el('bench-d');
    tap("in:d", card, "d");
    clock += 80;
    tap("in:d", card, "d");
    assert.deepEqual(ctx.editIds, ['c', 'd'], '配隊2 收到新角色');
    assert.deepEqual(ctx.teamIds, ['a', 'b'], '實戰那一隊完全沒變');
    assert.deepEqual(ctx.squads[0], ['a', 'b']);
    assert.equal(ctx.fieldSyncs, 0, '編輯別隊不重建戰場');
}

// 空角色槽也改雙擊：第一下只亮框，第二下才捲到名冊。
{
    setup([['a'], [], [], []]);
    const slot = el('empty-slot-1');
    tapSlot("slot:1", slot);
    assert.equal(slot.cls.has('armed'), true, '空槽第一下亮金框');
    assert.equal(scrolls, 0, '第一下不捲頁');
    clock += 90;
    tapSlot("slot:1", slot);
    assert.equal(scrolls, 1, '同一槽第二下才前往名冊');
    assert.equal(slot.cls.has('armed'), false);
    clock += 60;
    tapSlot("slot:2", el('empty-slot-2'));
    assert.equal(scrolls, 1, '換一個空槽要重新點滿兩下');
}
// 畫面接線：整張角色卡是按鈕，舊的「下場」小按鈕與樣式一起消失。
assert.equal(html.includes('fm-dismiss'), false, '下場按鈕已移除，同一功能只留雙擊一個入口');
assert.equal(/\.fm-dismiss/.test(fs.readFileSync(path.join(root, 'asset/pixel-rpg-ui.css'), 'utf8')
    + fs.readFileSync(path.join(root, 'asset/ui-metal-theme.css'), 'utf8')), false, '死樣式一併清掉');
assert.equal((html.match(/onclick="tapTwice\('out:/g) || []).length, 2, '隊長卡與隊員卡都能雙擊換下場');
assert.match(html, /onclick="tapTwice\('slot:\$\{i\}',this,\(\) => focusOwnedRoster\(\)\)"/, '空角色槽改雙擊');
assert.equal(html.includes('onclick="focusOwnedRoster()"'), false, '空槽沒有殘留單點入口');
assert.match(html, /onclick="tapTwice\('in:\$\{id\}',this,\(\) => toggleTeam\('\$\{id\}'\)\)"/, '名冊卡改雙擊上場');
assert.match(html, /onclick="event\.stopPropagation\(\);setCaptain\('\$\{id\}'\)"/, '點隊長鈕不會誤觸下場');
assert.match(html, /連點兩下加入隊伍；場上的角色連點兩下換下場/);
assert.match(html, /連點兩下才換人：場上角色換下場，名冊角色換上場/);
assert.match(fs.readFileSync(path.join(root, 'asset/team-formation.css'), 'utf8'),
    /#app-frame #team \.fm-slot-empty,[\s\S]{0,60}#app-frame #team \.rcard \{[^}]*touch-action: manipulation/,
    '角色卡與空槽都關掉雙拍縮放手勢');
// 隊長卡不顯示技能名：那行整段拿掉，只留有合擊時才出現的副手名。
assert.equal(html.includes('fm-captain-skill'), false, '技能名那一行與樣式一起消失');
assert.match(html, /\$\{un \? `<div class="fm-captain-unison">・合擊 \$\{CHAR_TABLE\[un\]\.name\}<\/div>` : ""\}/, '合擊副手名仍只在有搭配時出現');
assert.equal((html.match(/SKILLS\[[^\]]+\]\.name/g) || []).length, 1, '戰場 HUD 的懸停說明是唯一剩下的技能名出處');
const unisonCss = ['asset/pixel-rpg-ui.css', 'asset/ui-metal-theme.css']
    .map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
assert.equal(/fm-captain-skill/.test(unisonCss), false, '死選擇器不留');
assert.match(unisonCss, /\.fm-captain-unison/, '合擊那行有樣式接住');
new Function(src);
console.log('PASS: 雙擊上膛／第二下才換人、跨卡不累計、逾時收框、被擋掉不殘框、空槽第二下才捲名冊、非實戰隊不碰戰場、下場鈕與死樣式已除、隊長卡不再顯示技能名。');
