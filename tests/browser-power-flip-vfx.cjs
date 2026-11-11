const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');

const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pinballhero-pf-vfx-'));
const root = path.resolve(__dirname, '..');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

class CDP {
    constructor(socket) {
        this.socket = socket;
        this.id = 0;
        this.pending = new Map();
        this.errors = [];
        socket.onmessage = event => {
            const data = JSON.parse(event.data);
            if (data.method === 'Runtime.exceptionThrown') this.errors.push(data.params.exceptionDetails);
            if (!data.id) return;
            const pending = this.pending.get(data.id);
            if (!pending) return;
            this.pending.delete(data.id);
            clearTimeout(pending.timer);
            if (data.error) pending.reject(Error(JSON.stringify(data.error)));
            else pending.resolve(data.result);
        };
    }
    send(method, params = {}) {
        const id = ++this.id;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => { this.pending.delete(id); reject(Error(`CDP timeout: ${method}`)); }, 10000);
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
    const server = http.createServer((req, res) => {
        const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        const file = path.resolve(root, `.${name === '/' ? '/index.html' : name}`);
        if (!file.startsWith(root + path.sep) || !(name === '/' || name.startsWith('/asset/')) || !fs.existsSync(file)) {
            res.statusCode = 404; res.end(); return;
        }
        res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' :
            file.endsWith('.png') ? 'image/png' : file.endsWith('.html') ? 'text/html' : 'application/octet-stream');
        fs.createReadStream(file).pipe(res);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const proc = spawn(chrome, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-gpu',
        '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
    let page;
    try {
        const portFile = path.join(profile, 'DevToolsActivePort');
        for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await delay(100);
        assert.ok(fs.existsSync(portFile), 'headless Chrome starts');
        const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
        const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        const socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
        await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
        page = new CDP(socket);
        await page.send('Runtime.enable');
        await page.send('Page.enable');
        await page.send('Network.enable');
        await page.send('Network.setBlockedURLs', { urls: ['https://*'] });
        await page.send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });
        for (let i = 0; i < 100; i++) {
            if (await page.evaluate("typeof PowerFlipVFX !== 'undefined' && typeof PF !== 'undefined'")) break;
            await delay(100);
        }
        assert.equal(await page.evaluate("typeof PowerFlipVFX !== 'undefined' && typeof PF !== 'undefined'"), true, 'game loads with the PF renderer');
        await page.evaluate("$('login-screen').hidden=true;tutorialSeen=true;ensurePlayableAccount();enterBattle();setPaused(true);window.__pfCalls=[];const __realShowPowerFlipVFX=showPowerFlipVFX;showPowerFlipVFX=(...args)=>{const rendered=__realShowPowerFlipVFX(...args);window.__pfCalls.push({args,rendered});return rendered};");
        for (let i = 0; i < 50; i++) {
            if (await page.evaluate("$('pf').getBoundingClientRect().width>0")) break;
            await delay(50);
        }
        assert.deepEqual(page.errors, []);
        for (const width of [320, 390]) {
            await page.send('Emulation.setDeviceMetricsOverride', { width, height: 850, deviceScaleFactor: 1, mobile: true });
            const bounds = await page.evaluate("(()=>{const p=$('pf'),a=p.getBoundingClientRect(),b=$('pf-vfx').getBoundingClientRect(),s=getComputedStyle(p);return {field:[a.width,a.height],inner:[a.width-parseFloat(s.borderLeftWidth)-parseFloat(s.borderRightWidth),a.height-parseFloat(s.borderTopWidth)-parseFloat(s.borderBottomWidth)],layer:[b.width,b.height]}})()");
            assert.ok(bounds.field[0] > 0 && bounds.field[1] > 0, `portrait battlefield renders at ${width}px`);
            assert.ok(Math.abs(bounds.inner[0] - bounds.layer[0]) < 1 && Math.abs(bounds.inner[1] - bounds.layer[1]) < 1,
                `FX overlay matches battlefield at ${width}px: ${JSON.stringify(bounds)}`);
            await page.evaluate("setSkillFxOpacity(40)");
            const result = await page.evaluate(`(async()=>{const types=['knight','fighter','ranger','special','supporter'],thresholds=[9,15,39];let rendered=0;for(const type of types)for(let index=0;index<3;index++){const level=index+1,id=CHAR_IDS.find(x=>CHAR_TABLE[x]?.type===type);if(!id)throw Error('missing character type '+type);roster[id].unlocked=true;teamIds=[id];syncTeamField();resetBattleTransient();spawnEnemy();spawnFoe();const target=PF.foe;if(!target)throw Error(type+' missing battle target');enemy.hp=enemy.maxHp=999999;target.hp=target.maxHp=999999;PF.ready=true;setPaused(false);const member=PF.members.find(x=>x.ch.id===id),body=member.body;body.x=target.x;body.y=target.y;body.vy=-200;combo=thresholds[index];POWER_FLIP.lockMs=0;window.__pfCalls=[];launchPowerFlip(body);if(!body.powerFlip)throw Error(type+' PF'+level+' launch failed');if(type==='fighter'||type==='special')powerFlipContact(member,target);else updatePowerFlip(16);const delay=type==='fighter'?520:240;await new Promise(r=>setTimeout(r,delay));setPaused(true);const call=window.__pfCalls[0];if(!call||call.args[0]!==type||call.args[4]!==level||call.rendered!==true)throw Error(type+' PF'+level+' combat did not call the integrated renderer');const c=document.querySelector('#pf-vfx canvas.power-flip-preview-fx');if(!c||!c.isConnected||!c.style.filter.includes('opacity(0.4)'))throw Error(type+' PF'+level+' missing opacity-managed canvas');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let pixels=0;for(let i=3;i<d.length;i+=4)if(d[i])pixels++;if(!pixels)throw Error(type+' PF'+level+' rendered a blank frame');rendered++;PowerFlipVFX.clear()}return rendered})()`);
            assert.equal(result, 15, 'all class-level animations render in the live canvas layer');
            await page.evaluate('setSkillFxOpacity(100)');
        }
        assert.deepEqual(page.errors, []);
        console.log('PASS: all 15 live FX render without script errors at 320px and 390px portrait widths, with the existing skill opacity filter applied.');
    } finally {
        if (page) page.socket.close();
        proc.kill();
        await new Promise(resolve => server.close(resolve));
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
