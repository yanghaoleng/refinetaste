const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(qa=false){
 const calls=[],local=new Map(),session=new Map();let id=0;
 const storage=map=>({getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)});
 const ctx={window:{},URLSearchParams,location:{search:qa?'?qa=1':'',pathname:'/refinetaste/'},localStorage:storage(local),sessionStorage:storage(session),crypto:{randomUUID:()=>`00000000-0000-4000-8000-${String(++id).padStart(12,'0')}`},fetch:async(url,o)=>{calls.push({url,body:JSON.parse(o.body)});return {ok:true,status:204}},setTimeout,Promise};
 vm.runInNewContext(fs.readFileSync('dist/analytics.js','utf8'),ctx);
 return {metrics:ctx.window.RefineMetrics,calls,flush:()=>new Promise(resolve=>setTimeout(resolve,15))};
}
test('submitted conversations retain all messages beyond model context and deduplicate the notebook sync',async()=>{
 const {metrics,calls,flush}=setup(),q={id:6,kind:'open',variantId:'base',optionOrder:[0,1],contextKey:'base:01'};
 const messages=Array.from({length:25},(_,i)=>({role:i%2?'assistant':'user',content:'原文 '+i}));
 metrics.start(0);metrics.conversation(q,messages);metrics.conversation(q,messages);await flush();
 const records=calls.filter(c=>c.url.endsWith('/conversation'));
 assert.equal(records.length,25);assert.equal(records[0].body.messages[0].content,'原文 0');assert.equal(records[24].body.messages[0].content,'原文 24');
 assert.equal(new Set(records.map(r=>r.body.messages[0].id)).size,25);
 assert.equal(metrics.tracking(q).thread,records[0].body.thread);
 assert.ok(calls.some(c=>c.body.kind==='start'));
});
test('QA mode excludes events and conversation text and drafts do not create records',async()=>{
 const qa=setup(true);qa.metrics.start(0);qa.metrics.conversation({id:6},[{role:'user',content:'测试'}]);await qa.flush();assert.equal(qa.calls.length,0);assert.equal(qa.metrics.tracking({id:6}),null);
 const normal=setup();normal.metrics.conversation({id:6},[{role:'assistant',content:'尚未作答'}]);await normal.flush();assert.equal(normal.calls.filter(c=>c.url.endsWith('/conversation')).length,0);
});
