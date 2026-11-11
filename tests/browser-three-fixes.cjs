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
 await page.evaluate("for(const type of Object.keys(TYPE_TALENT_TREES)){typeTalentRanks[type]=Object.fromEntries(typeTalentLaneNodes(type).map(n=>[n.id,5]));typeTalentRanks[type][`passive_${type}`]=1};window.__oldTeam=teamIds.slice();teamIds[0]=CHAR_IDS.find(id=>CHAR_TABLE[id].type==='knight');resetBattleTransient();enemy.hp=enemy.maxHp=999999;PF.foe.hp=PF.foe.maxHp=999999;PF.running=true;PF.ready=true;setPaused(false);window.__body=PF.members[0].body;__body.vy=-200;POWER_FLIP.lockMs=0;combo=15;launchPowerFlip(__body);setPaused(true);teamIds=__oldTeam");
 assert.equal(await page.evaluate("!!document.querySelector('.passive-wind-gif')"),true);assert.equal(await page.evaluate("document.querySelector('.passive-wind-gif').style.getPropertyValue('--sx')"),'2.025');
 await page.evaluate("showPassiveFX('wind',__body.x,__body.y,{follow:__body,ms:1500});showPassiveFX('wind',__body.x,__body.y,{follow:__body,ms:1500})");assert.equal(await page.evaluate("document.querySelectorAll('.passive-wind-gif').length"),1);
 await page.evaluate("window.__oldTeam=teamIds.slice();window.__ranger=CHAR_IDS.find(id=>CHAR_TABLE[id].type==='ranger');teamIds[0]=__ranger;roster[__ranger].unlocked=true;POWER_FLIP.lockMs=0;__body.vy=-200;combo=15;setPaused(false);launchPowerFlip(__body);setPaused(true);teamIds=__oldTeam");assert.equal(await page.evaluate("!!document.querySelector('.passive-gif-pierce')"),true,'ranger real launch trigger');await page.evaluate('clearRangerPierce(PF.members[0])');assert.equal(await page.evaluate("document.querySelectorAll('.passive-gif-pierce').length"),0);
 await page.evaluate("setSkillFxOpacity(40);roster[teamIds[0]]._fighterShockReadyAt=0;triggerFighterShockwave(roster[teamIds[0]],PF.foe);window.__shockFx=document.querySelector('.passive-gif-shock')");assert.equal(await page.evaluate("!!document.querySelector('.passive-gif-shock')"),true);
 assert.equal(await page.evaluate("__shockFx.style.filter.includes('opacity(0.4)')"),true,'passive effects honor skill FX opacity');
 await page.evaluate("window.__oldFoeX=PF.foe.x;window.__oldFoeY=PF.foe.y;PF.foe.x+=16;PF.foe.y+=12;roster[teamIds[0]]._fighterShockReadyAt=0;roster[teamIds[0]]._passiveFlashAt=0;triggerFighterShockwave(roster[teamIds[0]],PF.foe)");
 assert.equal(await page.evaluate("document.querySelector('.passive-gif-shock')===__shockFx"),true,'repeated passive GIF reuses its node');
 assert.equal(await page.evaluate("__shockFx.style.left===`${Math.round(PF.foe.x*1000)/1000}px`&&document.querySelector('.passive-hit-flash')!==null"),true,'hit feedback follows the latest impact');
 assert.equal(await page.evaluate("getComputedStyle(__shockFx).maskImage==='none'"),true,'GIF transparency comes from the asset alpha channel');
 await page.evaluate('PF.foe.x=__oldFoeX;PF.foe.y=__oldFoeY;setSkillFxOpacity(100)');
 await page.evaluate("enemy.boss=true;startWeakCast();hitWeak(PF.weak.nodes[0],PF.members[0])");assert.equal(await page.evaluate("!!document.querySelector('.passive-gif-slow')"),true);assert.equal(await page.evaluate("document.querySelector('.passive-gif-slow').style.getPropertyValue('--sx')"),'2.025');
 await page.evaluate('feverStart()');assert.equal(await page.evaluate("FX.sprites.filter(n=>n._passiveKey==='supporter').length"),1);await page.evaluate('feverEnd()');assert.equal(await page.evaluate("FX.sprites.filter(n=>n._passiveKey==='supporter').length"),0);
 await page.evaluate('resetBattleTransient()');assert.equal(await page.evaluate("document.querySelectorAll('.passive-effect').length"),0);assert.equal(await page.evaluate("FX.sprites.length"),0);
 // PF owns only its renderer: long-lived passives must survive all five types at Lv1-3.
 assert.equal(await page.evaluate(`(async()=>{
     const expect = (actual, expected, label) => {
         if (JSON.stringify(actual) !== JSON.stringify(expected))
             throw Error(label + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
     };
     const styleOf = node => {
         const css = getComputedStyle(node);
         // Compare animation configuration, not the naturally advancing time/background frame.
         const properties = ['backgroundColor','backgroundImage','border','borderTop','borderRight','borderBottom','borderLeft','borderRadius',
             'width','height','scale','transform','filter','opacity','mixBlendMode','backgroundBlendMode','mask','maskImage','webkitMaskImage',
             'animationName','animationDuration','animationDelay','animationTimingFunction','animationIterationCount',
             'animationDirection','animationFillMode','animationPlayState'];
         return {
             computed: Object.fromEntries(properties.map(key => [key, css[key]])),
             sx: css.getPropertyValue('--sx'), sy: css.getPropertyValue('--sy'),
             animations: node.getAnimations().map(a => ({ timing:a.effect.getTiming(), keyframes:a.effect.getKeyframes(),
                 playState:a.playState, playbackRate:a.playbackRate }))
         };
     };
     const ms = 120000, body = PF.members[0].body, owner = PF.members[0].ch;
     const specs = [
         ['wind', { follow:body, behind:true, dy:8 }],
         ['pierce', { follow:body, rotateWithBody:true }],
         ['shock', { owner }],
         ['slow', { follow:PF.foe, dx:24, dy:-12 }],
         ['supporter', { follow:body, behind:true }]
     ];
     setSkillFxOpacity(40);
     const passives = specs.map(([key, opt]) => {
         showPassiveFX(key, 210, 280, { ...opt, ms });
         const node = FX.sprites.find(n => n._passiveKey === key);
         expect(!!node, true, key + ' created');
         return { key, opt, node, owner:opt.follow || opt.owner, parent:opt.behind ? PF.field : PF.vfx,
             animations:node.getAnimations(), style:styleOf(node), timer:node._timer };
     });
     const checkPassives = label => {
         expect(document.querySelectorAll('.pf-fx.passive-effect').length, 5, label + ' passive count');
         for (const p of passives) {
             const nodes = FX.sprites.filter(n => n._passiveKey === p.key);
             expect(nodes.length, 1, label + ' ' + p.key + ' registry count');
             expect(nodes[0] === p.node && p.node.isConnected, true, label + ' ' + p.key + ' identity');
             expect(p.node._passiveOwner === p.owner && p.node.parentNode === p.parent, true, label + ' ' + p.key + ' owner/parent');
             expect(p.node._timer, p.timer, label + ' ' + p.key + ' lifetime unchanged');
             const animations = p.node.getAnimations();
             expect(animations.length, p.animations.length, label + ' ' + p.key + ' animation count');
             expect(animations.every((a, i) => a === p.animations[i] && a.effect.target === p.node), true, label + ' ' + p.key + ' animation identity');
             expect(styleOf(p.node), p.style, label + ' ' + p.key + ' style/animation');
         }
     };
     checkPassives('baseline');
     for (const p of passives) {
         expect(p.style.sx, { wind:'2.025', pierce:'1.500', shock:'1.500', slow:'2.025', supporter:'1.920' }[p.key], p.key + ' scale');
         expect(p.style.sy, p.style.sx, p.key + ' uniform scale');
         expect(p.style.computed.filter.includes('opacity(0.4)'), true, p.key + ' opacity');
         expect(p.style.computed.maskImage, 'none', p.key + ' unmasked asset');
         expect(p.animations.length, p.key === 'supporter' ? 1 : 0, p.key + ' native animation path');
     }
     let rounds = 0;
     for (const type of ['knight','fighter','ranger','special','supporter']) for (const level of [1,2,3]) {
         const label = type + ' Lv' + level;
         expect(PowerFlipVFX.play(type, 210, 280, 0, level), true, label + ' play');
         expect(PowerFlipVFX.activeCount() > 0, true, label + ' active');
         const canvas = PF.vfx.querySelector('canvas.power-flip-preview-fx');
         expect(!!canvas && !canvas.classList.contains('passive-effect'), true, label + ' dedicated canvas');
         await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
         expect(canvas.isConnected && PowerFlipVFX.activeCount() > 0, true, label + ' rendered');
         checkPassives(label + ' rendered');

         // Flash has a real 170ms lifetime: compare play/impact/clear in one task, without freezing or extending it.
         owner._passiveFlashAt = -Infinity;
         showPassiveHitFeedback(210, 280, owner);
         const flash = [...PF.vfx.querySelectorAll('.passive-hit-flash')].at(-1);
         expect(!!flash, true, label + ' passive hit flash created');
         const flashStyle = styleOf(flash), flashAnimations = flash.getAnimations(), flashAt = owner._passiveFlashAt;
         expect(flashStyle.computed.animationName, 'passiveHitFlash', label + ' native flash animation');
         expect(flashAnimations.length, 1, label + ' flash animation exists');
         const check = phase => {
             checkPassives(label + ' ' + phase);
             expect(flash.isConnected && flash.parentNode === PF.vfx && PF.vfx.querySelectorAll('.passive-hit-flash').length > 0,
                 true, label + ' ' + phase + ' flash identity/parent');
             expect(owner._passiveFlashAt, flashAt, label + ' ' + phase + ' flash owner throttle');
             const animations = flash.getAnimations();
             expect(animations.length, flashAnimations.length, label + ' ' + phase + ' flash animation count');
             expect(animations.every((a, i) => a === flashAnimations[i] && a.effect.target === flash), true, label + ' ' + phase + ' flash animation identity');
             expect(styleOf(flash), flashStyle, label + ' ' + phase + ' flash style/animation');
         };
         expect(PowerFlipVFX.play(type, 210, 280, 0, level), true, label + ' play alongside flash');
         check('play');
         expect(typeof PowerFlipVFX.impact, 'function', label + ' dedicated impact API');
         for (const [critical, wall] of [[false,false],[true,false],[false,true]]) {
             PowerFlipVFX.impact(type, 210, 280, level, { state:{ type, lv:level, source:owner, seq:PF.foeSeq }, critical, wall });
             check('impact critical=' + critical + ' wall=' + wall);
         }
         PowerFlipVFX.clear();
         expect(PowerFlipVFX.activeCount(), 0, label + ' cleared');
         expect(canvas.isConnected, false, label + ' canvas removed');
         expect(PF.vfx.querySelectorAll('canvas.power-flip-preview-fx').length, 0, label + ' no PF canvas left');
         check('clear');
         rounds++;
     }
     expect(passives[4].animations[0].currentTime > 0, true, 'supporter animation kept advancing');
     for (const p of passives) {
         showPassiveFX(p.key, 226, 292, { ...p.opt, ms });
         const nodes = FX.sprites.filter(n => n._passiveKey === p.key), refreshed = nodes[0];
         expect(nodes.length, 1, p.key + ' refresh remains deduplicated');
         // GIFs reuse their node; the existing supporter atlas path deliberately replaces it.
         expect(refreshed === p.node, p.key !== 'supporter', p.key + ' refresh identity');
         expect(refreshed.isConnected && refreshed._passiveOwner === p.owner && refreshed.parentNode === p.parent, true, p.key + ' refresh owner/parent');
         expect([refreshed.style.left, refreshed.style.top], ['226px','292px'], p.key + ' refresh position');
         expect(refreshed._timer !== p.timer, true, p.key + ' refresh lifetime');
         expect(styleOf(refreshed), p.style, p.key + ' refresh style/animation');
         clearPassiveFX(p.key, p.owner);
         expect(!p.node.isConnected && !refreshed.isConnected, true, p.key + ' explicit cleanup');
         expect(refreshed.getAnimations().length, 0, p.key + ' animation cleanup');
         expect(FX.sprites.filter(n => n._passiveKey === p.key).length, 0, p.key + ' registry cleanup');
     }
     await new Promise(resolve => setTimeout(resolve, 220));
     expect(document.querySelectorAll('.passive-effect').length, 0, 'passive hit flashes expire normally');
     expect(FX.sprites.length, 0, 'all passives cleaned');
     setSkillFxOpacity(100);
     return rounds;
 })()`),15,'five PF types at Lv1-3 preserve passive effects');
 assert.deepEqual(page.errors,[]);console.log('PASS: single/ten history metadata and entry/close, mobile layouts, boss/training/material/special/event clean initialization/return, tower retained, five passive paths, 1.35x passive scales, deduplication and cleanup, 15 PF/passive isolation rounds');
 }finally{if(page)page.socket.close();proc.kill();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
