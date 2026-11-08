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


 await page.evaluate("cloudUser=null;$('login-screen').hidden=true;tutorialSeen=true;ensurePlayableAccount();resetBattleTransient();stage=1;floorWins=0;deepTimeLeft=NORMAL_FLOOR_SECONDS;spawnEnemy();spawnFoe();setPaused(true);showTowerModePicker()");assert.equal(await page.evaluate("$('tower-mode-picker').open"),true,'not started: picker');await page.evaluate("towerStartFloor=1;startTowerRun();setPaused(true)");assert.equal(await page.evaluate('towerRunActive'),true);
 await page.evaluate(String.raw`window.__defeatTowerWave=()=>{
 setPaused(false);for(const unit of PF.enemyUnits||[])unit.hp=0;enemy.hp=0;if(PF.foe)PF.foe.hp=0;
 const seq=PF.foeSeq,wasBoss=enemy.boss,from=stage;
 const first=killFoe();const snapshot=JSON.stringify({kills,stage,gold,shardTotal,rankExp,cultivationMaterials,highGradeExperienceCrystals,claims:passClaimedFree,towerMaterials,roster});
 const again=killFoe();const unchanged=snapshot===JSON.stringify({kills,stage,gold,shardTotal,rankExp,cultivationMaterials,highGradeExperienceCrystals,claims:passClaimedFree,towerMaterials,roster});
 battleLifecycle.advance(PF_CLIMB_SWAP_MS+500);setPaused(true);
 return {first,again,unchanged,from,stage,wasBoss,seqDelta:PF.foeSeq-seq,route:uiRouter.current()};
};`);
 let waves=0;while(await page.evaluate('stage')<10){if(waves++>35)throw Error('tower progression stuck');const result=await page.evaluate('__defeatTowerWave()');assert.equal(result.first,true);assert.equal(result.again,false);assert.equal(result.unchanged,true,'no duplicate rewards');assert.equal(result.seqDelta,1,'exactly one next enemy');if(result.stage>=2)await page.evaluate("showScreen('home')");}
 assert.equal(await page.evaluate('enemy.boss'),true);assert.equal(await page.evaluate("$('pf-frame').offsetWidth"),0);await page.evaluate('setPaused(false)');let released=false;for(let i=0;i<65;i++){if(!await page.evaluate('bossEntranceFreezesBattle()')){released=true;break;}await delay(100);}assert.equal(released,true,'hidden floor 10 introduction must release');await delay(1100);assert.equal(await page.evaluate('deepTimeLeft<BOSS_FLOOR_SECONDS'),true,'floor timer advances at home');await page.evaluate('setPaused(true)');
 const boss=await page.evaluate('__defeatTowerWave()');assert.equal(boss.from,10);assert.equal(boss.wasBoss,true);assert.equal(boss.stage,11);assert.equal(boss.again,false);assert.equal(boss.unchanged,true);assert.equal(boss.seqDelta,1);
 await page.evaluate("pickHomeTab('menu')");for(let i=0;i<3;i++){const r=await page.evaluate('__defeatTowerWave()');assert.equal(r.again,false);assert.equal(r.unchanged,true);assert.equal(r.seqDelta,1);}assert.equal(await page.evaluate('stage'),12);
 const resume=await page.evaluate("(()=>{const seq=PF.foeSeq,floor=stage,life=PF.members.map(m=>m.ch.hp).join();showTowerModePicker();showTowerModePicker();startTowerRun();return {route:uiRouter.current(),picker:$('tower-mode-picker').open,same:PF.foeSeq===seq&&stage===floor&&PF.members.map(m=>m.ch.hp).join()===life}})()");assert.equal(resume.route,'battle');assert.equal(resume.picker,false);assert.equal(resume.same,true,'return never resets or respawns');
 const timeout=await page.evaluate("(()=>{setPaused(true);showScreen('home');towerAutoLoop=true;towerStartFloor=1;deepTimeLeft=0;const seq=PF.foeSeq,before=shardTotal;showDeepFail();setPaused(true);return {stage,blocked:$('deep-fail').classList.contains('on'),seqDelta:PF.foeSeq-seq,sameReward:before===shardTotal}})()");assert.equal(timeout.stage,2);assert.equal(timeout.blocked,false);assert.equal(timeout.seqDelta,1);assert.equal(timeout.sameReward,true);
 const wipe=await page.evaluate("(()=>{const seq=PF.foeSeq;PF.members.forEach(m=>{m.ch.hp=0;downMember(m)});setPaused(true);return {floor:stage,seqDelta:PF.foeSeq-seq,hp:PF.members.map(m=>m.ch.hp),expected:PF.members.map(m=>Math.max(1,Math.round(hpMax(m.ch)*.5))),blocked:$('pf-over').classList.contains('on')}})()");assert.equal(wipe.floor,1);assert.equal(wipe.seqDelta,1);assert.deepEqual(wipe.hp,wipe.expected);assert.equal(wipe.blocked,false);
 await page.evaluate("towerAutoLoop=false;deepTimeLeft=0;showDeepFail();showScreen('home');showTowerModePicker()");assert.equal(await page.evaluate("uiRouter.current()==='battle'&&$('deep-fail').classList.contains('on')&&!$('tower-mode-picker').open"),true,'manual failure still resumes its existing panel');await page.evaluate('leaveDeepToHome();showTowerModePicker()');assert.equal(await page.evaluate("!towerRunActive&&$('tower-mode-picker').open"),true,'explicit end permits choosing a new floor');assert.deepEqual(page.errors,[]);

 await page.evaluate("$('tower-mode-picker').close();setPaused(true);towerBestStage=100;paintTowerModePicker();selectTowerStartFloor(85);changeTowerAdvanced('fallback',10);changeTowerAdvanced('threshold',3);changeTowerAdvanced('stable',true);if(!towerAutoLoop)toggleTowerAutoLoop();startTowerRun();setPaused(true);showScreen('home')");assert.equal(await page.evaluate('stage'),85);
 for(let attempt=1;attempt<=3;attempt++){
   const failure=await page.evaluate("(()=>{deepTimeLeft=0;const seq=PF.foeSeq;showDeepFail();showDeepFail();setPaused(true);return {stage,count:towerFailureState.count,seqDelta:PF.foeSeq-seq,blocked:$('deep-fail').classList.contains('on')}})()");assert.equal(failure.stage,75);assert.equal(failure.count,attempt);assert.equal(failure.seqDelta,1,'repeated stale timeout ignored');assert.equal(failure.blocked,false);
   if(attempt<3){let n=0;while(await page.evaluate('stage')<85){if(n++>35)throw Error('fallback return stuck');const r=await page.evaluate('__defeatTowerWave()');assert.equal(r.first,true);assert.equal(r.again,false);assert.equal(r.unchanged,true);assert.equal(r.seqDelta,1);}assert.equal(await page.evaluate('stage'),85);}
 }
 assert.equal(await page.evaluate('towerStableActive()&&towerFailureState.min===75&&towerFailureState.max===84'),true);
 let loops=0,farmWaves=0;while(loops<2){if(farmWaves++>65)throw Error('stable loop stuck');const r=await page.evaluate('__defeatTowerWave()');assert.ok(r.stage>=75&&r.stage<=84);assert.equal(r.again,false);assert.equal(r.unchanged,true);assert.equal(r.seqDelta,1);if(r.from===84&&r.stage===75)loops++;}
 assert.equal(await page.evaluate('towerBestStage'),100,'record never decreases while farming');
 await page.evaluate("setPaused(false);togglePause();$('pp-tower-stable').click()");assert.equal(await page.evaluate('towerStableEnabled'),false);assert.equal(await page.evaluate('towerStableActive()'),false);let advance=0;while(await page.evaluate('stage')<85){if(advance++>35)throw Error('resume climbing stuck');const r=await page.evaluate('__defeatTowerWave()');assert.equal(r.seqDelta,1);}assert.equal(await page.evaluate('stage'),85);
 const noRepeat=await page.evaluate("(()=>{let bonuses=0;const toast=hmToast;hmToast=text=>{if(text.includes('首度抵達波利塔第 10 層'))bonuses++;toast(text)};resetBattleTransient();stage=9;floorWins=2;spawnEnemy();spawnFoe();setPaused(true);const result=__defeatTowerWave();hmToast=toast;return {bonuses,stage,highest:towerBestStage,result}})()");assert.equal(noRepeat.stage,10);assert.equal(noRepeat.bonuses,0,'one-time floor-10 bonus not paid again');assert.equal(noRepeat.highest,100);
 await page.evaluate("setPaused(true);leaveDeepToHome();showTowerModePicker();$('tower-start-floor').value=9999;$('tower-start-floor').dispatchEvent(new Event('change'));$('tower-fallback').value='20';$('tower-fallback').dispatchEvent(new Event('change'));$('tower-threshold').value='5';$('tower-threshold').dispatchEvent(new Event('change'));$('tower-stable-enabled').checked=false;$('tower-stable-enabled').dispatchEvent(new Event('change'));if(!towerAutoLoop)toggleTowerAutoLoop()");assert.equal(await page.evaluate('towerStartFloor'),100);await page.evaluate("$('tower-start-floor').value=85;$('tower-start-floor').dispatchEvent(new Event('change'))");
 const persisted=await page.evaluate("(()=>{const p=JSON.parse(localStorage.getItem(SAVE_KEY));return [p.towerStartFloor,p.towerAutoLoop,p.towerFallbackFloors,p.towerStableThreshold,p.towerStableEnabled]})()");assert.deepEqual(persisted,[85,true,20,5,false]);
 for(const width of [320,390]){await page.send('Emulation.setDeviceMetricsOverride',{width,height:800,deviceScaleFactor:1,mobile:true});assert.equal(await page.evaluate("(()=>{const n=$('tower-mode-picker');return n.scrollWidth<=n.clientWidth+1&&n.getBoundingClientRect().right<=innerWidth})()"),true);}
 await page.send('Page.reload');await delay(500);for(let i=0;i<100;i++){if(await page.evaluate("typeof uiRouter !== 'undefined'"))break;await delay(50);}assert.deepEqual(await page.evaluate('[towerStartFloor,towerAutoLoop,towerFallbackFloors,towerStableThreshold,towerStableEnabled]'),[85,true,20,5,false]);await page.evaluate("$('login-screen').hidden=true;showTowerModePicker()");assert.equal(await page.evaluate("$('tower-start-floor').value"),'85');assert.equal(await page.evaluate("$('tower-mode-floors').children.length<=4"),true);assert.deepEqual(page.errors,[]);
 const preview=await page.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(root,'tmp/tower-settings-preview.png'),Buffer.from(preview.data,'base64'));
 console.log('PASS: real 85→75 failures three times, two 75–84 reward loops, no duplicate rewards/enemies/first bonus, pause-menu stable off, resume to 85, bounded input, mobile dialog and account-snapshot reload');
 console.log('PASS: actual 1→10→11→12 settlement, hidden BOSS intro/timer, home/menu combat, resume without respawn, duplicate reward guard, timeout loop, 50% wipe and manual exit');

 }finally{if(page)page.socket.close();proc.kill();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
