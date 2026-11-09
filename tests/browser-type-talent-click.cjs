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


 await page.evaluate("cloudUser=null;$('login-screen').hidden=true;tutorialSeen=true;ensurePlayableAccount();setPaused(true);pickHomeTab('talents')");
 for(const width of [1280,320,390]){
 const touch=width<500;await page.send('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:touch});await page.send('Emulation.setTouchEmulationEnabled',{enabled:touch});await delay(100);
 await page.evaluate("typeTalentRanks={knight:Object.fromEntries(typeTalentLaneNodes('knight').slice(0,5).map(n=>[n.id,1]))};typeTalentPoints=28;typeTalentSelected={};renderTypeTalentTree()");
 const layout=await page.evaluate(`(() => {
  const canvas=document.querySelector('.tt-canvas'),cr=canvas.getBoundingClientRect();
  const statuses=[...document.querySelectorAll('.tt-passive-status')],nodes=[...document.querySelectorAll('.tt-node:not(.tt-passive-node)')];
  const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,
   statuses:statuses.map(s=>{const r=s.getBoundingClientRect();return {text:s.textContent,left:r.left,right:r.right,top:r.top,bottom:r.bottom}}),
   canvas:{left:cr.left,right:cr.right,top:cr.top,bottom:cr.bottom},
   overlaps:statuses.flatMap(s=>{const r=s.getBoundingClientRect();return nodes.filter(n=>overlap(r,n.getBoundingClientRect())).map(n=>n.getAttribute('aria-label'))})};
 })()`);
 assert.ok(layout.documentWidth<=layout.viewport,'talent page must not overflow horizontally '+JSON.stringify({width,layout}));
 assert.ok(layout.statuses.every(s=>s.left>=layout.canvas.left&&s.right<=layout.canvas.right),'passive statuses must remain inside the canvas '+JSON.stringify({width,layout}));
 assert.equal(layout.overlaps.length,0,'passive statuses must not cover ordinary nodes '+JSON.stringify({width,layout}));
 assert.ok(layout.statuses.some(s=>s.text==='可解鎖（消耗 1 點）'),'unlock cost is visible at '+width+'px');
 if(touch){
 const rect=await page.evaluate("(()=>{const b=document.querySelector('.tt-passive-node.passive-available'),r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
 await page.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...rect,radiusX:1,radiusY:1}]});
 await page.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(50);
 assert.deepEqual(await page.evaluate('[typeTalentSpent(),typeTalentPoints]'),[6,27],'passive touch spends exactly one point');
 assert.ok(await page.evaluate("document.querySelector('.tt-passive-node.passive-active')!==null"),'touch enables the passive');
 }
 for(const dark of [false,true]){
 await page.evaluate("document.documentElement.classList.toggle('ui-dark-mode',"+dark+");typeTalentRanks={};typeTalentPoints=100;typeTalentSelected={};renderTypeTalentTree()");
 const id=await page.evaluate("document.querySelector('.tt-node.available.selected').getAttribute('onclick')");
 const node=()=>page.evaluate("(()=>{const b=[...document.querySelectorAll('.tt-node')].find(n=>n.getAttribute('onclick')==="+JSON.stringify(id)+");const r=b.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})()");
 for(const [nx,ny] of [[.5,.5],[.08,.5],[.92,.5],[.5,.08],[.5,.92]]){
 const rect=await node(),point={x:rect.x+rect.width*nx,y:rect.y+rect.height*ny};
 const before=await page.evaluate('[typeTalentSpent(),typeTalentPoints]');
 if(touch)await page.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,radiusX:1,radiusY:1}]});else await page.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
 const pressed=await node();assert.ok(Math.abs(pressed.x-rect.x)<.1&&Math.abs(pressed.y-rect.y)<.1,'press must not move the hit area '+JSON.stringify({width,dark,rect,pressed}));
 if(touch)await page.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
 await delay(30);assert.deepEqual(await page.evaluate('[typeTalentSpent(),typeTalentPoints]'),[before[0]+1,before[1]-1],'exactly one level per real input '+JSON.stringify({width,dark,nx,ny}));
 }
 assert.equal(await page.evaluate("document.querySelector('.tt-node.maxed.selected i').textContent"),'5','existing Lv.5 badge retained');
 // A capped node never consumes a sixth point.
 const rect=await node(),point={x:rect.x+rect.width/2,y:rect.y+rect.height/2};await page.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});assert.equal(await page.evaluate('typeTalentPoints'),95);
 // An unselected available node also retains its position and accepts its center.
 const other=await page.evaluate("(()=>{const b=document.querySelector('.tt-node.available:not(.selected)'),r=b.getBoundingClientRect();return {id:b.getAttribute('onclick'),x:r.x+r.width/2,y:r.y+r.height/2}})()");
 await page.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,x:other.x,y:other.y});await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:other.x,y:other.y});assert.equal(await page.evaluate('typeTalentPoints'),94);
 }
 }
 assert.deepEqual(page.errors,[]);console.log('PASS: 320/390 touch and 1280 mouse in both themes, overflow-free visible passive statuses, tap unlock/refund point accounting, center/icon and four edges, stationary hit area and Lv.5 cap/badge');
 }finally{if(page)page.socket.close();proc.kill();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
