const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const cut = (from, to) => {
    const a = html.indexOf(from), b = html.indexOf(to, a + from.length);
    assert.ok(a >= 0 && b > a, `切片錨點失效：${from} → ${to}`);
    return html.slice(a, b);
};
const src = cut('function squadLabel(', '// ===== 編成')
    + cut('function toggleTeam(', '// ===== 隊長')
    + cut('function setCaptain(', '// ===== UI =====')
    + cut('function focusOwnedRoster(', 'function buildHudTeam(');

const logs = [];
let scrolls = 0, renders = 0, slotBuilds = 0;
const ctx = {
    TEAM_MAX: 3, SQUAD_COUNT: 4,
    $: () => ({ scrollIntoView: () => scrolls++ }),
    log: msg => logs.push(msg), charName: id => id,
    renderPage: () => renders++, buildSlots: () => slotBuilds++,
    CHAR_TABLE: { a: { type: 'knight', lead: '測試特性' }, b: { type: 'knight', lead: '測試特性' }, c: { type: 'knight', lead: '測試特性' }, d: { type: 'knight', lead: '測試特性' } },
    TYPE_INFO: { knight: { n: '劍士', d: '測試說明' } },
    roster: {}, unisonMap: {}, teamIds: [], squads: [], squadOn: 0, squadView: 0, editIds: [],
    syncTeamField() { ctx.fieldSyncs++; }, spawnEnemy: () => {}, spawnFoe: () => {}, saveGame: () => {}, updateUI: () => {}
};
ctx.fieldSyncs = 0;
vm.createContext(ctx);
vm.runInContext(src, ctx);
// squadReplaceFor／squadLeadOpen 是 let 全域，不是 ctx 屬性，只能跟 vm 要。
const replaceFor = () => vm.runInContext('squadReplaceFor', ctx);
const leadOpen = () => vm.runInContext('squadLeadOpen', ctx);
const make = (id, extra = {}) => Object.assign({ id, unlocked: true, lvl: 1, shards: 0 }, extra);
function setup(squads, squadOn = 0, squadView = squadOn) {
    ctx.roster = { a: make('a'), b: make('b'), c: make('c'), d: make('d') };
    ctx.squads = squads.map(list => list.slice());
    ctx.squadOn = squadOn; ctx.squadView = squadView;
    ctx.teamIds = ctx.squads[squadOn].slice();
    ctx.editIds = ctx.squads[squadView].slice();
    ctx.unisonMap = {}; logs.length = 0; ctx.fieldSyncs = 0;
    scrolls = 0; renders = 0; slotBuilds = 0;
    vm.runInContext('squadReplaceFor = null; squadLeadOpen = false;', ctx);
    return ctx;
}

// 卸下＝點一下就生效，不再有上膛／雙擊判定。
{
    setup([['a', 'b', 'c'], ['d'], [], []]);
    ctx.squadLeave('b');
    assert.deepEqual(Array.from(ctx.editIds), ['a', 'c'], '卸下按鈕點一次就把人拿掉');
    assert.deepEqual(Array.from(ctx.teamIds), ['a', 'c'], '編輯實戰隊時戰場即時跟變');
    assert.equal(ctx.fieldSyncs, 1);
    assert.match(logs.join('\n'), /下場休息/);
}
// 最後一人不能卸下，沿用 toggleTeam 原本的防呆。
{
    setup([['a'], [], [], []]);
    ctx.squadLeave('a');
    assert.deepEqual(Array.from(ctx.editIds), ['a'], '最後一人不能下場');
    assert.equal(ctx.fieldSyncs, 0);
    assert.match(logs.join('\n'), /至少要留一名角色上場/);
}
// 卸下不在場上的人＝什麼都不做，不會誤觸加入。
{
    setup([['a', 'b'], [], [], []]);
    ctx.squadLeave('d');
    assert.deepEqual(Array.from(ctx.editIds), ['a', 'b']);
    assert.equal(logs.length, 0);
}
// 選取＝未滿隊時直接加入。
{
    setup([['a', 'b'], [], [], []]);
    ctx.squadJoin('c');
    assert.deepEqual(Array.from(ctx.editIds), ['a', 'b', 'c'], '選取直接補進空位');
    assert.equal(ctx.fieldSyncs, 1);
    assert.equal(replaceFor(), null, '加入後不留替換狀態');
}
// 選取已上場／未解鎖的角色＝不重複加入。
{
    setup([['a', 'b'], [], [], []]);
    ctx.roster.d = make('d', { unlocked: false });
    ctx.squadJoin('a'); ctx.squadJoin('d');
    assert.deepEqual(Array.from(ctx.editIds), ['a', 'b']);
    assert.equal(logs.length, 0);
}
// 滿隊時選取＝開替換列，不硬塞人、也不先踢掉誰。
{
    setup([['a', 'b', 'c'], [], [], []]);
    ctx.squadJoin('d');
    assert.deepEqual(Array.from(ctx.editIds), ['a', 'b', 'c'], '滿隊不會硬塞第四人');
    assert.equal(replaceFor(), 'd', '改成指定誰下場');
    assert.equal(renders, 1, '替換列要回到頁首才看得到');
    assert.equal(ctx.fieldSyncs, 0, '還沒決定前不碰戰場');
    assert.equal(logs.length, 0);
}
// 替換：點名哪位下場就換哪位，位置保留。
{
    setup([['a', 'b', 'c'], [], [], []]);
    ctx.openSquadReplace('d');
    ctx.replaceSquadMember(1, 'd');
    assert.deepEqual(Array.from(ctx.editIds), ['a', 'd', 'c'], '隊員位置原位替換');
    assert.deepEqual(Array.from(ctx.teamIds), ['a', 'd', 'c']);
    assert.deepEqual(Array.from(ctx.squads[0]), ['a', 'd', 'c'], '寫回配隊');
    assert.equal(replaceFor(), null, '替換完成收掉替換列');
    assert.equal(ctx.fieldSyncs, 1);
    assert.match(logs.join('\n'), /d<\/b> 替換 <b>b/);
}
// 替換隊長＝index 0，新角色直接成為隊長。
{
    setup([['a', 'b', 'c'], [], [], []]);
    ctx.openSquadReplace('d');
    ctx.replaceSquadMember(0, 'd');
    assert.deepEqual(Array.from(ctx.editIds), ['d', 'b', 'c']);
}
// 被替換下場的人若有合擊搭檔，搭檔一起退回名冊（沿用 toggleTeam 的規則）。
{
    setup([['a', 'b', 'c'], [], [], []]);
    ctx.unisonMap = { b: 'd' };
    ctx.roster.e = make('e'); ctx.CHAR_TABLE.e = { type: 'knight', lead: '測試特性' };
    ctx.openSquadReplace('e');
    ctx.replaceSquadMember(1, 'e');
    assert.deepEqual(Array.from(ctx.editIds), ['a', 'e', 'c']);
    assert.equal(ctx.unisonMap.b, undefined, '下場者的合擊映射要清掉');
    assert.match(logs.join('\n'), /合擊搭檔 <b>d<\/b> 一同退回名冊/);
}
// 取消替換：名單不動，只重繪槽位。
{
    setup([['a', 'b', 'c'], [], [], []]);
    ctx.openSquadReplace('d');
    ctx.cancelSquadReplace();
    assert.deepEqual(Array.from(ctx.editIds), ['a', 'b', 'c']);
    assert.equal(replaceFor(), null);
    assert.equal(slotBuilds, 1);
    assert.equal(ctx.fieldSyncs, 0);
}
// 非法替換一律當取消：空索引、換自己、未解鎖、已在場上。
{
    setup([['a', 'b', 'c'], [], [], []]);
    ctx.roster.e = make('e', { unlocked: false });
    for (const [index, id] of [[3, 'd'], [1, 'b'], [1, 'e'], [-1, 'd']]) {
        ctx.openSquadReplace(id === 'b' ? 'd' : id);
        ctx.replaceSquadMember(index, id);
        assert.equal(replaceFor(), null, `非法替換 ${index}/${id} 要收掉替換列`);
    }
    assert.deepEqual(Array.from(ctx.editIds), ['a', 'b', 'c'], '非法替換不能改名單');
    assert.equal(ctx.fieldSyncs, 0);
}
// openSquadReplace 在未滿隊時等同選取；已在場上的人不會開替換列。
{
    setup([['a'], [], [], []]);
    ctx.openSquadReplace('b');
    assert.deepEqual(Array.from(ctx.editIds), ['a', 'b']);
    assert.equal(replaceFor(), null);
    ctx.openSquadReplace('a');
    assert.equal(replaceFor(), null, '場上的人沒有替換可言');
}
// 編輯非實戰那一隊：只改自己，戰場完全不動。
{
    setup([['a', 'b'], ['c'], [], []], 0, 1);
    ctx.squadJoin('d');
    assert.deepEqual(Array.from(ctx.editIds), ['c', 'd'], '配隊2 收到新角色');
    assert.deepEqual(Array.from(ctx.teamIds), ['a', 'b'], '實戰那一隊完全沒變');
    assert.deepEqual(Array.from(ctx.squads[0]), ['a', 'b']);
    assert.equal(ctx.fieldSyncs, 0, '編輯別隊不重建戰場');
}
// 翻隊與設成實戰隊都要收掉半完成的替換狀態。
{
    setup([['a', 'b', 'c'], ['d'], [], []]);
    ctx.openSquadReplace('d');
    assert.equal(replaceFor(), 'd');
    ctx.viewSquad(1);
    assert.equal(replaceFor(), null, '翻隊收掉替換列');
    assert.deepEqual(Array.from(ctx.editIds), ['d']);
    ctx.viewSquad(0);
    ctx.openSquadReplace('d');
    ctx.useSquad();
    assert.equal(replaceFor(), null, '設成實戰隊也收掉替換列');
    assert.equal(ctx.squadOn, 0);
}
// 空角色槽點一下就直接捲到持有角色列表。
{
    setup([['a'], [], [], []]);
    ctx.focusOwnedRoster();
    assert.equal(scrolls, 1, '空槽單點就前往名冊');
}
// 隊伍特性預設收合，點一下展開、再點一下收合。
{
    setup([['a', 'b'], [], [], []]);
    assert.equal(leadOpen(), false, '預設收合');
    ctx.toggleSquadLead();
    assert.equal(leadOpen(), true);
    assert.equal(slotBuilds, 1);
    ctx.toggleSquadLead();
    assert.equal(leadOpen(), false);
    assert.equal(slotBuilds, 2);
    assert.deepEqual(Array.from(ctx.editIds), ['a', 'b'], '收合展開不碰編隊');
}
// 隊長鈕仍是獨立操作：把隊員搬到 index 0，不是卸下。
{
    setup([['a', 'b', 'c'], [], [], []]);
    ctx.setCaptain('c');
    assert.deepEqual(Array.from(ctx.editIds), ['c', 'a', 'b']);
    assert.equal(ctx.fieldSyncs, 1);
    assert.match(logs.join('\n'), /就任 配隊1 隊長/);
}

// ---- 畫面接線：明確操作取代雙擊，舊入口與死樣式一起消失 ----
for (const dead of ['tapTwice', 'tapArm', 'fm-dismiss', 'buildRoster', 'rosterCard', 'bindRosterFilters', 'clearRosterFilters', 'roster-filterbar', 'fm-roster-card', 'char-field-tag']) {
    assert.equal(html.includes(dead), false, `index.html 不能再有 ${dead}`);
}
assert.match(html, /onclick="event\.stopPropagation\(\);squadLeave\('\$\{id\}'\)"/, '卡片與槽位的卸下鈕都走 squadLeave');
assert.match(html, /onclick="event\.stopPropagation\(\);openSquadReplace\('\$\{id\}'\)"/, '滿隊時卡片改出替換鈕');
assert.match(html, /onclick="event\.stopPropagation\(\);squadJoin\('\$\{id\}'\)"/, '未滿隊時卡片是選取鈕');
assert.match(html, /onclick="event\.stopPropagation\(\);setCaptain\('\$\{id\}'\)"/, '點隊長鈕不會誤觸開詳情');
assert.match(html, /onclick="replaceSquadMember\(\$\{i\},'\$\{squadReplaceFor\}'\)"/, '替換列逐位點名下場');
assert.match(html, /onclick="cancelSquadReplace\(\)"/, '替換列有取消');
assert.equal((html.match(/onclick="openGrowth\('\$\{id\}'\)"/g) || []).length, 2, '角色卡與場上槽位都單點開詳情');
assert.equal((html.match(/onkeydown="if\(event\.target===this&&\(event\.key==='Enter'\|\|event\.key===' '\)\)/g) || []).length, 2,
    '鍵盤開啟詳情只認卡片本身，不會被內層按鈕冒泡觸發');
assert.match(html, /<b class="char-role \$\{roleCls\}">\$\{role\}<\/b>/, '卡片標示隊長／隊員／出戰中');
assert.match(html, /const role = slot === 0 \? "隊長" : slot > 0 \? "隊員" : teamIds\.indexOf\(id\) >= 0 \? "出戰中" : "";/);
assert.match(html, /class="fm-lead-toggle" onclick="toggleSquadLead\(\)" aria-expanded="\$\{squadLeadOpen\}"/, '隊伍特性是可展開的標題列');
assert.match(html, /\$\{squadLeadOpen \? `<p>\$\{leadNote\}<\/p>` : ""\}/, '收合時完整說明不渲染');
assert.match(html, /<div id="team" class="cm-formation"><div class="panel fm-panel"><div id="team-slots"><\/div><\/div><\/div>/,
    '編成區塊掛在角色管理頁裡，沿用同一套 #team 樣式');
assert.match(html, /class="char-directory-head" id="owned-roster"/, '空槽捲動目標仍在同一頁');
assert.match(html, /if \(homeTabOn === "chars" && !growthFor\) buildSlots\(\);/, '每次重繪角色管理頁都要重建槽位');
assert.match(html, /if \(rosterSig !== rSig\) \{ rosterSig = rSig; buildCharGrid\(\); \}/, '即時數值更新改餵名冊卡片');
assert.match(fs.readFileSync(path.join(root, 'asset/game-data.js'), 'utf8'), /chars: "角色管理"/, '分頁名稱改成角色管理');
assert.match(html, /pickHomeTab\('chars'\)/, '主頁快捷選單指向角色管理');
assert.match(html, /pickHomeTab\('book'\)/, '圖鑑保留獨立入口');

const css = ['asset/team-formation.css', 'asset/pixel-rpg-ui.css', 'asset/ui-metal-theme.css', 'asset/ui-dark-mode.css', 'asset/pixel-buttons.css', 'asset/character-growth.css']
    .map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
for (const dead of ['.rcard', '.fm-roster', '.roster-filter', '.roster-grid', '.tm-go', '.char-field-tag', '.fm-member-actions']) {
    assert.equal(css.includes(dead), false, `死樣式 ${dead} 要清掉`);
}
assert.match(css, /#app-frame #team \.fm-slot-empty \{[^}]*touch-action: manipulation/, '空槽關掉雙拍縮放手勢');
assert.match(css, /#app-frame #team \.fm-slot-actions button \{[^}]*min-height: 28px/, '槽內按鈕至少 28px 高');
assert.match(css, /#team \.fm-replace-picks button \{[^}]*min-height: 34px/, '替換列按鈕至少 34px 高');
assert.match(css, /\.fm-lead-toggle \{[^}]*min-height: 34px/, '隊伍特性標題列至少 34px 高');
assert.match(css, /#app-frame #pg-body \.char-act \{[^}]*min-height:28px/, '卡片編隊鈕至少 28px 高');
assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/, '手機直立名冊改三欄，按鈕才有寬度');
assert.match(css, /\.growth-info-row/, '詳情頁技能說明有樣式接住');
assert.match(fs.readFileSync(path.join(root, 'asset/ui-router.js'), 'utf8'), /if \(tab === 'home'\) \{ show\(tab\); return; \}/, '路由不再把 team 當分頁');
assert.match(fs.readFileSync(path.join(root, 'asset/character-growth.js'), 'utf8'), /返回角色管理/, '詳情頁返回鍵回到角色管理');
new Function(src);
console.log('PASS: 選取／替換／卸下單點生效、滿隊改開替換列、非法替換當取消、合擊搭檔跟著退場、非實戰隊不碰戰場、翻隊與實戰切換收替換狀態、空槽單點捲名冊、隊伍特性預設收合、隊長鈕獨立、舊雙擊與名冊死樣式全清、按鈕尺寸與三欄版面到位。');