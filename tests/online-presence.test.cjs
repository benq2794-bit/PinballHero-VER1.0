const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
(async()=>{
 let sync,sub,removed=0,online=true,session={user:{id:'same-account'}},state={},tracks=0,interval;
 const text={textContent:''},channel={on(t,f,cb){sync=cb;return this},subscribe(cb){sub=cb;return this},presenceState:()=>state,async track(p){tracks++;state={'same-account':[{...p},{...p}]};sync();return 'ok'}};
 const c={window:null,document:{getElementById:()=>text,addEventListener(){},hidden:false},navigator:{get onLine(){return online}},SupabaseCloud:{available:true,getSession:async()=>session,presenceChannel:k=>{assert.equal(k,'same-account');return channel},removePresence:async()=>removed++},addEventListener(){},setInterval:(fn,ms)=>{interval=ms},Date,console};c.window=c;c.parent=c;vm.createContext(c);vm.runInContext(fs.readFileSync('asset/online-presence.js','utf8'),c);const api=c.OnlinePresence;
 assert.equal(interval,30000);await api.tick();await sub('SUBSCRIBED');assert.equal(text.textContent,'🟢 在線：1 人');assert.equal(tracks,1);
 state.b=[{account:true,seenAt:Date.now()-90001}];state.c=[{account:false,seenAt:Date.now()}];assert.equal(api.count(state),1,'same account deduplication and expired memberships');
 await sub('CHANNEL_ERROR');assert.equal(text.textContent,'🟢 在線：--');online=false;await api.tick();assert.equal(text.textContent,'🟢 在線：--');assert.equal(removed,1);
 online=true;session=null;await api.tick();assert.equal(text.textContent,'🟢 在線：--');
 console.log('PASS: real presence-state counting, same-account dedupe, 90-second expiry, 30-second heartbeat, disconnected/error/guest --');
})().catch(e=>{console.error(e);process.exitCode=1});
