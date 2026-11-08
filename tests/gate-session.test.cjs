const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'..');const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function setup(){let fail=false,costs=0,saves=0;const replies=[],handlers=[];const c={window:null,addEventListener:(type,fn)=>handlers.push(fn),location:{protocol:'https:',origin:'https://test'},GATE_MODE:null,GATE:{id:'fire',t0:0,dmg0:0,tier:0,runId:'',runSeq:0},TRAINING_MODE:false,DUNGEON_MODE:null,GATE_TARGET:'https://test',gateBattleId:'fire',gateBattleTier:0,gateEnhance:{},gold:0,gateReceipts:new Map(),shardTotal:100,breakthroughStones:{fourStar:0},towerMaterials:{expeditionMedal:0,dragonWing:0,shellfishTail:0,thunderCore:0,garudaBeak:0},cultivationMaterials:0,highGradeExperienceCrystals:0,summonTicketSingle:0,summonTicketTen:0,bossWin:{},gateRecord:{},avatarFramesOwned:[],ELEMENTAL_AVATAR_FRAMES:{},betaEventState:{battles:0},stamina:45,staminaTickAt:1,homeSig:'',CHAR_IDS:['a','b','water','full'],CHAR_TABLE:{a:{name:'火甲',rarity:4,element:'fire',open:true,need:10},b:{name:'火乙',rarity:4,element:'fire',open:true,need:10},water:{name:'水',rarity:4,element:'water',open:true,need:10},full:{name:'滿解放',rarity:4,element:'fire',open:true,need:10}},roster:{a:{shards:9,unlocked:false,cap:80},b:{shards:0,unlocked:true,cap:80},water:{shards:0,unlocked:true,cap:80},full:{shards:0,unlocked:true,cap:100}},growthCap:ch=>ch.cap,betaEventActive:()=>true,recordBetaEventBattle(){c.betaEventState.battles++},BattleSettlement:{mergeRecord:(r,g,ms,score)=>{r[g]={ms,score}}},saveGame:()=>{saves++;return !fail},hmToast(text){c.toast=text;},log(text){c.logText=text;},paintHome(){},homeTabOn:'home',renderPage(){},$:()=>null,Math:Object.create(Math),syncStamina:()=>({value:c.stamina,max:120}),StaminaSystem:{GATE_COST:15,REGEN_INTERVAL_MS:300000},recordPassStamina:()=>costs++,updateUI(){},PF:{foeSeq:1},gateOf:()=>({id:'fire'}),restartGateBattleAfterPayment:()=>costs++};c.window=c;c.parent={};c.Math.random=()=>.1;vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'asset/game-data.js'),'utf8'),c);c.GAME_DATA=c.window.GAME_DATA;c.BOSS_STAGES=c.GAME_DATA.encounters.gates;vm.runInContext(fs.readFileSync(path.join(root,'asset/gate-enhancement.js'),'utf8'),c);c.GateEnhancement=c.window.GateEnhancement;c.gateEnhance=c.GateEnhancement.normalize({},c.BOSS_STAGES.map(g=>g.id),c.bossWin);vm.runInContext(fs.readFileSync(path.join(root,'asset/gate-session.js'),'utf8'),c);vm.runInContext(html.slice(html.indexOf('function spendStamina('),html.indexOf('function rankExpNeed(')),c);return {c,frame:{contentWindow:{postMessage:d=>replies.push(d)}},replies,handlers,fail:v=>fail=v,saves:()=>saves,costs:()=>costs};}
const result={gate:'fire',win:1,shards:50,first:true,drops:{rainbow:2,breakthrough:2,highExperience:2,bossMaterial:1,expeditionMedal:1,singleTicket:1,tenTicket:1},ms:1000,score:10};
{
const t=setup(),c=t.c;assert.equal(c.gateFragmentPool('fire').join(','),'a,b');c.Math.random=()=>.3;assert.equal(c.rollGateFragment('fire',.30),null);const samples=[.29,.99];c.Math.random=()=>samples.shift();assert.equal(c.rollGateFragment('fire',.30),'b');assert.equal(c.grantGateFragment('water','fire'),null);c.Math.random=()=>.1;const actor=c.roster.a;c.receiveGateReward(result,t.frame);assert.equal(c.shardTotal,152);assert.equal(c.roster.a.unlocked,true);assert.equal(c.roster.a.shards,0,'10 fragments consumed once');assert.equal(c.roster.a,actor,'no parent combat character replacement');assert.equal(c.breakthroughStones.fourStar,2);assert.equal(c.cultivationMaterials,20);assert.equal(c.highGradeExperienceCrystals,2);assert.equal(c.towerMaterials.dragonWing,1);assert.equal(c.summonTicketTen,1);assert.equal(c.gateReceipts.get('fire'),1);c.receiveGateReward(result,t.frame);assert.equal(c.shardTotal,152);assert.equal(t.saves(),1);assert.equal(c.roster.a.shards,0,'no duplicate fragment');
c.receiveGateRetry({gate:'fire',win:1,requestId:'x'},t.frame);assert.equal(c.stamina,30);c.receiveGateRetry({gate:'fire',win:1,requestId:'x'},t.frame);c.receiveGateRetry({gate:'fire',win:1,requestId:'y'},t.frame);assert.equal(c.stamina,30,'one payment per winning run');assert.equal(t.costs(),1);}
{
const t=setup(),c=t.c,actor=c.roster.a;t.fail(true);c.receiveGateReward(result,t.frame);assert.equal(c.shardTotal,100);assert.equal(c.roster.a.unlocked,false);assert.equal(c.roster.a.shards,9);assert.equal(c.roster.a,actor);assert.equal(c.gateReceipts.size,0);assert.equal(c.gateHasPendingReward(),true);t.fail(false);c.Math.random=()=>{throw Error('must not reroll')};c.receiveGateReward(result,t.frame);assert.equal(c.roster.a.unlocked,true);assert.equal(c.shardTotal,152);assert.equal(c.gateHasPendingReward(),false);
c.stamina=14;c.receiveGateRetry({gate:'fire',win:1,requestId:'low'},t.frame);assert.equal(c.stamina,14);c.stamina=30;t.fail(true);c.receiveGateRetry({gate:'fire',win:1,requestId:'fail'},t.frame);assert.equal(c.stamina,30);assert.equal(t.replies.at(-1).ok,false);}
{
const t=setup(),c=t.c;c.CHAR_TABLE.a.element='water';c.roster.b.cap=100;c.receiveGateReward(result,t.frame);assert.equal(t.replies.at(-1).fragment,null);assert.equal(c.roster.water.shards,0);assert.equal(c.shardTotal,152,'original rewards remain without fragment candidate');}
{
const t=setup(),c=t.c;vm.runInContext(fs.readFileSync(path.join(root,'asset/reward-formulas.js'),'utf8'),c);c.RewardFormulas=c.window.RewardFormulas;assert.equal(c.RewardFormulas.towerEnemyRainbowCrystal(.099),1);assert.equal(c.RewardFormulas.towerEnemyRainbowCrystal(.1),0);assert.equal(c.RewardFormulas.towerEnemyCharacterFragment(.009),1);assert.equal(c.RewardFormulas.towerEnemyCharacterFragment(.01),0);vm.runInContext(fs.readFileSync(path.join(root,'asset/offline-earnings.js'),'utf8'),c);assert.equal(c.OfflineEarnings.perEnemyRewards(1).rainbowCrystal,.3,'offline original rate retained');}
for(const element of ['fire','water','thunder','wind']) {
 const t=setup(),c=t.c;c.gateBattleId=element;c.CHAR_TABLE.a.element=element;c.CHAR_TABLE.b.element=element;c.CHAR_TABLE.water.element='light';c.Math.random=()=>.1;
 c.receiveGateReward({...result,gate:element},t.frame);assert.equal(c.roster.a.unlocked,true);assert.equal(c.roster.a.shards,0);assert.equal(t.replies.at(-1).fragment.amount,1,'all elements receive one fragment during beta');assert.equal(c.roster.water.shards,0);
}
{
 const t=setup(),c=t.c;c.ELEMENTAL_AVATAR_FRAMES={'test-frame':{name:'測試框'}};c.Math.random=()=>0;c.receiveGateReward(result,t.frame);assert.ok(c.avatarFramesOwned.includes('test-frame'),'existing frame drop retained');
 assert.equal(c.GAME_DATA.rewards.towerEnemyMaterials.jelly.chance,.2);assert.equal(c.GAME_DATA.rewards.towerEnemyMaterials.blockScrap.chance,.1);assert.equal(c.GAME_DATA.rewards.towerEnemyMaterials.monsterCrystal.chance,.05);
}
// 五階強化：階級由母頁自己算，首破每王每階只發一次，金幣與階級突破石不參加封測加倍。
{
 const t=setup(),c=t.c;c.bossWin.fire=71;c.gateEnhance=c.GateEnhancement.normalize({},['fire'],c.bossWin);
 assert.equal(c.gateEnhance.fire.unlocked,10,'舊玩家讀檔補回 +10，但不補發任何首破');
 c.gateBattleTier=10;c.Math.random=()=>.1;
 const before={shard:c.shardTotal,gold:c.gold,stone:c.breakthroughStones.fourStar};
 c.receiveGateReward({...result,gate:'fire',win:72,first:false,shards:0,drops:{rainbow:3,breakthrough:2,highExperience:1}},t.frame);
 assert.equal(t.replies.at(-1).firstBreak,5);assert.equal(t.replies.at(-1).unlockedTier,20);
 assert.equal(c.shardTotal,before.shard+3+5,'再戰沒有固定 5 顆，只剩隨機 1～3 加階級首破');
 assert.equal(c.gold,before.gold+1200);
 assert.equal(c.breakthroughStones.fourStar,before.stone+2+1,'基礎突破石已加倍，階級那 1 顆不再加倍');
 assert.deepEqual(Array.from(c.gateEnhance.fire.broken),[10]);assert.equal(c.gateEnhance.fire.unlocked,20);
 assert.match(c.toast,/已解鎖/);assert.match(c.logText,/階級首破/);
 c.receiveGateReward({...result,gate:'fire',win:73,first:false,shards:0,drops:{rainbow:1,breakthrough:1,highExperience:1}},t.frame);
 assert.equal(t.replies.at(-1).firstBreak,0);assert.equal(t.replies.at(-1).unlockedTier,0);
 assert.equal(c.shardTotal,before.shard+3+5+1);assert.equal(c.gold,before.gold+2400);
 assert.deepEqual(Array.from(c.gateEnhance.fire.broken),[10],'同一階的首破紀錄不重複累加');
}
// +50 有候選就保證一張；沒有同屬性候選時寧可不掉，也不跨屬性遞補。
{
 const t=setup(),c=t.c;c.bossWin.fire=71;c.gateEnhance=c.GateEnhancement.normalize({},['fire'],c.bossWin);
 c.gateEnhance.fire.unlocked=50;c.gateBattleTier=50;c.Math.random=()=>.999;
 c.receiveGateReward({...result,gate:'fire',win:72,first:false,shards:0},t.frame);
 assert.equal(t.replies.at(-1).firstBreak,30);assert.equal(t.replies.at(-1).fragment.amount,1);
 assert.equal(t.replies.at(-1).unlockedTier,0,'+50 已經是最後一階');
 assert.equal(c.gold,2000);assert.equal(c.breakthroughStones.fourStar,2+3);
}
{
 const t=setup(),c=t.c;c.bossWin.fire=71;c.gateEnhance=c.GateEnhancement.normalize({},['fire'],c.bossWin);
 c.gateEnhance.fire.unlocked=50;c.gateBattleTier=50;c.CHAR_TABLE.a.element='water';c.roster.b.cap=100;c.Math.random=()=>0;
 c.receiveGateReward({...result,gate:'fire',win:72,first:false,shards:0},t.frame);
 assert.equal(t.replies.at(-1).fragment,null);assert.equal(c.roster.water.shards,0);
 assert.equal(c.shardTotal,100+2+30,'沒有碎片候選也不影響其他獎勵');
}
// 戰鬥中／全滅的再戰認 runId：同一場只扣一次，換一場再扣一次，沒有 runId 不認帳。
{
 const t=setup(),c=t.c;c.GATE.runId='fire:1:100';
 c.receiveGateRetry({gate:'fire',win:0,runId:'fire:1:100',requestId:'mid'},t.frame);
 assert.equal(t.replies.at(-1).ok,true);assert.equal(c.stamina,30);
 c.receiveGateRetry({gate:'fire',win:0,runId:'fire:1:100',requestId:'mid-again'},t.frame);
 assert.equal(t.replies.at(-1).ok,false);assert.equal(c.stamina,30,'同一場重開只扣一次');
 c.GATE.runId='fire:2:200';
 c.receiveGateRetry({gate:'fire',win:0,runId:'fire:2:200',requestId:'next'},t.frame);
 assert.equal(c.stamina,15,'新的一場再扣 15');
 c.receiveGateRetry({gate:'fire',win:0,requestId:'no-run'},t.frame);
 assert.equal(t.replies.at(-1).ok,false);assert.equal(c.stamina,15);
 c.stamina=14;c.GATE.runId='fire:3:300';
 c.receiveGateRetry({gate:'fire',win:0,runId:'fire:3:300',requestId:'poor'},t.frame);
 assert.equal(t.replies.at(-1).ok,false);assert.equal(c.stamina,14,'體力不足就擋下，不進入再戰');
}
console.log('PASS: same-element uniform pool, level/tier shard boundary, non-doubled fragment, original rewards, unlock without combat rebuild, save rollback/stable reroll, paid retry deduplication by win and runId, insufficient stamina, tier first-break once, tier gold/stones outside beta doubling, +50 guaranteed drop and unchanged offline yield');
