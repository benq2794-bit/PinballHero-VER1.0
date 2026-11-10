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
 const server=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)||!(name==='/'||name.startsWith('/asset/'))||!fs.existsSync(file)){res.statusCode=404;res.end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.html')?'text/html':'application/octet-stream');if(file.endsWith('index.html'))res.end(fs.readFileSync(file,'utf8').replace('// ===== 啟動 =====',"window.__bootTrace=[];for(const name of ['spawnEnemy','spawnFoe','applyStageBg']){const original=window[name];window[name]=function(...args){const result=original.apply(this,args);window.__bootTrace.push({fn:name,route:GATE_MODE,gate:GATE.id,dungeon:DUNGEON_MODE,enemy:enemy.name,bg:args[1]||null});return result;};}\n"+'// ===== 啟動 ====='));else fs.createReadStream(file).pipe(res)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const proc=spawn(chrome,['--headless=new','--no-first-run','--no-default-browser-check','--disable-gpu','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});let page;
 try{const portFile=path.join(profile,'DevToolsActivePort');for(let i=0;i<100&&!fs.existsSync(portFile);i++)await delay(100);const port=fs.readFileSync(portFile,'utf8').split('\n')[0];const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();const socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});page=new CDP(socket);await page.send('Runtime.enable');await page.send('Page.enable');await page.send('Network.enable');await page.send('Network.setBlockedURLs',{urls:['https://*']});await page.send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'});
 for(let i=0;i<100;i++){if(await page.evaluate("typeof uiRouter !== 'undefined'"))break;await delay(100);}assert.deepEqual(page.errors,[]);


 await page.evaluate("cloudUser=null;$('login-screen').hidden=true;tutorialSeen=true;ensurePlayableAccount();setPaused(true);pickHomeTab('shop');summonHistory=[];summonTicketSingle=2;summonTicketTen=1;window.__summonId=currentWeeklySummonIds()[0];roster[__summonId].unlocked=false;teamIds=CHAR_IDS.filter(id=>roster[id].unlocked).slice(0,3);window.__roll=rollSummonPrize;rollSummonPrize=()=>({kind:'character',id:__summonId})");
 await page.evaluate("document.querySelector('.sumfull-enter').click()");assert.equal(await page.evaluate('summonFocusedView'),true);
 await page.evaluate("document.querySelector('.sumfull-ops [onclick=\"openSummonHistory()\"]').click()");assert.equal(await page.evaluate("document.querySelector('.summon-history-empty')!==null"),true);assert.equal(await page.evaluate("document.querySelector('.sumfull-info .summon-info-tabs')===null"),true,'history-only drawer has no tabs');await page.evaluate("document.querySelector('.sumfull-info .summon-info-close').click()");assert.equal(await page.evaluate('summonInfoDrawer'),false);
 await page.evaluate('performSummon(1)');assert.equal(await page.evaluate('summonHistory[0].prizes.length'),1);assert.equal(await page.evaluate('summonHistory[0].prizes[0].rarity'),5);assert.equal(await page.evaluate("summonHistory[0].prizes[0].note.includes('新角色')"),true);
 await page.evaluate('closeSummonPopup();performSummon(10)');assert.equal(await page.evaluate('summonHistory[0].prizes.length'),10);assert.equal(await page.evaluate("summonHistory[0].prizes.every(p=>p.rarity===5&&p.characterName===CHAR_TABLE[__summonId].name&&p.note.includes('已持有'))"),true);assert.equal(await page.evaluate('summonTicketTen'),0);await page.evaluate("closeSummonPopup();openSummonHistory()");assert.equal(await page.evaluate("document.querySelectorAll('.summon-history-row').length"),2);assert.equal(await page.evaluate("document.querySelector('.summon-history-list').textContent.includes('5★')"),true);assert.equal(await page.evaluate("document.querySelector('.summon-history-row time').textContent.length>0"),true);
 for(const width of [320,390,1280]){await page.send('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:width<500});assert.equal(await page.evaluate("document.querySelector('.gacha-shop').scrollWidth<=document.querySelector('.gacha-shop').clientWidth+1"),true);}
 await page.evaluate("toggleSummonInfoDrawer();openSummonFocused();document.querySelector('.sumfull-ops [onclick=\"openSummonHistory()\"]').click()");assert.equal(await page.evaluate('summonInfoDrawer&&summonInfoTab==="history"'),true);for(const width of [320,390]){await page.send('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:true});assert.equal(await page.evaluate("document.querySelector('.sumfull-page').scrollWidth<=document.querySelector('.sumfull-page').clientWidth+1"),true,'focused history fits');}
 await page.evaluate("document.querySelector('.sumfull-info .summon-info-close').click();closeSummonFocused();rollSummonPrize=__roll;pickHomeTab('home');stamina=120;saveGame()");
 // Inspect the actual standalone initialization calls, not a fixed-delay screenshot.
 const child=expr=>page.evaluate("$('gate-frame').contentWindow.eval("+JSON.stringify(expr)+")");
 async function waitChild(){for(let i=0;i<140;i++){if(await page.evaluate("(()=>{try{return $('gate-frame').contentWindow.eval('typeof PF!==\"undefined\"&&PF.ready')}catch(_){return false}})()"))return;await delay(40);}throw Error('child not ready');}
 for(const entry of ["enterBossGate('fire')","openGateBattle(BOSS_STAGES.find(g=>g.id==='water'),true)","openSpecialDungeon('gold-easy')","openSpecialDungeon('exp-easy')","openSpecialDungeon('lab-madness')","openExpedition('normal')"]){
 await page.evaluate(entry);await waitChild();if(entry.includes('openExpedition')){for(let i=0;i<100;i++){if(await child('!!expedition'))break;await delay(40);}}
 await child('setPaused(true)');const trace=await child('window.__bootTrace');assert.ok(trace.length>0,entry);assert.equal(trace.some(t=>t.fn==='spawnFoe'&&!t.gate),false,'no tower foe before target '+entry);assert.equal(trace.some(t=>t.fn==='applyStageBg'&&!t.bg),false,'no generic tower background '+entry);assert.equal(await child("document.documentElement.classList.contains('ui-booting')"),false,'target initialized '+entry);assert.ok(await child('PF.foe!==null'),entry);
 if(!entry.includes('openExpedition'))assert.equal(trace.filter(t=>t.fn==='spawnFoe').length,1,'one initial enemy group '+entry);
 await page.evaluate('closeGateBattle()');assert.equal(await page.evaluate('gateBattleOpen'),false);
 }
 await page.evaluate("pickHomeTab('home');towerStartFloor=1;startTowerRun();setPaused(true)");assert.equal(await page.evaluate('towerRunActive'),true);assert.equal(await page.evaluate('gateOn()'),false);
 // Actual passive trigger paths plus deduplication and clean teardown.
 // 被動改手動解鎖鍵＋隊伍裡要有對應型態角色，探針逐條換隊長滿足門檻。
 await page.evaluate("window.__passiveTeamFor=type=>{const id=CHAR_IDS.find(cid=>CHAR_TABLE[cid].type===type);roster[id].unlocked=true;teamIds=[id];};for(const type of Object.keys(TYPE_TALENT_TREES)){typeTalentRanks[type]=Object.fromEntries(typeTalentLaneNodes(type).map(n=>[n.id,5]));typeTalentRanks[type]['passive_'+type]=1;}resetBattleTransient();enemy.hp=enemy.maxHp=999999;PF.foe.hp=PF.foe.maxHp=999999;PF.running=true;PF.ready=true;__passiveTeamFor('knight');setPaused(false);window.__body=PF.members[0].body;__body.vy=-200;POWER_FLIP.lockMs=0;combo=15;launchPowerFlip(__body);setPaused(true)");
 assert.equal(await page.evaluate("!!document.querySelector('.passive-wind-gif')"),true);assert.equal(await page.evaluate("document.querySelector('.passive-wind-gif').style.getPropertyValue('--sx')"),'2.250');
 await page.evaluate("showPassiveFX('wind',__body.x,__body.y,{follow:__body,ms:1500});showPassiveFX('wind',__body.x,__body.y,{follow:__body,ms:1500})");assert.equal(await page.evaluate("document.querySelectorAll('.passive-wind-gif').length"),1);
 await page.evaluate("__passiveTeamFor('ranger');POWER_FLIP.lockMs=0;__body.vy=-200;combo=15;setPaused(false);launchPowerFlip(__body);setPaused(true)");assert.equal(await page.evaluate("!!document.querySelector('.passive-gif-pierce')"),true,'ranger real launch trigger');await page.evaluate('clearRangerPierce(PF.members[0])');assert.equal(await page.evaluate("document.querySelectorAll('.passive-gif-pierce').length"),0);
 await page.evaluate("__passiveTeamFor('fighter');roster[teamIds[0]]._fighterShockReadyAt=0;triggerFighterShockwave(roster[teamIds[0]],PF.foe)");assert.equal(await page.evaluate("!!document.querySelector('.passive-gif-shock')"),true);
 await page.evaluate("__passiveTeamFor('special');enemy.boss=true;startWeakCast();hitWeak(PF.weak.nodes[0],PF.members[0])");assert.equal(await page.evaluate("!!document.querySelector('.passive-gif-slow')"),true);
 await page.evaluate("__passiveTeamFor('supporter');feverStart()");assert.equal(await page.evaluate("FX.sprites.filter(n=>n._passiveKey==='supporter').length"),1);await page.evaluate('feverEnd()');assert.equal(await page.evaluate("FX.sprites.filter(n=>n._passiveKey==='supporter').length"),0);
 await page.evaluate('resetBattleTransient()');assert.equal(await page.evaluate("document.querySelectorAll('.passive-effect').length"),0);assert.equal(await page.evaluate("FX.sprites.length"),0);
 assert.deepEqual(page.errors,[]);console.log('PASS: single/ten history metadata and entry/close, mobile layouts, boss/training/material/special/event clean initialization/return, tower retained, five passive paths with team gate, 2.25x scale, deduplication and cleanup');
 }finally{if(page)page.socket.close();proc.kill();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
