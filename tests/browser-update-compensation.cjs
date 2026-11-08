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


 await page.evaluate("cloudUser=null;$('login-screen').hidden=true;tutorialSeen=true;ensurePlayableAccount();setPaused(true);updateCompensationClaims=['retired-batch'];saveGame();pickHomeTab('home')");
 assert.equal(await page.evaluate("$('hm-update-compensation').hidden"),false);
 const before=await page.evaluate('[shardTotal,gold,summonTicketSingle,cultivationMaterials,highGradeExperienceCrystals,stamina]');
 await page.evaluate('openUpdateCompensation()');assert.deepEqual(await page.evaluate('[shardTotal,gold,summonTicketSingle,cultivationMaterials,highGradeExperienceCrystals,stamina]'),before,'opening never grants rewards');
 assert.equal(await page.evaluate("document.querySelectorAll('.compensation-rewards > div').length"),5);
 for(const width of [320,390,1280]){await page.send('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:width<500});for(const dark of [false,true]){await page.evaluate("document.documentElement.classList.toggle('ui-dark-mode',"+dark+")");assert.equal(await page.evaluate("$('update-compensation-dialog').scrollWidth<=$('update-compensation-dialog').clientWidth+1"),true,'dialog fits '+width);}}
 await page.evaluate('window.__saveComp=saveGame;saveGame=()=>false');assert.equal(await page.evaluate('claimUpdateCompensation(UPDATE_COMPENSATION_BATCHES[0].id)'),false);assert.deepEqual(await page.evaluate('[shardTotal,gold,summonTicketSingle,cultivationMaterials,highGradeExperienceCrystals,stamina]'),before);
 await page.evaluate('saveGame=__saveComp');const claims=await page.evaluate('Promise.all([claimUpdateCompensation(UPDATE_COMPENSATION_BATCHES[0].id),claimUpdateCompensation(UPDATE_COMPENSATION_BATCHES[0].id)])');assert.deepEqual(claims,[true,false]);
 const after=await page.evaluate('[shardTotal,gold,summonTicketSingle,cultivationMaterials,highGradeExperienceCrystals,stamina]');assert.deepEqual(after.map((v,i)=>v-before[i]),[100,10000,1,100,10,0]);assert.equal(await page.evaluate("$('hm-update-compensation').hidden"),true);assert.equal(await page.evaluate("updateCompensationClaims.includes('retired-batch')"),true);
 await page.send('Page.reload');await delay(600);assert.equal(await page.evaluate('updateCompensationClaims.includes(UPDATE_COMPENSATION_BATCHES[0].id)'),true);await page.evaluate("cloudUser=null;$('login-screen').hidden=true;pickHomeTab('home')");assert.equal(await page.evaluate("$('hm-update-compensation').hidden"),true);assert.equal(await page.evaluate('claimUpdateCompensation(UPDATE_COMPENSATION_BATCHES[0].id)'),false);
 // Emulate an explicit developer-added future batch, without changing files or release IDs.
 await page.evaluate("window.UPDATE_COMPENSATION_BATCHES=[...UPDATE_COMPENSATION_BATCHES,{id:'browser-only-next-batch',name:'測試新批次'}];paintHome();openUpdateCompensation()");assert.equal(await page.evaluate("$('hm-update-compensation').hidden"),false);
 await page.send('Emulation.setDeviceMetricsOverride',{width:390,height:850,deviceScaleFactor:1,mobile:true});await page.evaluate("document.documentElement.classList.remove('ui-dark-mode')");await delay(80);fs.mkdirSync(path.join(root,'tmp'),{recursive:true});const shot=await page.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(root,'tmp/update-compensation-preview.png'),Buffer.from(shot.data,'base64'));
 assert.deepEqual(page.errors,[]);console.log('PASS: manual-only entry, five rewards, no stamina, real save rollback, duplicate clicks, historical receipt/reload persistence, explicit next-batch entry and 320/390/1280 light/dark layouts');
 }finally{if(page)page.socket.close();proc.kill();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
