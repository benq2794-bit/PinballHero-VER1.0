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


 await page.evaluate("cloudUser=null;$('login-screen').hidden=true;tutorialSeen=true;ensurePlayableAccount();setPaused(true);showSpecialDungeonPicker('material')");
 assert.equal(await page.evaluate("document.querySelectorAll('.material-sweep').length"),6);
 assert.equal(await page.evaluate("[...document.querySelectorAll('.material-sweep')].every(b=>b.disabled&&b.textContent==='未解鎖')"),true);
 await page.evaluate("specialDungeonClears['gold-easy']=true;specialDungeonRuns['gold-easy']=0;saveGame();paintSpecialDungeonPicker();window.__gold=gold;window.__stamina=stamina");
 const result=await page.evaluate("Promise.all([sweepMaterialDungeon('gold-easy'),sweepMaterialDungeon('gold-easy')])");assert.deepEqual(result,[true,false]);
 assert.equal(await page.evaluate("specialDungeonRuns['gold-easy']"),3);assert.equal(await page.evaluate('gold>__gold&&stamina===__stamina'),true);
 const total=await page.evaluate('gold');await page.evaluate("sweepMaterialDungeon('gold-easy')");assert.equal(await page.evaluate('gold'),total);
 await page.evaluate("$('material-sweep-result').close();specialDungeonClears['exp-easy']=true;specialDungeonRuns['exp-easy']=1;window.__save=saveGame;window.__exp=cultivationMaterials;saveGame=()=>false");
 assert.equal(await page.evaluate("sweepMaterialDungeon('exp-easy')"),false);assert.equal(await page.evaluate("cultivationMaterials===__exp&&specialDungeonRuns['exp-easy']===1"),true);
 await page.evaluate("saveGame=__save;saveGame()");
 for(const width of [320,390,1280]){await page.send('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:width<500});assert.equal(await page.evaluate("$('special-dungeon-picker').scrollWidth<=$('special-dungeon-picker').clientWidth+1"),true,'picker fits '+width);}
 await page.evaluate("$('special-dungeon-picker').close();showSpecialDungeonPicker('event')");assert.equal(await page.evaluate("!!$('special-dungeon-picker').querySelector('.rogue-mode-card')"),true);assert.equal(await page.evaluate("!!$('home').querySelector('[onclick*=rogue]')"),false);
 await page.evaluate("$('special-dungeon-picker').close();FX.clearPops();FX.pop(100,130,'100','enemy-damage');FX.pop(150,140,'50','hurt');FX.updatePops(.45)");
 assert.equal(await page.evaluate("FX.pops[0].node.style.transform.replaceAll(' ','').includes('35px,-50px')"),true);assert.equal(await page.evaluate("FX.pops[1].node.style.transform.replaceAll(' ','').includes('-35px,-50px')"),true);await page.evaluate('FX.updatePops(.21)');assert.equal(await page.evaluate('FX.pops.length'),0);
 await page.evaluate("FX.pop(100,100,'999','enemy-damage critical');FX.updatePops(.1)");assert.equal(await page.evaluate('FX.pops[0].life'),.8);assert.equal(await page.evaluate("FX.pops[0].node.style.transform.includes('scale(1.3)')"),true);
 await page.evaluate("FX.clearPops();openSpecialDungeon('gold-normal')");
 for(let i=0;i<100;i++){if(await page.evaluate("(()=>{try{return $('gate-frame').contentWindow.eval('typeof PF!==\"undefined\"&&!!PF.el')}catch(_){return false}})()"))break;await delay(80);}
 const child=expr=>page.evaluate("$('gate-frame').contentWindow.eval("+JSON.stringify(expr)+")");
 await child('setPaused(true)');
 await child("window.parent.postMessage({type:'wf-dungeon-result',dungeon:'gold-normal',clear:false},GATE_TARGET)");await delay(40);assert.equal(await page.evaluate("specialDungeonClears['gold-normal']===true"),false,'failed run cannot unlock sweep');
 for(let wave=1;wave<=4;wave++){await child("window.parent.postMessage({type:'wf-dungeon-wave-clear',dungeon:'gold-normal',wave:"+wave+",mobCount:4},GATE_TARGET)");await delay(20);}
 await child('DUNGEON_WAVE=5;specialDungeonWaveVictory()');await delay(150);
 assert.equal(await page.evaluate("specialDungeonClears['gold-normal']"),true,'validated successful run unlocks only its difficulty');
 const paid=await page.evaluate('gold');await child("window.parent.postMessage({type:'wf-dungeon-result',dungeon:'gold-normal',clear:true},GATE_TARGET)");await delay(50);assert.equal(await page.evaluate('gold'),paid,'duplicate result rejected');
 for(const width of [320,390,1280]){await page.send('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:width<500});await delay(60);const size=await child("(()=>{const box=document.querySelector('.rs-box'),imgs=[...box.querySelectorAll('img')];return {fits:box.scrollWidth<=box.clientWidth+1,icons:imgs.every(i=>i.getBoundingClientRect().width<=24&&i.getBoundingClientRect().height<=24)}})()");assert.equal(size.fits,true);assert.equal(size.icons,true);}
 await page.evaluate('closeGateBattle()');await page.send('Page.reload');await delay(600);assert.equal(await page.evaluate("specialDungeonClears['gold-easy']"),true);assert.equal(await page.evaluate("specialDungeonRuns['gold-easy']"),3);
 await page.evaluate("$('login-screen').hidden=true;pickHomeTab('home')");await page.send('Emulation.setDeviceMetricsOverride',{width:390,height:850,deviceScaleFactor:1,mobile:true});await delay(100);fs.mkdirSync(path.join(root,'tmp'),{recursive:true});const shot=await page.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(root,'tmp/material-home-preview.png'),Buffer.from(shot.data,'base64'));
 assert.deepEqual(page.errors,[]);console.log('PASS: six sweep states, exact shared counters, duplicate lock, failed-save rollback, mobile picker/results, combo relocation, directional damage and saved unlocks');
 }finally{if(page)page.socket.close();proc.kill();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
