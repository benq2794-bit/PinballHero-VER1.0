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


 await page.evaluate("cloudUser=null;$('login-screen').hidden=true;tutorialSeen=true;ensurePlayableAccount();setPaused(true);stamina=45;CHAR_IDS.filter(id=>CHAR_TABLE[id].rarity===4&&CHAR_TABLE[id].element==='fire'&&!roster[id].unlocked).forEach(id=>roster[id].shards=9);window.__towerSeq=PF.foeSeq;window.__teamBefore=teamIds.join();window.__ownedBefore=CHAR_IDS.filter(id=>roster[id].unlocked).length;Math.random=()=>.1;openGateBattle(BOSS_STAGES.find(g=>g.id==='fire'))");assert.equal(await page.evaluate('stamina'),30);assert.equal(await page.evaluate('JSON.parse(localStorage.getItem(SAVE_KEY)).stamina'),30);
 async function childReady(){for(let i=0;i<100;i++){if(await page.evaluate("(()=>{try{return $('gate-frame').contentWindow.eval('typeof PF!==\"undefined\"&&PF.ready')}catch{return false}})()"))return;await delay(100)}throw Error('gate child startup')}
 async function child(code){return page.evaluate("$('gate-frame').contentWindow.eval("+JSON.stringify(code)+")")}
 async function rewardAck(){for(let i=0;i<100;i++){if(await child('gateRewardSaved'))return;await delay(30)}throw Error('reward acknowledgement missing '+JSON.stringify({errors:page.errors,state:await child('JSON.stringify({bossWin,last:gateLastResult,saved:gateRewardSaved,paused:PF.paused,hp:enemy.hp})')}))}
 async function win(){return child("setPaused(true);enemy.hp=0;for(const u of PF.enemyUnits)u.hp=0;killFoe();setPaused(false);battleLifecycle.advance(600);true")}
 await childReady();await win();await rewardAck();assert.equal(await page.evaluate('bossWin.fire'),1);assert.equal(await page.evaluate('CHAR_IDS.filter(id=>roster[id].unlocked).length'),await page.evaluate('__ownedBefore+1'));assert.equal(await page.evaluate('teamIds.join()===__teamBefore&&PF.foeSeq===__towerSeq'),true,'unlock cannot rebuild paused tower or auto-join');assert.equal(await child("$('gate-retry-button').textContent.includes('15')"),true);
 const firstSeq=await child('PF.foeSeq');await child('gateRetry();gateRetry()');for(let i=0;i<50&&await child('PF.foeSeq')===firstSeq;i++)await delay(30);assert.equal(await child('PF.foeSeq'),firstSeq+1);assert.equal(await page.evaluate('stamina'),15,'double click pays only once');assert.equal(await page.evaluate('JSON.parse(localStorage.getItem(SAVE_KEY)).stamina'),15);
 await win();await rewardAck();assert.equal(await page.evaluate('bossWin.fire'),2);await page.evaluate('stamina=14');const seq=await child('PF.foeSeq');await child('gateRetry();gateRetry()');await delay(100);assert.equal(await page.evaluate('stamina'),14);assert.equal(await child('PF.foeSeq'),seq,'insufficient stamina cannot restart');
 await page.evaluate('stamina=30');await child('gateRetry()');for(let i=0;i<50&&await child('PF.foeSeq')===seq;i++)await delay(30);assert.equal(await page.evaluate('stamina'),15);
 await page.evaluate('window.__saveActual=saveGame;saveGame=()=>false;window.__beforeReward=shardTotal;window.__beforeFragments=JSON.stringify(CHAR_IDS.map(id=>[id,roster[id].shards,roster[id].unlocked]))');await win();await delay(100);assert.equal(await page.evaluate('bossWin.fire'),2);assert.equal(await page.evaluate('shardTotal===__beforeReward&&JSON.stringify(CHAR_IDS.map(id=>[id,roster[id].shards,roster[id].unlocked]))===__beforeFragments'),true,'failed save rolls back all rewards');assert.equal(await child("$('gate-reward-save-retry').hidden"),false);assert.equal(await child('gateRewardSaved'),false);await child('gateRetry()');await delay(50);assert.equal(await page.evaluate('stamina'),15,'unsaved reward cannot pay for next battle');await page.evaluate('saveGame=__saveActual');await child('retryGateRewardSave()');await rewardAck();assert.equal(await page.evaluate('bossWin.fire'),3);const paid=await page.evaluate('shardTotal');await child("window.parent.postMessage(gateLastResult,GATE_TARGET)");await delay(100);assert.equal(await page.evaluate('shardTotal'),paid,'duplicate result cannot reward twice');assert.equal(await page.evaluate('PF.foeSeq===__towerSeq&&teamIds.join()===__teamBefore'),true);
 await child('gateExit()');await delay(100);assert.equal(await page.evaluate('gateBattleOpen'),false);

 // 五階強化：舊勝場補回 +10 解鎖、選階進場、子頁強度與結算都沿用同一階。
 await page.evaluate("bossWin.fire=71;gateEnhance=GateEnhancement.normalize({},BOSS_STAGES.map(g=>g.id),bossWin);stamina=120;selectGateTier('fire',10)");
 assert.equal(await page.evaluate('gateEnhance.fire.unlocked'),10,'Lv.100 勝場只補解鎖，不補發首破');
 assert.deepEqual(await page.evaluate('Array.from(gateEnhance.fire.broken)'),[]);
 assert.equal(await page.evaluate('gateEnhance.fire.selected'),10);
 await page.evaluate("openGateBattle(BOSS_STAGES.find(g=>g.id==='fire'),false,20)");
 assert.equal(await page.evaluate('gateBattleOpen'),false,'未解鎖的階級進不去');
 assert.equal(await page.evaluate('stamina'),120,'擋在入口就不扣體力');
 await page.evaluate("enterBossGate('fire')");
 assert.equal(await page.evaluate('gateBattleTier'),10);
 assert.equal(await page.evaluate('stamina'),105);
 await childReady();
 assert.equal(await child('GATE.tier'),10,'開窗參數真的帶進 iframe');
 const want=JSON.parse(await page.evaluate("JSON.stringify(gateStats(BOSS_STAGES.find(g=>g.id==='fire'),10))"));
 const got=JSON.parse(await child("JSON.stringify({level:enemy.gateLevel,hp:enemy.maxHp,atk:enemy.atk})"));
 assert.deepEqual(got,{level:want.level,hp:want.hp,atk:want.atk},'子頁的王就是階級倍率算出來的最終值');
 assert.equal(await child('updateUI();$("stage-num").textContent'),'強化 +10');
 const q=await page.evaluate('betaEventActive()?2:1');
 const before=JSON.parse(await page.evaluate("JSON.stringify({shard:shardTotal,gold,stones:breakthroughStones.fourStar})"));
 await win();await rewardAck();
 const after=JSON.parse(await page.evaluate("JSON.stringify({shard:shardTotal,gold,stones:breakthroughStones.fourStar,win:bossWin.fire,enhance:gateEnhance.fire})"));
 assert.equal(after.win,72);
 assert.equal(after.gold-before.gold,1200,'+10 每場額外金幣 1,200');
 assert.ok(after.shard-before.shard>=6&&after.shard-before.shard<=8,'再戰 1～3 虹彩石＋階級首破 5，不重發首勝 50');
 assert.ok(after.stones-before.stones>=1+1&&after.stones-before.stones<=3*q+1,'基礎突破石照常加倍，階級那 1 顆不加倍');
 assert.deepEqual(after.enhance.broken,[10]);assert.equal(after.enhance.unlocked,20);
 const panel=await child("$('pf-result').textContent");
 for(const text of ['強化 +10','含階級首破 +5','已解鎖','金幣 ×1,200','含階級 +1'])assert.ok(panel.includes(text),'結算缺少 '+text);
 assert.ok(await page.evaluate("$('battle-log').textContent.includes('階級首破 +5')"));

 // 同一階再打一次：首破不再發，額外金幣照給，再戰也照扣 15。
 const seq2=await child('PF.foeSeq');await child('gateRetry();gateRetry()');
 for(let i=0;i<50&&await child('PF.foeSeq')===seq2;i++)await delay(30);
 assert.equal(await child('PF.foeSeq'),seq2+1);assert.equal(await page.evaluate('stamina'),90);
 assert.equal(await child('GATE.tier'),10,'結算再戰沿用選定的階級');
 const gold2=await page.evaluate('gold');await win();await rewardAck();
 assert.equal(await page.evaluate('gold')-gold2,1200);
 assert.equal(await page.evaluate('gateEnhance.fire.broken.join()'),'10');
 assert.equal(await page.evaluate('gateEnhance.fire.unlocked'),20);
 assert.ok(!(await child("$('pf-result').textContent")).includes('含階級首破'),'同一階首破只發一次');

 // 暫停選單的「重新開始本關」：結果面板已收掉，走 runId 請款，連點只扣一次。
 await page.evaluate('stamina=60');
 const seq3=await child('PF.foeSeq'),run3=await child('GATE.runId');
 await child("hideResult();window.confirm=()=>true;restartCurrentGate();restartCurrentGate();restartCurrentGate()");
 for(let i=0;i<50&&await child('PF.foeSeq')===seq3;i++)await delay(30);
 assert.equal(await child('PF.foeSeq'),seq3+1);
 assert.equal(await page.evaluate('stamina'),45,'暫停重開也只扣一次 15');
 assert.notEqual(await child('GATE.runId'),run3);
 assert.equal(await child('GATE.tier'),10);

 // 子頁被硬塞未解鎖的階級時，開機守衛要把它退回一般 Lv.100（先清成 about:blank，否則只換 fragment 不會重開機）。
 await page.evaluate("$('gate-frame').src='about:blank'");await delay(200);
 await page.evaluate("$('gate-frame').src=location.href.split('#')[0]+'#gate=fire&tier=50&stage='+stage+'&t='+Date.now()");
 let reloaded=false;
 for(let i=0;i<150;i++){if(await page.evaluate("(()=>{try{const w=$('gate-frame').contentWindow;return w.location.hash.includes('tier=50')&&w.eval('typeof PF!==\"undefined\"&&PF.ready')}catch{return false}})()")){reloaded=true;break;}await delay(100);}
 assert.equal(reloaded,true,'tier=50 的子頁要真的重開機');
 assert.equal(await child('GATE.tier'),0,'未解鎖的階級不允許從網址硬闖');
 assert.equal(await child('enemy.gateLevel'),100,'退回一般強度仍是 Lv.100');
 await child('gateExit()');await delay(100);

 // 重新整理：解鎖、首破紀錄與選定的階級都要留在存檔裡。
 await page.evaluate('saveGame()');
 const persisted=JSON.parse(await page.evaluate("JSON.stringify(JSON.parse(localStorage.getItem(SAVE_KEY)).gateEnhance.fire)"));
 await page.send('Page.reload');
 for(let i=0;i<150;i++){if(await page.evaluate("typeof GateEnhancement!=='undefined'&&typeof bossWin!=='undefined'"))break;await delay(100);}
 await page.evaluate("cloudUser=null;$('login-screen').hidden=true;tutorialSeen=true;setPaused(true)");
 assert.deepEqual(JSON.parse(await page.evaluate('JSON.stringify(gateEnhance.fire)')),persisted,'重新整理不掉階級進度');
 assert.equal(await page.evaluate('bossWin.fire'),73);
 assert.deepEqual(page.errors,[]);
 console.log('PASS: real iframe initial/retry stamina saves, double-click guard, insufficient stamina denial, mother-only same-element unlock without tower reset, save failure rollback/retry, duplicate receipt protection, +10 unlock from veteran wins, locked-tier entry and URL guards, tier stats/settlement/retry reuse, once-only first break, pause-restart billing and reload persistence');

 }finally{if(page)page.socket.close();proc.kill();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
