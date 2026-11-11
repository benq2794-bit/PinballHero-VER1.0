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

 await page.evaluate("cloudUser=null;$('login-screen').hidden=true;pickHomeTab('book')");
 const unlockFilters=await page.evaluate("(()=>{const results={};for(const filter of ['all','unlocked','locked']){setDexUnlockFilter(filter);const expected=DEX_ON.filter(row=>filter==='all'||!!roster[DEX_HERO[row[0]]]?.unlocked===(filter==='unlocked')).map(row=>row[0]);results[filter]={expected,shown:[...document.querySelectorAll('.dex-cell')].map(cell=>cell.dataset.character),pressed:document.querySelector('[data-unlock-filter=\"'+filter+'\"]').getAttribute('aria-pressed')};}setDexUnlockFilter('unlocked');const match=DEX_ON.find(row=>!!roster[DEX_HERO[row[0]]]?.unlocked);if(match)dexSet('q',match[0]);results.search=match?{id:match[0],shown:[...document.querySelectorAll('.dex-cell')].map(cell=>cell.dataset.character)}:null;dexClear();return results;})()");
 for(const filter of ['all','unlocked','locked']){assert.deepEqual(unlockFilters[filter].shown,unlockFilters[filter].expected,`${filter} character filter`);assert.equal(unlockFilters[filter].pressed,'true',`${filter} filter pressed state`);}
 assert.ok(unlockFilters.search===null||unlockFilters.search.shown.includes(unlockFilters.search.id),'search works with the unlocked filter');
 assert.equal(await page.evaluate("dexF.u==='all'&&dexF.q===''"),true,'clear resets status and text filters');
 assert.equal(await page.evaluate("document.querySelectorAll('.dex-mobile-tabs button').length"),3);
 for(const tab of ['focus','matrix','rewards']){await page.evaluate("dexSetTab('"+tab+"')");assert.equal(await page.evaluate("document.querySelector('.dex-layout').dataset.active"),tab);}
 await page.evaluate("dexSetTab('focus')");assert.equal(await page.evaluate("document.querySelector('.dex-focus').textContent.includes('Lv.80 培養達標')"),true);
 const portrait=await page.evaluate("(()=>{const c=DEX_ON.find(row=>DEX_HERO[row[0]]&&!roster[DEX_HERO[row[0]]]?.unlocked)||DEX_ON[0];dexSelected=c[0];dexPortraitState=0;dexRefresh();const image=$('dex-focus-art');return{count:DEX_ON.length,id:c[0],rarity:c[1],src:image.getAttribute('src'),locked:image.classList.contains('locked'),fit:getComputedStyle(image).objectFit}})()");
 assert.ok(portrait.count>0);assert.equal(portrait.src,`https://vivaldi6352.github.io/assets/rarity${portrait.rarity}/${portrait.id}/full_shot_1440_1920_0.png`);assert.equal(portrait.locked,true);assert.equal(portrait.fit,'contain');
 await page.evaluate("dexSetPortraitState(1)");assert.equal(await page.evaluate("$('dex-focus-art').getAttribute('src')"),`https://vivaldi6352.github.io/assets/rarity${portrait.rarity}/${portrait.id}/full_shot_1440_1920_1.png`);assert.equal(await page.evaluate("document.querySelector('[data-portrait-state=\"1\"]').getAttribute('aria-pressed')"),'true');
 const zoom=await page.evaluate("(()=>{$('dex-focus-art').hidden=false;dexOpenPortrait();return{open:$('dex-portrait-dialog').open,locked:$('dex-portrait-dialog-image').classList.contains('locked')}})()");assert.deepEqual(zoom,{open:true,locked:true});await page.evaluate("dexClosePortrait()");
 assert.equal(await page.evaluate("document.querySelector('.collection-details').open"),false);await page.evaluate("document.querySelector('.collection-details summary').click()");assert.equal(await page.evaluate("document.querySelector('.collection-details').open"),true);
 await page.evaluate("dexSetTab('rewards')");assert.equal(await page.evaluate("document.querySelectorAll('.collection-card').length"),16);assert.equal(await page.evaluate("document.querySelector('.collection-prize img').getAttribute('src')"),'asset/items/crystal.png');
 for(const width of [320,390,1280]){await page.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});for(const dark of [false,true]){await page.evaluate("document.documentElement.classList.toggle('ui-dark-mode',"+dark+")");const r=await page.evaluate("(()=>{const n=$('dex-rewards');return {fits:n.scrollWidth<=n.clientWidth+1,badImages:[...n.querySelectorAll('img')].filter(i=>i.complete&&!i.naturalWidth).length,cards:document.querySelectorAll('.collection-card').length}})()");assert.equal(r.fits,true,JSON.stringify({width,dark,r}));assert.equal(r.badImages,0);}}
 await page.evaluate("setCollectionAchievementFilter('growth')");assert.equal(await page.evaluate("document.querySelectorAll('.collection-card').length"),7);await page.evaluate("setCollectionAchievementFilter('element')");assert.equal(await page.evaluate("document.querySelectorAll('.collection-card').length"),3);await page.evaluate("setCollectionAchievementFilter('all');window.__beforeReward=shardTotal;document.querySelector('.collection-claim-all').click();window.__afterReward=shardTotal");assert.equal(await page.evaluate("shardTotal>window.__beforeReward"),true);await page.evaluate("claimAllCollectionAchievements()");assert.equal(await page.evaluate("shardTotal===window.__afterReward"),true);
 const claims=await page.evaluate("collectionAchievementClaims.slice()");assert.ok(claims.includes('ca2_owned_3'));await page.send('Page.reload');await delay(500);for(let i=0;i<100;i++){if(await page.evaluate("typeof uiRouter !== 'undefined'"))break;await delay(50);}assert.equal(await page.evaluate("collectionAchievementClaims.includes('ca2_owned_3')"),true);await page.evaluate("$('login-screen').hidden=true;pickHomeTab('book');dexSetTab('rewards')");assert.equal(await page.evaluate("document.querySelectorAll('.collection-card.claimed').length>0"),true);
 await page.send('Emulation.setDeviceMetricsOverride',{width:430,height:900,deviceScaleFactor:1,mobile:true});await page.evaluate("document.documentElement.classList.remove('ui-dark-mode');setCollectionAchievementFilter('all');$('pg-body').scrollTop=0");await delay(200);const shot=await page.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(root,'tmp/collection-preview.png'),Buffer.from(shot.data,'base64'));assert.deepEqual(page.errors,[]);
 await page.evaluate("collectionAchievementClaims=['ach_1'];OPEN_CHAR_IDS.slice(0,6).forEach(id=>{roster[id].unlocked=true;roster[id].lvl=85});saveGame()");await page.send('Page.reload');await delay(500);for(let i=0;i<100;i++){if(await page.evaluate("typeof uiRouter !== 'undefined'"))break;await delay(50);}assert.equal(await page.evaluate("collectionAchievementClaims.includes('ach_1')&&collectionAchievementClaims.includes('ca2_legacy_ach_2')&&collectionAchievementClaims.includes('ca2_legacy_ach_3')"),true,'old pending qualifications frozen during real load');await page.evaluate("$('login-screen').hidden=true;pickHomeTab('book');dexSetTab('rewards');window.__oldGold=shardTotal;claimCollectionAchievement('ach_1')");assert.equal(await page.evaluate('shardTotal===window.__oldGold'),true);await page.evaluate("claimCollectionAchievement('ach_2');claimCollectionAchievement('ach_2')");assert.equal(await page.evaluate('shardTotal-window.__oldGold'),250,'old reward paid exactly once');
 console.log(`PASS: ${portrait.count} character portraits, initial/awakened mapping, grayscale locked art, contain sizing and zoom dialog; three tabs, expandable account summary, 16 cards, rainbow currency, category filters, one-click claim, duplicate guard, reload persistence and light/dark mobile layouts`);

 }finally{if(page)page.socket.close();proc.kill();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
