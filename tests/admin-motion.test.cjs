const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(reduce=false){
 const calls=[],events={},classes=new Set();let closes=0;
 const node={getClientRects:()=>[{}],animate(frames,options){let resolve,reject;const animation={finished:new Promise((ok,no)=>{resolve=ok;reject=no}),finish:()=>resolve(),cancel(){this.cancelled=true;reject(Error('interrupted'))}};calls.push({frames,options,animation});return animation}};
 const modal={...node,open:false,classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},showModal(){this.open=true},close(){this.open=false;closes++},querySelector:()=>node,addEventListener(){}};
 const root={dataset:{}},context={Promise,WeakMap,matchMedia:()=>({matches:reduce}),document:{documentElement:root,addEventListener:(name,handler)=>events[name]=handler},getComputedStyle:()=>({opacity:'.8',transform:'matrix(1,0,0,1,0,3)',getPropertyValue:()=> 'cubic-bezier(.23,1,.32,1)'}),$:()=>modal};
 const source=fs.readFileSync('dist/data/admin.js','utf8');vm.runInNewContext(source.slice(source.indexOf('// Retarget'),source.indexOf('const tableSorts=')),context);
 return {context,calls,events,node,modal,root,get closes(){return closes}};
}
test('interrupting an entrance retargets its current presentation and cancels the old animation',async()=>{
 const e=setup(),a=e.context.moveContent(e.node,{offset:8});const b=e.context.moveContent(e.node,{x:10});
 assert.equal(e.calls[0].animation.cancelled,true);assert.equal(e.calls[1].frames[0].opacity,'.8');assert.equal(e.calls[1].frames[0].transform,'matrix(1,0,0,1,0,3)');e.calls[1].animation.finish();await Promise.all([a,b]);
});
test('reduced motion fades without translation, scale, or stagger',async()=>{
 const e=setup(true),done=e.context.moveContent(e.node,{offset:8,scale:.98,delay:60});assert.equal(e.calls[0].frames[0].transform,'none');assert.equal(e.calls[0].frames[1].transform,'none');assert.equal(e.calls[0].options.delay,0);assert.equal(e.calls[0].options.duration,125);e.calls[0].animation.finish();await done;
});
test('keyboard shortcuts respond immediately while subsequent pointer actions retain motion',async()=>{
 const e=setup();e.events.keydown();await e.context.moveContent(e.node);assert.equal(e.calls.length,0);e.events.pointerdown();const done=e.context.moveContent(e.node);assert.equal(e.calls.length,1);e.calls[0].animation.finish();await done;
});
test('reopening details during exit cannot close the newly selected details',async()=>{
 const e=setup();e.context.showDetail();const closing=e.context.closeDetail();e.context.showDetail();await closing;assert.equal(e.modal.open,true);assert.equal(e.closes,0);e.calls.at(-1).animation.finish();
 const second=e.context.closeDetail();e.calls.at(-1).animation.finish();await second;assert.equal(e.modal.open,false);assert.equal(e.closes,1);
});
