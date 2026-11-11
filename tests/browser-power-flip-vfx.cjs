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
        res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' :
            file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.png') ? 'image/png' : file.endsWith('.html') ? 'text/html' : 'application/octet-stream');
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
        await page.evaluate(`(() => {
            setPaused(true);
            PowerFlipVFX.clear();
            window.__clock = performance.now() + 10000;
            Object.defineProperty(performance, 'now', { configurable:true, value:() => __clock });
            const frames = new Map(); let frameId = 0;
            window.requestAnimationFrame = fn => { frames.set(++frameId, fn); return frameId; };
            window.cancelAnimationFrame = id => frames.delete(id);
            window.__pfEvents = [];
            const realRenderer = PowerFlipVFX, realDamage = applyDamage;
            window.PowerFlipVFX = { ...realRenderer, impact(...args) {
                __pfEvents.push({ kind:'impact', at:__clock, type:args[0], level:args[3], x:args[1], y:args[2], wall:!!args[4]?.wall });
                return realRenderer.impact(...args);
            }};
            applyDamage = (source, damage, options) => {
                const dealt = realDamage(source, damage, options);
                if (dealt > 0) __pfEvents.push({ kind:'damage', at:__clock, dealt, pf:!!options.pfState, hits:options.pfState?.hits });
                return dealt;
            };
            for (const kind of ['bloom','sparks','sprite','shake']) {
                const real = FX[kind];
                FX[kind] = (...args) => { __pfEvents.push({ kind, at:__clock }); return real.apply(FX, args); };
            }
            window.__pfDraw = () => {
                const callbacks = [...frames.values()]; frames.clear();
                for (const callback of callbacks) if (callback.name === 'frame') callback(__clock);
            };
            window.__pfTick = (ms, paused = false) => {
                __clock += ms; PF.paused = paused;
                if (!paused) updatePowerFlip(ms);
                __pfDraw(); render(); PF.paused = true;
            };
            window.__pfPixels = () => {
                const canvas = PF.vfx.querySelector('canvas.power-flip-preview-fx');
                if (!canvas) return 0;
                const data = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
                let pixels = 0; for (let i=3;i<data.length;i+=4) if (data[i]) pixels++;
                return pixels;
            };
            window.__pfPrepare = (type, level, critical = false) => {
                __clock += 10000;
                const id = CHAR_IDS.find(id => CHAR_TABLE[id].type === type);
                roster[id].unlocked = true; teamIds = [id]; syncTeamField();
                resetBattleTransient(); spawnEnemy(); spawnFoe();
                for (const unit of PF.extraFoes) unit.node.remove();
                PF.extraFoes = []; PF.enemyUnits = [PF.foe];
                enemy.boss = false; enemy.hp = enemy.maxHp = 1000000000;
                const target = PF.foe; target.hp = target.maxHp = 1000000000;
                target.x = 210; target.y = 280;
                PF.running = PF.ready = true;
                for (const key of Object.keys(TYPE_TALENT_TREES)) typeTalentRanks[key] = {};
                rollCrit = () => critical;
                const member = PF.members[0], body = member.body;
                body.x = 210; body.y = type === 'ranger' ? 500 : 340; body.vx = 0; body.vy = -200;
                combo = [9,15,39][level-1]; POWER_FLIP.lockMs = 0;
                __pfEvents = []; __pfCalls = [];
                PF.paused = false; launchPowerFlip(body);
                window.__pfState = body.powerFlip;
                if (!__pfState) throw Error(type + ' launch failed');
                if (type === 'fighter' || type === 'special') powerFlipContact(member, target);
                updatePowerFlip(1); __pfDraw(); render(); updateUI(); PF.paused = true;
            };
        })()`);
        const screenshotDir = process.env.PF_SCREENSHOT_DIR && path.resolve(process.env.PF_SCREENSHOT_DIR);
        if (screenshotDir) fs.mkdirSync(screenshotDir, { recursive:true });
        for (const width of [390, 1280]) {
            await page.send('Emulation.setDeviceMetricsOverride', { width, height:850, deviceScaleFactor:1, mobile:width < 500 });
            for (const type of ['knight','fighter','ranger','special','supporter']) for (const level of [1,2,3]) {
                const label = `${type} PF${level} ${width}px`;
                await page.evaluate(`__pfPrepare('${type}',${level});__pfTick(16)`);
                const early = await page.evaluate(`({ events:__pfEvents, pixels:__pfPixels(), calls:__pfCalls.map(c=>({ type:c.args[0],level:c.args[4],rendered:c.rendered })) })`);
                assert.ok(early.pixels > 0, label + ' visible on the first frame, not hundreds of ms later');
                assert.deepEqual(early.calls, [{ type, level, rendered:true }], label + ' one integrated animation');
                const earlyHits = early.events.filter(e => e.kind === 'damage');
                const earlyImpacts = early.events.filter(e => e.kind === 'impact');
                assert.equal(earlyHits.length, type === 'supporter' ? 0 : 1, label + ' immediate damage count: ' + JSON.stringify(early.events));
                assert.equal(earlyImpacts.length, earlyHits.length, label + ' one visual per actual hit');
                for (let i=0;i<earlyHits.length;i++) assert.equal(earlyHits[i].at, earlyImpacts[i].at, label + ' hit and visual have identical timestamps');
                if (type === 'fighter') await page.evaluate(`__pfTick(69);${Array.from({length:level},()=> '__pfTick(85);').join('')}`);
                else if (type === 'knight') await page.evaluate('for(let i=0;i<22;i++)__pfTick(16)');
                else if (type === 'supporter') await page.evaluate('for(let i=0;i<27;i++)__pfTick(16)');
                else await page.evaluate('__pfTick(48)');
                if (screenshotDir) {
                    const bounds = await page.evaluate("(()=>{const r=$('pf').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1}})()");
                    const shot = await page.send('Page.captureScreenshot', { format:'png', clip:bounds, captureBeyondViewport:true });
                    fs.writeFileSync(path.join(screenshotDir, `${width}-${type}-${level}.png`), Buffer.from(shot.data,'base64'));
                }
                await page.evaluate('for(let i=0;i<125;i++)__pfTick(16)');
                const result = await page.evaluate('({events:__pfEvents, stateCleared:PF.members[0].body.powerFlip===null})');
                const hits = result.events.filter(e => e.kind === 'damage');
                const impacts = result.events.filter(e => e.kind === 'impact');
                const count = type === 'supporter' ? 0 : ['fighter','knight'].includes(type) ? 2 + level : 1;
                assert.equal(hits.length, count, label + ' unchanged attack count');
                assert.equal(impacts.length, count, label + ' no invented extra finisher');
                assert.ok(result.stateCleared, label + ' charge completes');
                assert.equal(result.events.filter(e => ['bloom','sparks','sprite'].includes(e.kind)).length, 0, label + ' no legacy PF overlays');
                for (let i=0;i<hits.length;i++) assert.equal(hits[i].at, impacts[i].at, label + ' damage/visual synchronization');
                if (type === 'fighter') for (let i=1;i<hits.length;i++) assert.equal(hits[i].at-hits[i-1].at, 85, label + ' actual 85ms combo spacing');
                await page.evaluate('for(let i=0;i<190;i++)__pfTick(16)');
                assert.equal(await page.evaluate('PowerFlipVFX.activeCount()'), 0, label + ' naturally expires');
                assert.equal(await page.evaluate("PF.vfx.querySelectorAll('canvas.power-flip-preview-fx').length"), 0, label + ' removes only its canvas');
            }
        }
        await page.evaluate("__pfPrepare('fighter',3,true);for(let i=0;i<5;i++)__pfTick(85)");
        const critical = await page.evaluate('__pfEvents');
        assert.equal(critical.filter(e=>e.kind==='damage').length, 5, 'critical fighter retains five hits');
        assert.equal(critical.filter(e=>e.kind==='impact').length, 5, 'critical PF has dedicated impacts');
        assert.equal(critical.filter(e=>['bloom','sparks','sprite'].includes(e.kind)).length, 0, 'critical PF does not layer the generic critical burst');
        assert.equal(critical.filter(e=>e.kind==='shake').length, 2, 'first hit and real finisher receive emphasis');
        await page.evaluate("__pfPrepare('ranger',1);__pfTick(16);__pfTick(5000,true)");
        assert.ok(await page.evaluate('__pfPixels()>0 && PowerFlipVFX.activeCount()>0'), 'pause retains the current PF frame');
        await page.evaluate('__pfTick(500)');
        assert.equal(await page.evaluate('PowerFlipVFX.activeCount()'), 0, 'resume expires PF on active time only');
        await page.evaluate("__pfPrepare('knight',3);powerFlipWallContact(PF.members[0].body,12,340);PF.foeSeq++;__pfTick(16)");
        assert.equal(await page.evaluate('PowerFlipVFX.activeCount()'), 0, 'wave changes clear both effects and wall impacts');
        for (const critical of [false,true]) {
            await page.evaluate(`__pfPrepare('supporter',1);PowerFlipVFX.clear();__pfEvents=[];PF.foe._pfBurstReadyAt=0;PF.foe._critBurstReadyAt=0;applyDamage(PF.members[0].ch,10,{target:PF.foe,pf:true,critical:${critical},finalDamage:true})`);
            const passive = await page.evaluate('__pfEvents');
            assert.equal(passive.filter(e=>e.kind==='impact').length, 0, 'passive-classified damage does not enter PF renderer');
            assert.equal(passive.filter(e=>e.kind==='bloom').length, critical ? 2 : 1, 'passive shock keeps its original feedback');
            assert.equal(passive.filter(e=>e.kind==='sparks').length, critical ? 2 : 1, 'passive shock keeps its original particles');
        }
        await page.evaluate("__pfEvents=[];applyDamage(PF.members[0].ch,10,{target:PF.foe,finalDamage:true})");
        assert.equal(await page.evaluate("__pfEvents.filter(e=>e.kind==='sprite').length"), 1, 'ordinary hits retain their original sprite');
        assert.deepEqual(page.errors, []);
        console.log('PASS: 15 live PF variants at 320/390px; desktop/mobile first-frame hits, real combo counts/timing, no legacy overlap, critical finisher, pause/resume, expiry, wave cleanup and unchanged passive/ordinary feedback.');
    } finally {
        if (page) page.socket.close();
        proc.kill();
        await new Promise(resolve => server.close(resolve));
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
