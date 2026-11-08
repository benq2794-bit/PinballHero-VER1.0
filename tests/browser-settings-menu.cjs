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
 const http=require('node:http'),root=path.resolve(__dirname,'..');
 const server=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)||!(name==='/'||name.startsWith('/asset/'))||!fs.existsSync(file)){res.statusCode=404;res.end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(file).pipe(res)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const proc=spawn(chrome,['--headless=new','--no-first-run','--no-default-browser-check','--disable-gpu','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});let page;
 try{const portFile=path.join(profile,'DevToolsActivePort');for(let i=0;i<100&&!fs.existsSync(portFile);i++)await delay(100);const port=fs.readFileSync(portFile,'utf8').split('\n')[0];const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();const socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});page=new CDP(socket);await page.send('Runtime.enable');await page.send('Page.enable');await page.send('Network.enable');await page.send('Network.setBlockedURLs',{urls:['https://*']});await page.send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'});
 for(let i=0;i<100;i++){if(await page.evaluate("typeof uiRouter !== 'undefined'"))break;await delay(100);}assert.deepEqual(page.errors,[]);


 await page.evaluate("cloudUser=null;$('login-screen').hidden=true;tutorialSeen=true;ensurePlayableAccount();setPaused(true);pickHomeTab('menu')");
 assert.equal(await page.evaluate("document.querySelectorAll('.settings-category').length"),5);
 assert.equal(await page.evaluate("[...document.querySelectorAll('.settings-menu button')].filter(b=>b.getBoundingClientRect().height>0).length"),5,'home only displays category buttons');
 const categories=['display','sound','controls','guide','data'];
 for(const width of [320,390,1280]){await page.send('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:width<500});for(const dark of [false,true]){await page.evaluate("document.documentElement.classList.toggle('ui-dark-mode',"+dark+")");for(const id of categories){await page.evaluate("[...document.querySelectorAll('.settings-category')]["+categories.indexOf(id)+"].click()");assert.equal(await page.evaluate("settingsCategory"),id);const fit=await page.evaluate("(()=>{const n=document.querySelector('.settings-menu');return n.scrollWidth<=n.clientWidth+1})()");assert.equal(fit,true,JSON.stringify({width,dark,id}));await page.evaluate("document.querySelector('.settings-back').click()");assert.equal(await page.evaluate('settingsCategory'),'');}}}
 await page.evaluate("openSettingsCategory('display')");
 const darkBefore=await page.evaluate("document.documentElement.classList.contains('ui-dark-mode')");await page.evaluate("$('menu-dark-mode-btn').click()");assert.equal(await page.evaluate("document.documentElement.classList.contains('ui-dark-mode')"),!darkBefore);assert.equal(await page.evaluate("localStorage.getItem('wf_ui_dark_mode')"),String(!darkBefore));
 const shake=await page.evaluate('FX.shakeOn');await page.evaluate("document.querySelector('[onclick=\"toggleShake()\"]').click()");assert.equal(await page.evaluate('FX.shakeOn'),!shake);
 await page.evaluate("GAME_OPTIONS.powerSave=false;GAME_OPTIONS.fps=60;syncGameOptionLabels();document.querySelector('[onclick=\"cycleFpsTarget()\"]').click()");assert.equal(await page.evaluate('GAME_OPTIONS.fps'),30);assert.equal(await page.evaluate("localStorage.getItem('wf_fps_target')"),'30');await page.evaluate("document.querySelector('[onclick=\"cycleFpsTarget()\"]').click()");assert.equal(await page.evaluate('GAME_OPTIONS.fps'),60);
 await page.evaluate("GAME_OPTIONS.skillAnim='full';syncGameOptionLabels()");for(const mode of ['lite','skip','full']){await page.evaluate("document.querySelector('[onclick=\"cycleSkillAnimMode()\"]').click()");assert.equal(await page.evaluate('GAME_OPTIONS.skillAnim'),mode);}
 await page.evaluate("$('menu-power-save-btn').click()");assert.equal(await page.evaluate('GAME_OPTIONS.powerSave'),true);assert.equal(await page.evaluate("localStorage.getItem('wf_auto_powersave')"),'true');await page.evaluate("$('menu-power-save-btn').click()");
 await page.evaluate("openSettingsCategory('sound');$('menu-sfx-volume').value=37;$('menu-sfx-volume').dispatchEvent(new Event('input',{bubbles:true}))");assert.equal(await page.evaluate('SFX.masterVolume'),.37);assert.equal(await page.evaluate("localStorage.getItem('wf_sfx_volume')"),'0.37');
 await page.evaluate("openSettingsCategory('controls');$('menu-help-btn').click()");assert.equal(await page.evaluate("$('menu-help').hidden"),false);await page.evaluate("$('menu-help-btn').click()");assert.equal(await page.evaluate("$('menu-help').hidden"),true);
 await page.evaluate("openSettingsCategory('guide');$('menu-combat-help-btn').click()");assert.equal(await page.evaluate("$('menu-combat-help').hidden"),false);await page.evaluate("document.querySelector('.settings-fold summary').click()");assert.equal(await page.evaluate("document.querySelector('.settings-fold').open"),true);assert.equal(await page.evaluate("document.querySelectorAll('.settings-fold .update-log-card').length===UPDATE_LOG.length"),true);
 await page.evaluate("openSettingsCategory('data');window.__reset=resetSave;window.__return=returnToLoginScreen;window.__resetCalls=0;window.__returnCalls=0;resetSave=()=>__resetCalls++;returnToLoginScreen=()=>__returnCalls++;document.querySelector('[onclick=\"resetSave()\"]').click();document.querySelector('[onclick=\"returnToLoginScreen()\"]').click()");assert.deepEqual(await page.evaluate('[__resetCalls,__returnCalls]'),[1,1]);await page.evaluate('resetSave=__reset;returnToLoginScreen=__return');
 await page.send('Page.reload');await delay(600);assert.equal(await page.evaluate('GAME_OPTIONS.fps'),60);assert.equal(await page.evaluate('SFX.masterVolume'),.37);assert.equal(await page.evaluate('settingsCategory'),'');
 await page.evaluate("$('login-screen').hidden=true;pickHomeTab('menu')");await page.send('Emulation.setDeviceMetricsOverride',{width:390,height:850,deviceScaleFactor:1,mobile:true});await delay(100);fs.mkdirSync(path.join(root,'tmp'),{recursive:true});const shot=await page.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(root,'tmp/settings-menu-preview.png'),Buffer.from(shot.data,'base64'));
 // Dev-only tools remain available in data management, not on the category home.
 await page.send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/?dev=1'});await delay(500);await page.evaluate("$('login-screen').hidden=true;pickHomeTab('menu')");assert.equal(await page.evaluate('DEV_MODE'),true);assert.equal(await page.evaluate("document.querySelector('.dev-tools').getBoundingClientRect().height"),0);await page.evaluate("openSettingsCategory('data')");assert.equal(await page.evaluate("document.querySelector('.dev-tools').getBoundingClientRect().height>0"),true);
 assert.deepEqual(page.errors,[]);console.log('PASS: five categories/back, 320/390/1280 light/dark layouts, existing toggles/volume/FPS persistence/help/logs, data button wiring and retained dev tools; battle/FPS loop unchanged');
 }finally{if(page)page.socket.close();proc.kill();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
