// 四屬性 Boss 的母頁獎勵與再戰交握；不改動波利塔碎片分配。
// 母頁是唯一發獎與寫存檔的一方，門的實例只負責把戰果貼上來。
const gateRewardPlans = new Map(), gateRetryResponses = new Map(), gateRetryPaidRuns = new Set();
let gateLastResult = null, gateRewardSaved = false, gateRetryPending = null, gateRetryConsumedWin = 0, gateRetryAction = null;
function clearGateSession() {
    gateRewardPlans.clear(); gateRetryResponses.clear(); gateRetryPaidRuns.clear();
    gateLastResult = null; gateRewardSaved = false; gateRetryPending = null; gateRetryConsumedWin = 0; gateRetryAction = null;
}
function gateHasPendingReward() { return [...gateRewardPlans.values()].some(plan => !plan.saved); }
// 每一場戰鬥（進場、結算再戰、全滅再戰、暫停重開）都拿一個新的 runId，母頁用它認「這一場只扣一次」。
function markGateRun() {
    GATE.runSeq++;
    GATE.runId = `${GATE.id || 'gate'}:${GATE.runSeq}:${Date.now()}`;
}
function gateFragmentPool(element) {
    return CHAR_IDS.filter(id => {const d=CHAR_TABLE[id],ch=roster[id];return d?.rarity===4&&d.open&&d.element===element&&ch&&(ch.unlocked?growthCap(ch)<100&&ch.shards<999999:ch.shards<d.need);});
}
// 機率由當下等級／強化階級決定；同屬性四星統一亂數抽一張，沒有候選就不掉，不跨屬性遞補。
function rollGateFragment(element, chance) {
    if (!(Math.random() < Math.max(0, Math.min(1, +chance || 0)))) return null;
    const pool=gateFragmentPool(element);
    return pool.length?pool[Math.floor(Math.random()*pool.length)]:null;
}
function grantGateFragment(id, element) {
    if (!id || !gateFragmentPool(element).includes(id)) return null;
    const ch=roster[id],d=CHAR_TABLE[id];
    ch.shards+=GAME_DATA.rewards.gateFourStarFragment.amount;
    let unlocked=false;
    if (!ch.unlocked&&ch.shards>=d.need) {ch.shards-=d.need;ch.unlocked=true;unlocked=true;}
    // 僅更新持有狀態；不自動補隊，也不呼叫 exchangeChar 的戰場重建流程。
    return {id,name:d.name,amount:1,unlocked};
}
function captureGateRewardState() {
    return JSON.parse(JSON.stringify({shardTotal,gold,breakthroughStones,towerMaterials,cultivationMaterials,highGradeExperienceCrystals,summonTicketSingle,summonTicketTen,bossWin,gateRecord,gateEnhance,avatarFramesOwned,betaEventState,roster}));
}
function restoreGateRewardState(before) {
    ({shardTotal,gold,breakthroughStones,towerMaterials,cultivationMaterials,highGradeExperienceCrystals,summonTicketSingle,summonTicketTen,bossWin,gateRecord,gateEnhance,avatarFramesOwned,betaEventState}=before);
    for(const [id,ch] of Object.entries(before.roster)) {roster[id].shards=ch.shards;roster[id].unlocked=ch.unlocked;}
}
function sendGateReply(frame,data) { frame.contentWindow.postMessage(data,GATE_TARGET); }
function receiveGateReward(d,frame) {
    const g=BOSS_STAGES.find(row=>row.id===d.gate),win=Math.max(0,Math.floor(+d.win)||0);
    if(!g||g.id!==gateBattleId||!win)return;
    const key=g.id+':'+win;
    if(win<=(gateReceipts.get(g.id)||0)) {sendGateReply(frame,{type:'wf-gate-reward-ack',gate:g.id,win,ok:true,fragment:gateRewardPlans.get(key)?.fragment||null});return;}
    if(win!==(bossWin[g.id]||0)+1)return;
    let plan=gateRewardPlans.get(key);
    if(!plan){
        const raw=d.drops&&typeof d.drops==='object'?d.drops:{},q=betaEventActive()?2:1,first=!(bossWin[g.id]||0);
        // 階級與等級都由母頁自己算：開窗時送進去的那一階才是權威，子頁貼上來的數字只當提示。
        const rule=GateEnhancement.rewardRule(GateEnhancement.levelForWins(bossWin[g.id]||0),gateBattleTier);
        const clear=GateEnhancement.previewClear(gateEnhance,g.id,rule.tier,rule.level);
        const drops={breakthrough:Math.max(1,Math.min(3*q,Math.floor(+raw.breakthrough)||0)),rainbow:Math.max(0,Math.min(3,Math.floor(+raw.rainbow)||0)),experience:10*q,highExperience:Math.max(1,Math.min(3*q,Math.floor(+raw.highExperience)||1)),singleTicket:Math.max(0,Math.min(1,Math.floor(+raw.singleTicket)||0)),tenTicket:Math.max(0,Math.min(1,Math.floor(+raw.tenTicket)||0)),expeditionMedal:Math.max(0,Math.min(q,Math.floor(+raw.expeditionMedal)||0)),bossMaterial:Math.max(0,Math.min(q,Math.floor(+raw.bossMaterial)||0))};
        const unowned=Object.keys(ELEMENTAL_AVATAR_FRAMES).filter(id=>!avatarFramesOwned.includes(id));
        const frameId=unowned.length&&Math.random()<.001?unowned[Math.floor(Math.random()*unowned.length)]:null;
        plan={first,tier:rule.tier,level:rule.level,shards:first?g.shards:0,gold:rule.gold,bonusStones:rule.stones,
            firstBreak:clear.firstBreak,unlockedTier:clear.unlocked,drops,frameId,
            fragmentId:rollGateFragment(g.el,rule.shardChance),
            ms:Math.max(0,Math.min(86400000,Math.floor(+d.ms)||0)),score:Math.max(0,Math.min(999999999,Math.floor(+d.score)||0)),saved:false};
        gateRewardPlans.set(key,plan); // 存檔重試沿用同一次抽取，不重新抽獎。
    }
    const before=captureGateRewardState(),{drops}=plan;
    try {
        bossWin[g.id]=win;recordBetaEventBattle();
        GateEnhancement.recordClear(gateEnhance,g.id,plan.tier,plan.level);
        // 首勝 50 只發一次；再戰與強化階級都只拿隨機 1～3 虹彩石，階級首破另外疊上去。
        shardTotal+=plan.shards+drops.rainbow+plan.firstBreak;
        gold=Math.min(9999999999,gold+plan.gold);
        // 基礎突破石吃封測加倍，階級額外的那幾顆不跟著加倍。
        breakthroughStones.fourStar+=drops.breakthrough+plan.bonusStones;
        towerMaterials.expeditionMedal+=drops.expeditionMedal;
        const material=({fire:'dragonWing',water:'shellfishTail',wind:'garudaBeak',thunder:'thunderCore'})[g.id];
        towerMaterials[material]+=drops.bossMaterial;
        cultivationMaterials+=drops.experience;highGradeExperienceCrystals+=drops.highExperience;
        summonTicketSingle+=drops.singleTicket;summonTicketTen+=drops.tenTicket;
        if(plan.frameId&&!avatarFramesOwned.includes(plan.frameId))avatarFramesOwned.push(plan.frameId);
        plan.fragment=grantGateFragment(plan.fragmentId,g.el);
        BattleSettlement.mergeRecord(gateRecord,g.id,plan.ms,plan.score);
        if(!saveGame())throw Error('獎勵尚未儲存，請點「重試儲存獎勵」。');
    } catch(error) {
        restoreGateRewardState(before);
        sendGateReply(frame,{type:'wf-gate-reward-ack',gate:g.id,win,ok:false,message:error.message});
        hmToast('Boss 獎勵儲存失敗，已還原，請在結算畫面重試。');return;
    }
    plan.saved=true;gateReceipts.set(g.id,win);
    sendGateReply(frame,{type:'wf-gate-reward-ack',gate:g.id,win,ok:true,fragment:plan.fragment,firstBreak:plan.firstBreak,unlockedTier:plan.unlockedTier});
    const fragment=plan.fragment?`、${plan.fragment.name}碎片 +1${plan.fragment.unlocked?'（已解鎖，未自動編隊）':''}`:'';
    const materialName=({fire:'赤焰龍的翅膀',water:'蒼溟貝的尾巴',wind:'金鷺鷲的鳥喙',thunder:'玄雷機的核心'})[g.id];
    const tierName=plan.tier?`（強化 +${plan.tier}）`:`（Lv.${plan.level}）`;
    log(`${plan.first?'🏆 首次擊破':'⚔️ 再度擊破'} ${g.gate}${tierName}：通關虹彩石 +${plan.shards}、額外虹彩石 +${drops.rainbow}${plan.firstBreak?'、階級首破 +'+plan.firstBreak:''}、限定突破石 +${drops.breakthrough}${plan.bonusStones?'（階級 +'+plan.bonusStones+'）':''}${plan.gold?'、金幣 +'+plan.gold.toLocaleString('en-US'):''}、經驗水晶 +${drops.experience}、高階經驗水晶 +${drops.highExperience}${drops.bossMaterial?'、'+materialName+' +'+drops.bossMaterial:''}${drops.expeditionMedal?'、境界遠征勳章 +'+drops.expeditionMedal:''}${drops.singleTicket?'、單抽招募券 +1':''}${drops.tenTicket?'、十抽招募券 +1':''}${plan.frameId?'、頭像框「'+ELEMENTAL_AVATAR_FRAMES[plan.frameId].name+'」':''}${fragment}。`);
    if(plan.unlockedTier)hmToast(`已解鎖 ${g.gate} 強化 +${plan.unlockedTier}！`);
    paintHome();if(homeTabOn==='boss')renderPage();
}
function receiveGateRetry(d,frame) {
    const g=BOSS_STAGES.find(row=>row.id===d.gate);
    if(!g||g.id!==gateBattleId||typeof d.requestId!=='string'||d.requestId.length>160)return;
    if(gateRetryResponses.has(d.requestId)){sendGateReply(frame,gateRetryResponses.get(d.requestId));return;}
    const win=Math.max(0,Math.floor(+d.win)||0),runId=typeof d.runId==='string'?d.runId.slice(0,120):'';
    // 結算後的再戰認勝場收據，戰鬥中／全滅的再戰認這一場的 runId；同一個鑰匙只扣一次體力。
    const settled=win>0&&win===gateReceipts.get(g.id),key=settled?g.id+':'+win:(runId?g.id+'#'+runId:'');
    let ok=false,message='本場獎勵尚未確認，或已啟動再戰。';
    if(key&&(settled||runId)&&!gateHasPendingReward()&&!gateRetryPaidRuns.has(key)) {
        ok=spendStamina(StaminaSystem.GATE_COST,g.gate+'再戰');
        if(ok)gateRetryPaidRuns.add(key);else message='體力不足或存檔失敗，未進行再戰。';
    }
    const response={type:'wf-gate-retry-response',gate:g.id,requestId:d.requestId,win,ok,message,stamina,staminaTickAt};
    gateRetryResponses.set(d.requestId,response);sendGateReply(frame,response);
}
function sendGateResultToParent(result) {
    gateLastResult=result;gateRewardSaved=false;
    const button=$('gate-retry-button');if(button)button.disabled=true;
    window.parent.postMessage(result,GATE_TARGET);
}
function retryGateRewardSave() { if(gateLastResult&&!gateRewardSaved)window.parent.postMessage(gateLastResult,GATE_TARGET); }
// 只有「 iframe 裡的四屬性 Boss 門」每一次重開都要付體力；訓練場、副本與母頁自己開的視窗都不收。
function gatePaidRun() { return !!GATE_MODE && !TRAINING_MODE && !DUNGEON_MODE && BOSS_STAGES.some(row => row.id === GATE.id); }
// 所有重開入口統一走這一條：先請母頁扣 15 體力，拿到確認才執行傳進來的重開動作。
function payGateRetry(action, win = 0) {
    const g=gateOf();
    if(!g||!gatePaidRun()){action();return;}
    if(window.parent===window){hmToast('請回到大廳重新進入這道關卡。');return;}
    if(gateRetryPending){hmToast('再戰確認中，請稍候。');return;}
    if(!GATE.runId)markGateRun();
    gateRetryPending=GATE.runId+':'+Date.now();gateRetryAction=action;
    for(const id of ['gate-retry-button','pf-over-retry']){const node=$(id);if(node)node.disabled=true;}
    window.parent.postMessage({type:'wf-gate-retry-request',gate:g.id,win,runId:GATE.runId,requestId:gateRetryPending},GATE_TARGET);
}
function gateRetry() {
    if(!gateOn()||!gatePaidRun()){restartGateBattleAfterPayment();return;}
    const settled=$('pf-result').classList.contains('on');
    if(settled&&(!gateRewardSaved||!gateLastResult||gateLastResult.win<=gateRetryConsumedWin)){hmToast('請先完成獎勵儲存，或等待再戰確認。');return;}
    payGateRetry(restartGateBattleAfterPayment,settled?gateLastResult.win:0);
}
addEventListener('message',event=>{
    if(!GATE_MODE||window.parent===window||event.source!==window.parent||(location.protocol!=='file:'&&event.origin!==location.origin))return;
    const d=event.data||{};
    if(d.gate!==GATE.id)return;
    if(d.type==='wf-gate-reward-ack'&&gateLastResult?.win===d.win) {
        gateRewardSaved=d.ok===true;
        const button=$('gate-retry-button');if(button){button.disabled=!gateRewardSaved;button.textContent='再挑戰一次（'+StaminaSystem.GATE_COST+' 體力）';}
        const status=$('gate-reward-status'),retry=$('gate-reward-save-retry');
        const unlocked=d.ok&&d.unlockedTier?`・已解鎖強化 +${d.unlockedTier}`:'';
        const firstBreak=d.ok&&d.firstBreak?`・階級首破虹彩石 +${d.firstBreak}`:'';
        if(status)status.textContent=d.ok?(d.fragment?`${d.fragment.name}碎片 ×1${d.fragment.unlocked?'・已解鎖，未自動編隊':''}・獎勵已儲存`:'獎勵已儲存')+firstBreak+unlocked:d.message;
        if(retry)retry.hidden=d.ok===true;
    } else if(d.type==='wf-gate-retry-response'&&gateRetryPending===d.requestId) {
        gateRetryPending=null;
        const button=$('gate-retry-button');if(button)button.disabled=!gateRewardSaved;
        const wipe=$('pf-over-retry');if(wipe)wipe.disabled=false;
        const action=gateRetryAction;gateRetryAction=null;
        if(!d.ok){hmToast(d.message);return;}
        if(d.win>0)gateRetryConsumedWin=d.win;
        stamina=d.stamina;staminaTickAt=d.staminaTickAt;
        (action||restartGateBattleAfterPayment)();
    }
});
