// 在獨立暫存瀏覽器資料夾中驗證本機遊戲，不讀取玩家日常使用的瀏覽器存檔。
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pinballhero-smoke-'));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
class CDP {
    constructor(socket) {
        this.socket = socket; this.id = 0; this.pending = new Map(); this.errors = [];
        socket.onmessage = event => {
            const data = JSON.parse(event.data);
            if (data.method === 'Runtime.exceptionThrown') this.errors.push(data.params.exceptionDetails);
            if (!data.id) return;
            const pending = this.pending.get(data.id);
            if (!pending) return;
            this.pending.delete(data.id); clearTimeout(pending.timer);
            if (data.error) pending.reject(Error(JSON.stringify(data.error)));
            else pending.resolve(data.result);
        };
    }
    send(method, params = {}) {
        const id = ++this.id;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => { this.pending.delete(id); reject(Error('CDP timeout: ' + method)); }, 10000);
            this.pending.set(id, { resolve, reject, timer });
            this.socket.send(JSON.stringify({ id, method, params }));
        });
    }
    async evaluate(expression) {
        const result = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
        return result.result.value;
    }
}
(async () => {
    assert.ok(fs.existsSync(chrome), 'Set CHROME_PATH to a Chrome executable');
    const process = spawn(chrome, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-gpu',
        '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
    let browser, page;
    try {
        const portFile = path.join(profile, 'DevToolsActivePort');
        for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await delay(100);
        const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
        const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
        const target = targets.find(t => t.type === 'page');
        const socket = new WebSocket(target.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
        page = new CDP(socket);
        await page.send('Runtime.enable'); await page.send('Page.enable'); await page.send('Network.enable');
        // 素材站連線不影響邏輯驗證，避免第三方網站延遲拖住啟動。
        await page.send('Network.setBlockedURLs', { urls: ['http://*', 'https://*'] });
        await page.send('Page.navigate', { url: pathToFileURL(path.resolve(__dirname, '../index.html')).href });
        let ready = false;
        for (let i = 0; i < 100; i++) {
            ready = await page.evaluate("(() => { try { return typeof uiRouter === 'object' && !!PF.el; } catch { return false; } })()");
            if (ready || page.errors.length) break;
            await delay(100);
        }
        assert.deepEqual(page.errors, [], 'startup JavaScript exceptions'); assert.equal(ready, true);
        await page.evaluate(`accountCreated = true; accountGender = 'male'; accountName = 'Smoke';
            tutorialSeen = true;
            $('account-setup').classList.remove('on'); pickStarter('doctor_pirate');
            setPaused(false); showScreen('home');`);
        const tabs = await page.evaluate("[...Object.keys(PAGES), 'home']");
        for (const tab of tabs) {
            const result = await page.evaluate(`pickHomeTab('${tab}'); ({ tab: homeTabOn, route: uiRouter.current() })`);
            assert.equal(result.tab, tab);
        }
        // 天賦頁改以攻擊型態分組後，五條車道與圖示要真的渲染出來。
        await page.evaluate("pickHomeTab('talents')");
        await delay(500);
        const talentPage = await page.evaluate(`({
            lanes: Object.keys(TYPE_TALENT_TREES).join(','),
            nodes: document.querySelectorAll('#pg-body .tt-node').length,
            passives: document.querySelectorAll('#pg-body .tt-passive-node').length,
            brokenIcons: Array.from(document.querySelectorAll('#pg-body .tt-icon')).filter(i => !i.complete || i.naturalWidth === 0).length });`);
        assert.equal(talentPage.lanes, 'knight,fighter,ranger,supporter,special');
        assert.equal(talentPage.nodes, 35, '30 顆天賦加 5 顆被動');
        assert.equal(talentPage.passives, 5);
        assert.equal(talentPage.brokenIcons, 0, '型態圖示不能掛掉');
        await page.evaluate("pickHomeTab('home')");
        assert.equal(await page.evaluate("openAccountStats(); dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' })); !$('account-stats').classList.contains('on') && uiRouter.current() === 'home'"), true);
        await page.evaluate("enterBattle(); setPaused(false); window.__smokeHits = 0; battleLifecycle.schedule(100, () => window.__smokeHits++); setPaused(true);");
        await delay(250); assert.equal(await page.evaluate('window.__smokeHits'), 0);
        await page.evaluate('setPaused(false)'); await delay(400);
        assert.equal(await page.evaluate('window.__smokeHits'), 1);
        await page.evaluate("startGateBattle(BOSS_STAGES[0]); hideBossEntrance(); PF.members[0].ch.gauge = 100; castSkill(PF.members[0]);");
        assert.equal(await page.evaluate('SKILL_CINEMATIC.active'), true);
        assert.equal(await page.evaluate('gateRetry(); !SKILL_CINEMATIC.active && !FEVER.active && POWER_FLIP.buffPct === 0'), true);
        const reward = await page.evaluate(`hideBossEntrance(); enemy.hp = 0;
            const before = shardTotal; gateVictory(); const once = shardTotal; gateVictory();
            ({ gain: once - before, duplicate: shardTotal - once, visible: $('pf-result').classList.contains('on') });`);
        assert.ok(reward.gain > 0); assert.equal(reward.duplicate, 0); assert.equal(reward.visible, true);
        assert.equal(await page.evaluate('togglePause(); PF.paused'), true, 'pause shortcut cannot resume a settled battle');
        assert.equal(await page.evaluate("backHome(); uiRouter.current() === 'home' && !GATE.id && !TRAINING_MODE"), true);
        const receipt = await page.evaluate(`
            const gate = BOSS_STAGES[1]; openGateBattle(gate);
            const oldBalance = shardTotal;
            const message = { type: 'wf-gate-result', gate: gate.id, win: (bossWin[gate.id] || 0) + 1, shards: gate.replay };
            const send = source => dispatchEvent(new MessageEvent('message', { source, origin: location.origin, data: message }));
            send(window); const forged = shardTotal - oldBalance;
            send($('gate-frame').contentWindow); const paid = shardTotal - oldBalance;
            send($('gate-frame').contentWindow); const duplicate = shardTotal - oldBalance - paid;
            closeGateBattle(); ({ forged, paid, duplicate, expected: gate.replay });`);
        assert.equal(receipt.forged, 0); assert.equal(receipt.paid, receipt.expected); assert.equal(receipt.duplicate, 0);
        await delay(300);
        assert.deepEqual(page.errors, [], 'interaction JavaScript exceptions');
        console.log('PASS: real Chrome startup, all tabs, account modal return, paused tasks, skill/restart cleanup, unique Boss rewards and gate exit.');
        const browserInfo = await (await fetch('http://127.0.0.1:' + port + '/json/version')).json();
        browser = new WebSocket(browserInfo.webSocketDebuggerUrl);
        await new Promise(resolve => { browser.onopen = resolve; });
        browser.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
    } finally {
        if (page) page.socket.close();
        if (browser) browser.close();
        process.kill();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
