// Existing Supabase Realtime Presence; ephemeral membership, no database or save fields.
window.OnlinePresence = (() => {
    let channel=null, key='', ready=false, synced=false, busy=false, generation=0;
    const label=()=>document.getElementById('hm-online-count');
    const show=value=>{const n=label();if(n)n.textContent='🟢 在線：'+(value===null?'--':value+' 人');};
    function count(state,now=Date.now()) {
        return Object.values(state).filter(entries=>entries.some(p=>p.account===true && Number.isFinite(p.seenAt) && now-p.seenAt<90000 && p.seenAt<=now+30000)).length;
    }
    function paint(){show(ready&&synced?count(channel.presenceState()):null);}
    async function stop(){generation++;ready=false;synced=false;const old=channel;channel=null;key='';show(null);if(old){try{await SupabaseCloud.removePresence(old);}catch(_){}}}
    async function tick(){
        if(busy)return;busy=true;
        try{
            if(window.parent!==window || !SupabaseCloud.available || !navigator.onLine){await stop();return;}
            const session=await SupabaseCloud.getSession(), next=session?.user?.id || '';
            if(!next){await stop();return;}
            if(next!==key || !channel){
                await stop();key=next;const token=generation;
                channel=SupabaseCloud.presenceChannel(next);
                channel.on('presence',{event:'sync'},()=>{if(token!==generation)return;synced=true;paint();});
                channel.subscribe(async status=>{
                    if(token!==generation)return;
                    ready=status==='SUBSCRIBED';
                    if(ready){const result=await channel.track({account:true,seenAt:Date.now()});if(token!==generation)return;if(result!=='ok')ready=false;}
                    else synced=false;
                    paint();
                });
            }else if(ready){const token=generation;const result=await channel.track({account:true,seenAt:Date.now()});if(token!==generation)return;if(result!=='ok'){ready=false;synced=false;}}
            paint();
        }catch(_){await stop();}finally{busy=false;}
    }
    addEventListener('DOMContentLoaded',tick);
    setInterval(tick,30000);
    addEventListener('online',tick);addEventListener('offline',stop);
    addEventListener('pagehide',stop);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
    return Object.freeze({count,tick,stop});
})();
