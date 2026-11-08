// Developer-managed batches only. Append a new unique ID explicitly; never generate one
// from GAME_RELEASE, version.json, build time, dates at runtime, login or deployment.
window.UPDATE_COMPENSATION_BATCHES = Object.freeze([
    Object.freeze({ id:'update-compensation-20261108-01', name:'版本更新補償' })
]);
window.UPDATE_COMPENSATION_REWARDS = Object.freeze([
    Object.freeze({key:'shardTotal', name:'虹彩石', amount:100, icon:'asset/items/crystal.png', cap:99999999}),
    Object.freeze({key:'gold', name:'金幣', amount:10000, icon:'asset/items/gold-coin.svg', cap:9999999999}),
    Object.freeze({key:'summonTicketSingle', name:'單抽招募券（限定招募）', amount:1, icon:'asset/items/summon-ticket-single.svg', cap:999999}),
    Object.freeze({key:'cultivationMaterials', name:'經驗水晶', amount:100, icon:'asset/items/experience-crystal.png', cap:999999}),
    Object.freeze({key:'highGradeExperienceCrystals', name:'高階經驗水晶', amount:10, icon:'asset/items/high-grade-experience-crystal.png', cap:999999})
]);
let updateCompensationBusy = false;
function pendingUpdateCompensations() {
    return UPDATE_COMPENSATION_BATCHES.filter((batch,index,all) => batch.id &&
        all.findIndex(b=>b.id===batch.id)===index && !updateCompensationClaims.includes(batch.id));
}
function paintUpdateCompensationEntry() {
    const button=document.getElementById('hm-update-compensation');
    if(button)button.hidden=!!GATE_MODE || !pendingUpdateCompensations().length;
}
function openUpdateCompensation() {
    if(GATE_MODE)return;
    const batch=pendingUpdateCompensations()[0];
    if(!batch){paintUpdateCompensationEntry();return;}
    let dialog=document.getElementById('update-compensation-dialog');
    if(!dialog){dialog=document.createElement('dialog');dialog.id='update-compensation-dialog';dialog.setAttribute('aria-labelledby','update-compensation-title');document.body.appendChild(dialog);}
    // Batch names and IDs are assigned with textContent/dataset, not interpolated into handlers.
    dialog.innerHTML='<header><small>ADVENTURER APPRECIATION</small><h2 id="update-compensation-title">🎁 更新補償</h2></header><p class="compensation-name"></p><div class="compensation-rewards"></div><p class="compensation-message" role="status">每批補償限領一次，請手動領取。</p><footer><button type="button" class="compensation-close">稍後領取</button><button type="button" class="compensation-claim">領取補償</button></footer>';
    dialog.querySelector('.compensation-name').textContent=batch.name;
    const list=dialog.querySelector('.compensation-rewards');
    for(const reward of UPDATE_COMPENSATION_REWARDS){const row=document.createElement('div'),img=document.createElement('img'),name=document.createElement('span'),amount=document.createElement('b');img.src=reward.icon;img.alt='';name.textContent=reward.name;amount.textContent='×'+reward.amount.toLocaleString('zh-TW');row.append(img,name,amount);list.appendChild(row);}
    dialog.querySelector('.compensation-close').onclick=()=>dialog.close();
    dialog.querySelector('.compensation-claim').onclick=()=>claimUpdateCompensation(batch.id);
    if(!dialog.open)dialog.showModal();
}
async function claimUpdateCompensation(id) {
    if(updateCompensationBusy || GATE_MODE || !pendingUpdateCompensations().some(b=>b.id===id))return false;
    updateCompensationBusy=true;
    const dialog=document.getElementById('update-compensation-dialog'),button=dialog?.querySelector('.compensation-claim');
    const message=text=>{const node=dialog?.querySelector('.compensation-message');if(node)node.textContent=text;else hmToast(text);};
    if(button)button.disabled=true;
    const accountId=cloudUser?.id || null;
    const execute=async()=>{
        if((cloudUser?.id || null)!==accountId){message('帳號已切換，請重新開啟補償介面。');return false;}
        if(accountId){
            if(!cloudSaveReady){message('雲端存檔同步中，請稍後再領取。');return false;}
            try{
                const remote=await SupabaseCloud.readSave(accountId);
                if((cloudUser?.id || null)!==accountId){message('帳號已切換，請重新開啟補償介面。');return false;}
                const remoteClaims=remote?.save_data?.updateCompensationClaims || [];
                if(JSON.stringify([...new Set(remoteClaims)].sort())!==JSON.stringify([...updateCompensationClaims].sort())){
                    message('雲端補償紀錄已更新，請重新登入同步後再查看。');return false;
                }
            }catch(_){message('無法確認雲端領取紀錄，尚未發獎，請稍後重試。');return false;}
        }
        // Follow the existing event reward lock and stale-tab check. Refuse to overwrite
        // claims changed by a different tab; a reload restores its resources and receipt together.
        const saved=saveStore.read();
        if(!saved.ok){message('無法讀取存檔，尚未發放補償，請稍後重試。');return false;}
        const stored=Array.isArray(saved.data?.updateCompensationClaims)?saved.data.updateCompensationClaims:[];
        if(JSON.stringify([...new Set(stored)].sort())!==JSON.stringify([...updateCompensationClaims].sort())){
            message('補償紀錄已在其他頁面更新，請重新載入後再查看。');return false;
        }
        if(updateCompensationClaims.includes(id))return false;
        const before={shardTotal,gold,summonTicketSingle,cultivationMaterials,highGradeExperienceCrystals,claims:updateCompensationClaims};
        // Preserve existing resource caps; do not silently consume a batch while discarding its reward.
        if(UPDATE_COMPENSATION_REWARDS.some(r=>before[r.key]+r.amount>r.cap)){
            message('部分資源即將超過持有上限，請先使用資源再領取；補償仍會保留。');return false;
        }
        try{
            shardTotal+=100;gold+=10000;summonTicketSingle+=1;cultivationMaterials+=100;highGradeExperienceCrystals+=10;
            updateCompensationClaims=[...before.claims,id];
            if(!saveGame())throw Error('儲存失敗，補償尚未領取，請重試。');
        }catch(error){
            ({shardTotal,gold,summonTicketSingle,cultivationMaterials,highGradeExperienceCrystals}=before);
            updateCompensationClaims=before.claims;message(error.message);return false;
        }
        dialog?.close();paintUpdateCompensationEntry();paintHome();hmToast('更新補償已領取，感謝你的支持！');return true;
    };
    try{return navigator.locks ? await navigator.locks.request('pinball-update-compensation-rewards',execute) : await execute();}
    finally{updateCompensationBusy=false;if(button)button.disabled=false;}
}
