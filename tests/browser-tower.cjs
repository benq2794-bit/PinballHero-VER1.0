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

(async()=>{
 const http=require('node:http');let current=1;
 const base=fs.readFileSync(path.resolve(__dirname,'../dist/index.html'),'utf8');
 const manifest=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../dist/version.json'),'utf8'));
 const release=n=>({...manifest,id:'browser-release-'+n,version:'browser-v'+n,channel:'production',builtAt:'2026-11-0'+(6+n)+'T00:00:00Z'});
 const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');res.setHeader('Cache-Control','no-store');if(url.pathname==='/version.json'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(release(current)));return;}if(url.pathname==='/'){res.setHeader('Content-Type','text/html');let html=base.replace(/GAME_RELEASE=\{[^}]+\}/,'GAME_RELEASE='+JSON.stringify(release(current)));if(!html.includes('browser-release-')){res.statusCode=500;res.end('manifest replacement failed');return;}res.end(html);return;}const file=path.resolve(__dirname,'..','dist','.'+url.pathname);if(!file.startsWith(path.resolve(__dirname,'..','dist')+path.sep)||!fs.existsSync(file)){res.statusCode=404;res.end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream');fs.createReadStream(file).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const proc=spawn(chrome,['--headless=new','--no-first-run','--no-default-browser-check','--disable-gpu','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});let page;
 try{const portFile=path.join(profile,'DevToolsActivePort');for(let i=0;i<100&&!fs.existsSync(portFile);i++)await delay(100);const port=fs.readFileSync(portFile,'utf8').split('\n')[0];const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();const socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});page=new CDP(socket);await page.send('Runtime.enable');await page.send('Page.enable');await page.send('Network.enable');await page.send('Network.setBlockedURLs',{urls:['https://*']});await page.send('Page.addScriptToEvaluateOnNewDocument',{source:'window.__offset=0;window.__realNow=Date.now.bind(Date);Date.now=()=>window.__realNow()+window.__offset;'});await page.send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'});
 async function ready(){for(let i=0;i<100;i++){if(await page.evaluate("typeof gameUpdater !== 'undefined' && !!gameUpdater"))return;await delay(100);}throw Error('updater startup failed: '+JSON.stringify({errors:page.errors,info:await page.evaluate("({title:document.title,text:document.body.innerText.slice(0,160),release:typeof GAME_RELEASE,updater:typeof gameUpdater,dev:typeof DEV_MODE, scripts:document.scripts.length})")}));}
 await ready();assert.deepEqual(page.errors,[]);
 await page.evaluate("cloudUser=null;cloudSaveReady=false;$('login-screen').hidden=true;accountCreated=true;accountName='UpdateTest';tutorialSeen=true;ensurePlayableAccount();showScreen('home');setPaused(true);");
 const wipe = await page.evaluate("(()=>{enterBattle();setPaused(true);const floor=stage;PF.members.forEach(m=>{m.ch.hp=0;downMember(m)});return {floor,stage,running:PF.running,paused:PF.paused,hidden:!$('pf-over').classList.contains('on'),hp:PF.members.map(m=>m.ch.hp),expected:PF.members.map(m=>Math.max(1,Math.round(hpMax(m.ch)*.5))),alive:PF.members.every(m=>!m.down&&!!m.body),floorWins,seconds:deepTimeLeft};})()");assert.equal(wipe.hidden,true);assert.equal(wipe.stage,wipe.floor);assert.equal(wipe.running,true);assert.equal(wipe.paused,false);assert.equal(wipe.alive,true);assert.deepEqual(wipe.hp,wipe.expected);assert.equal(wipe.floorWins,0);assert.equal(wipe.seconds,60);await page.evaluate("setPaused(true);showScreen('home')");console.log('PASS: real tower combat full wipe recreates live balls at 50% HP with no defeat window');
const loop = await page.evaluate("(()=>{setPaused(true);towerAutoLoop=false;toggleTowerAutoLoop();towerStartFloor=11;deepTimeLeft=0;showDeepFail();const automatic={floor:stage,blocked:$('deep-fail').classList.contains('on'),running:PF.running};toggleTowerAutoLoop();deepTimeLeft=0;showDeepFail();const manual={blocked:$('deep-fail').classList.contains('on'),paused:PF.paused};$('deep-fail').classList.remove('on');toggleTowerAutoLoop();setPaused(true);showScreen('home');return {automatic,manual,saved:localStorage.getItem(TOWER_AUTO_LOOP_KEY)};})()");assert.equal(loop.automatic.floor,11);assert.equal(loop.automatic.blocked,false);assert.equal(loop.automatic.running,true);assert.equal(loop.manual.blocked,true);assert.equal(loop.manual.paused,true);assert.equal(loop.saved,'true');console.log('PASS: real auto timeout loops without modal; manual timeout preserved and preference saved');

await delay(200);current=2;await page.evaluate('gameUpdater.check()');assert.equal(await page.evaluate('gameUpdater.state().seconds'),30);assert.equal(await page.evaluate("$('game-update-notice').hidden"),false);
 for(const width of [390,1280]){await page.send('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:width<500});assert.equal(await page.evaluate("(()=>{const r=$('game-update-notice').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight})()"),true,'notice fits viewport');}
 await page.evaluate("showScreen('battle');window.__offset=31000;gameUpdater.tick()");await delay(100);assert.equal(await page.evaluate('GAME_RELEASE.id'),'browser-release-1','battle defers update');
 await page.evaluate("showScreen('home');window.__saveOriginal=saveGame;saveGame=()=>false;gameUpdater.tick()");await delay(100);assert.match(await page.evaluate('gameUpdater.state().error'),/本機存檔失敗/);assert.equal(await page.evaluate('GAME_RELEASE.id'),'browser-release-1');
 await page.evaluate('saveGame=window.__saveOriginal;window.__before=gold;gameUpdater.update(true)');await delay(600);await ready();assert.equal(await page.evaluate('GAME_RELEASE.id'),'browser-release-2');assert.equal(await page.evaluate('towerAutoLoop'),true,'preference restored after reload');assert.equal(await page.evaluate('!!localStorage.getItem(SAVE_KEY)'),true,'save survives reload');
 await page.evaluate("$('login-screen').hidden=true;showScreen('home');gameUpdater.tick()");assert.equal(await page.evaluate("!!$('release-notes-dialog')?.open"),true,'notes after update');await page.evaluate("$('release-notes-dialog').close()");await page.send('Page.reload');await delay(600);await ready();await page.evaluate("$('login-screen').hidden=true;showScreen('home');gameUpdater.tick()");assert.equal(await page.evaluate("!!$('release-notes-dialog')?.open"),false,'notes not repeated');assert.deepEqual(page.errors,[]);
 console.log('PASS: production build browser startup, mobile/desktop bounds, actual notification, battle deferral, failed-save stop, real page reload, retained save and once-only notes');
 }finally{if(page)page.socket.close();proc.kill();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
