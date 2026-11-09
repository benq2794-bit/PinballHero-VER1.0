const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pinballhero-display-settings-'));
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
    const root = path.resolve(__dirname, '..');
    const http = require('node:http');
    const server = http.createServer((req, res) => {
        const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
        if (!file.startsWith(root + path.sep) || !(name === '/' || name.startsWith('/asset/')) || !fs.existsSync(file)) {
            res.statusCode = 404; res.end(); return;
        }
        res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.svg') ? 'image/svg+xml' : 'text/html');
        fs.createReadStream(file).pipe(res);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const proc = spawn(chrome, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-gpu',
        '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
    let page;
    try {
        const portFile = path.join(profile, 'DevToolsActivePort');
        for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await delay(100);
        const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
        const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
        const socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
        await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
        page = new CDP(socket);
        await page.send('Runtime.enable'); await page.send('Page.enable'); await page.send('Network.enable');
        await page.send('Network.setBlockedURLs', { urls: ['https://*'] });
        await page.send('Page.navigate', { url: 'http://127.0.0.1:' + server.address().port + '/' });
        for (let i = 0; i < 100; i++) {
            if (await page.evaluate("typeof uiRouter !== 'undefined'")) break;
            await delay(100);
        }
        assert.deepEqual(page.errors, []);
        await page.evaluate("cloudUser=null;$('login-screen').hidden=true;tutorialSeen=true;ensurePlayableAccount();setPaused(true);pickHomeTab('menu');openSettingsCategory('display')");
        assert.deepEqual(await page.evaluate('[GAME_OPTIONS.damageNumbers,GAME_OPTIONS.skillFxOpacity,document.querySelector("#menu-skill-fx-opacity").value]'), [true, 100, '100']);
        assert.ok(await page.evaluate('document.querySelector("#menu-damage-numbers-btn")&&document.querySelector("#menu-skill-fx-opacity")&&document.querySelector("#menu-restore-visual-defaults")'));

        for (const width of [360, 1280]) {
            const mobile = width < 500;
            await page.send('Emulation.setDeviceMetricsOverride', { width, height: 800, deviceScaleFactor: 1, mobile });
            await page.send('Emulation.setTouchEmulationEnabled', { enabled: mobile });
            await delay(100);
            const layout = await page.evaluate("(()=>{const s=document.querySelector('#menu-skill-fx-opacity').getBoundingClientRect();return {doc:document.documentElement.scrollWidth,width:innerWidth,left:s.left,right:s.right}})()");
            assert.ok(layout.doc <= layout.width && layout.left >= 0 && layout.right <= layout.width, 'display slider fits viewport ' + JSON.stringify(layout));
        }

        await page.evaluate("toggleDamageNumbers();setSkillFxOpacity(55)");
        const effects = await page.evaluate(`(() => {
            const field=document.querySelector('#pf');
            const make=(className,parent)=>{const n=document.createElement(className.includes('canvas')||className.includes('cine')||className.includes('signature')?'canvas':'div');n.className=className;parent.appendChild(n);applySkillFxOpacity(n);return getComputedStyle(n).filter};
            const dealt=document.createElement('div');dealt.className='dmg-pop enemy-damage';field.appendChild(dealt);
            const hurt=document.createElement('div');hurt.className='dmg-pop hurt';field.appendChild(hurt);
            const other=document.createElement('div');other.className='dmg-pop';field.appendChild(other);
            const filters=[
                make('active-skill-mark active-skill-slash',PF.vfx),
                make('spell-sigil',PF.field),
                make('skill-cine',PF.vfx),
                make('expedition-signature',PF.vfx),
                make('skill-fx-canvas',PF.vfx)
            ];
            return {filters,damage:[getComputedStyle(dealt).display,getComputedStyle(hurt).display,getComputedStyle(other).display],
                damageHidden:field.classList.contains('hide-damage-numbers'),saved:[localStorage.getItem('wf_damage_numbers'),localStorage.getItem('wf_skill_fx_opacity')],
                actorFilter:getComputedStyle(document.querySelector('.ball')||other).filter};
        })()`);
        assert.ok(effects.filters.every(filter => filter.includes('opacity(0.55)')), 'all skill effect types use the selected opacity');
        assert.ok(effects.filters[1].includes('drop-shadow'), 'existing CSS glow filter is preserved');
        assert.deepEqual(effects.damage, ['none', 'none', 'block'], 'only outgoing and received damage popups are hidden');
        assert.equal(effects.damageHidden, true);
        assert.deepEqual(effects.saved, ['false', '55']);
        assert.ok(!effects.actorFilter.includes('opacity(0.55)'), 'character layer does not inherit skill opacity');
        await page.send('Page.reload', { ignoreCache: true });
        for (let i = 0; i < 100; i++) {
            if (await page.evaluate("typeof uiRouter !== 'undefined'")) break;
            await delay(100);
        }
        assert.deepEqual(await page.evaluate('[GAME_OPTIONS.damageNumbers,GAME_OPTIONS.skillFxOpacity]'), [false, 55], 'settings persist after reload');
        await page.evaluate("pickHomeTab('menu');openSettingsCategory('display');setSkillFxOpacity(30);document.querySelector('#menu-restore-visual-defaults').click()");
        assert.deepEqual(await page.evaluate('[GAME_OPTIONS.damageNumbers,GAME_OPTIONS.skillFxOpacity,localStorage.getItem("wf_damage_numbers"),localStorage.getItem("wf_skill_fx_opacity")]'), [true, 100, 'true', '100'], 'restore defaults resets and persists both options');
        assert.deepEqual(page.errors, []);
        console.log('PASS: display settings defaults, toggle/slider persistence, live opacity for CSS and canvas skill FX only, damage-popup filtering, restore defaults and mobile/desktop layout.');
    } finally {
        if (page) page.socket.close();
        proc.kill();
        await new Promise(resolve => server.close(resolve));
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
