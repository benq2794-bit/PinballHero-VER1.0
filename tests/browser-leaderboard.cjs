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
 await page.evaluate("cloudUser=null;$('login-screen').hidden=true;openHomeLeaderboard('tower')");
 assert.equal(await page.evaluate("document.querySelector('.lb-mode-select select').value"),'tower');
 for(const width of [320,390,1280]){await page.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});for(const dark of [false,true]){await page.evaluate("document.documentElement.classList.toggle('ui-dark-mode',"+dark+")");await delay(100);const result=await page.evaluate("(()=>{const root=document.querySelector('.lbv'),r=root.getBoundingClientRect();return {fits:root.scrollWidth<=root.clientWidth+1,select:document.querySelector('.lb-mode-select select').value,cta:document.querySelector('.lb-cta').getBoundingClientRect().width,badImages:[...root.querySelectorAll('img')].filter(i=>!i.complete||!i.naturalWidth).length,ink:getComputedStyle(document.querySelector('.lb-pod .who')).color};})()");assert.equal(result.fits,true,JSON.stringify({width,dark,result}));assert.equal(result.badImages,0);assert.ok(result.cta>100);}}
 await page.evaluate("document.documentElement.classList.remove('ui-dark-mode');document.querySelector('.lb-mode-select select').value='rogue';document.querySelector('.lb-mode-select select').dispatchEvent(new Event('change',{bubbles:true}))");assert.equal(await page.evaluate('towerLbMode'),'tower');assert.equal(await page.evaluate("document.querySelectorAll('.lb-tabs button')[1].disabled"),false);
 await page.evaluate("pickHomeTab('menu');pickHomeTab('leaderboard')");assert.equal(await page.evaluate('towerLbMode'),'tower');await page.evaluate("setTowerLbScope('life')");assert.equal(await page.evaluate("document.querySelectorAll('.lb-tabs button')[1].getAttribute('aria-pressed')"),'true');await page.evaluate("document.querySelector('.lb-cta').click()");assert.equal(await page.evaluate("$('tower-mode-picker').open || !teamIds.length"),true);await page.evaluate("$('tower-mode-picker').close();openHomeLeaderboard('rogue');document.querySelector('.lb-cta').click()");assert.equal(await page.evaluate("$('tower-mode-picker')?.open || !teamIds.length"),true);
 await page.evaluate("document.querySelector('dialog[open]')?.close();openHomeLeaderboard('tower');setTowerLbScope('week')");await page.send('Emulation.setDeviceMetricsOverride',{width:430,height:900,deviceScaleFactor:1,mobile:true});await delay(150);fs.mkdirSync(path.join(root,'tmp'),{recursive:true});const shot=await page.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(root,'tmp/leaderboard-preview.png'),Buffer.from(shot.data,'base64'));assert.deepEqual(page.errors,[]);
 console.log('PASS: leaderboard source startup, 320/390/1280 layouts in both themes, existing artwork, mode dropdown, menu default, period tabs and challenge actions');
 }finally{if(page)page.socket.close();proc.kill();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
