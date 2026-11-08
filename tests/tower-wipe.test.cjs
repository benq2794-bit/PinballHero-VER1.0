const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function setup(mode={},boss=false){
    const calls={shown:0,hidden:0,spawned:0,saved:0,reset:0,finished:0,toast:''};
    const members=[{down:true,ch:{hp:0,maxHp:104,gauge:80}},{down:false,ch:{hp:0,maxHp:200,gauge:40}}];
    const nodes=new Map(),messages=[],handlers=[];
    const node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',disabled:false,classList:{add:()=>calls.shown++,remove:()=>calls.hidden++}});return nodes.get(id);};
    const ctx={towerAutoLoop:false,PF:{members,running:true},GATE_MODE:null,DUNGEON_MODE:null,TRAINING_MODE:false,EXPEDITION_MODE:false,expedition:null,gate:null,
        stage:boss?20:17,floorWins:2,deepTimeLeft:1,tickCounter:99,BOSS_EVERY:10,BOSS_FLOOR_SECONDS:90,NORMAL_FLOOR_SECONDS:60,W:400,H:700,dmgTotal:0,
        GATE:{id:null,t0:0,dmg0:0,tier:0,runId:'',runSeq:0},stamina:60,staminaTickAt:0,
        BOSS_STAGES:[{id:'fire',gate:'熾焰之門'}],StaminaSystem:{GATE_COST:15},gateReceipts:new Map(),
        performance:{now:()=>1},SFX:{voice(){},crystalBreak(){}},log(){},charName:()=>'',coffinRescueOn:()=>false,
        gateOn:()=>!!ctx.gate,gateOf:()=>ctx.gate,hpMax:ch=>ch.maxHp,resetBattleTransient:()=>calls.reset++,attachBall:m=>{m.body={};},
        spawnEnemy:()=>calls.spawned++,spawnFoe(){},applyBattlefieldBg(){},updateUI(){},saveGame:()=>{calls.saved++;return true},
        setPaused:value=>ctx.PF.paused=value,finishExpedition:()=>calls.finished++,backHome(){},
        hmToast:text=>{calls.toast=text;},$:id=>nodes.get(id)||null,
        addEventListener:(type,fn)=>{if(type==='message')handlers.push(fn);},
        location:{protocol:'https:',origin:'https://test'},GATE_TARGET:'https://test',
        document:{getElementById:node},battleLifecycle:{setRunning:value=>ctx.PF.running=value},...mode};
    ctx.window=ctx;ctx.parent={postMessage:data=>messages.push(data)};
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(root,'asset/gate-session.js'),'utf8'),ctx);
    vm.runInContext(html.slice(html.indexOf('function downMember(m)'),html.indexOf('// ===== 陷洞')),ctx);
    vm.runInContext(html.slice(html.indexOf('function showOver(txt)'),html.indexOf('// ===== 關卡背景')),ctx);
    return {ctx,calls,members,nodes,messages,handlers};
}
for(const boss of [false,true]){const {ctx,calls,members}=setup({},boss),floor=ctx.stage;ctx.downMember(members[1]);assert.equal(calls.shown,0);assert.deepEqual(members.map(m=>m.ch.hp),[52,100]);assert.ok(members.every(m=>!m.down&&m.body&&m.ch.gauge===0));assert.equal(ctx.stage,floor,'same floor');assert.equal(ctx.floorWins,0);assert.equal(ctx.deepTimeLeft,boss?90:60);assert.equal(ctx.tickCounter,0);assert.equal(ctx.PF.running,true);assert.equal(ctx.PF.paused,false);assert.equal(calls.spawned,1);assert.equal(calls.saved,1);ctx.retryAfterPartyWipe();assert.equal(calls.spawned,1,'stale manual click cannot restart twice');}
for(const mode of [{DUNGEON_MODE:'gold'},{TRAINING_MODE:true},{EXPEDITION_MODE:true},{GATE_MODE:'training'}]){const {ctx,calls,members,messages}=setup(mode);ctx.downMember(members[1]);assert.equal(calls.shown,1,'other modes retain wipe window');assert.equal(calls.spawned,0);assert.equal(ctx.PF.running,false);assert.ok(members.every(m=>m.down&&m.ch.hp===0));ctx.retryAfterPartyWipe();assert.deepEqual(members.map(m=>m.ch.hp),[52,100],'other modes retain original 50% manual retry');assert.equal(messages.length,0,'only boss gates ask the parent for stamina');}
{const {ctx,calls,members}=setup({expedition:{}});ctx.downMember(members[1]);assert.equal(calls.finished,1);assert.equal(calls.shown,0);assert.equal(calls.spawned,0);}
{const {ctx,calls}=setup();assert.equal(ctx.retryTowerAfterPartyWipe(),false,'not a wipe');assert.equal(calls.reset,0);}
// Boss 門的全滅再戰：按鈕先標價，按下只送請款，母頁確認扣到 15 體力才真的復活。
{
    const {ctx,calls,members,nodes,messages,handlers}=setup({gate:{id:'fire',gate:'熾焰之門'},GATE_MODE:'fire'});
    ctx.GATE.id='fire';
    ctx.downMember(members[1]);
    assert.equal(calls.shown,1);
    assert.equal(nodes.get('pf-over-retry').textContent,'重新挑戰（15 體力）');
    ctx.retryAfterPartyWipe();
    assert.equal(calls.spawned,0,'no free revive before the parent confirms');
    assert.equal(messages.length,1);
    const request=messages[0];
    assert.equal(request.type,'wf-gate-retry-request');assert.equal(request.gate,'fire');assert.equal(request.win,0);
    assert.ok(request.runId&&request.requestId);
    assert.equal(nodes.get('pf-over-retry').disabled,true);
    ctx.retryAfterPartyWipe();ctx.retryAfterPartyWipe();
    assert.equal(messages.length,1,'double click cannot ask for a second payment');
    assert.match(calls.toast,/再戰確認中/);
    const reply={source:ctx.parent,origin:'https://test',data:{type:'wf-gate-retry-response',gate:'fire',requestId:request.requestId,win:0,ok:true,stamina:45,staminaTickAt:7}};
    handlers.forEach(fn=>fn(reply));
    assert.equal(calls.spawned,1);assert.deepEqual(members.map(m=>m.ch.hp),[52,100],'gate revive keeps the original 50% health');
    assert.equal(ctx.stamina,45);assert.equal(ctx.staminaTickAt,7);
    assert.equal(nodes.get('pf-over-retry').disabled,false);
    assert.notEqual(ctx.GATE.runId,request.runId,'the revived fight is a new billable run');
    handlers.forEach(fn=>fn(reply));
    assert.equal(calls.spawned,1,'a replayed response cannot revive twice');
}
// 母頁拒絕請款（體力不足）時不復活，按鈕解鎖讓玩家再試。
{
    const {ctx,calls,members,nodes,messages,handlers}=setup({gate:{id:'fire',gate:'熾焰之門'},GATE_MODE:'fire'});
    ctx.GATE.id='fire';ctx.downMember(members[1]);ctx.retryAfterPartyWipe();
    handlers.forEach(fn=>fn({source:ctx.parent,origin:'https://test',data:{type:'wf-gate-retry-response',gate:'fire',requestId:messages[0].requestId,win:0,ok:false,message:'體力不足或存檔失敗，未進行再戰。',stamina:14,staminaTickAt:0}}));
    assert.equal(calls.spawned,0);assert.ok(members.every(m=>m.down));
    assert.equal(nodes.get('pf-over-retry').disabled,false);
    assert.match(calls.toast,/體力不足/);
    assert.equal(ctx.stamina,60,'a rejected payment never touches the local stamina mirror');
}
console.log('PASS: tower auto-revives 50%, restarts same normal/boss floor, resets timer/waves, suppresses manual wipe, other modes keep free retry, boss-gate wipe retry bills 15 stamina once and honours rejection');