const test=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
function setup(reduced){
  const media={matches:reduced,addEventListener(){}};
  const context={matchMedia:()=>media,window:{},document:{readyState:'loading',addEventListener(){}},getComputedStyle:()=>({transform:'none'}),Set,WeakSet,WeakMap,Promise};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/motion.js'),'utf8'),context);
  return context.window.RefineMotion;
}
function element(){
  const jobs=[];let closed=0;const attributes=new Map();
  return {open:true,hidden:false,jobs,attributes,matches:()=>false,querySelectorAll:()=>[],classList:{add(){},remove(){}},setAttribute:(k,v)=>attributes.set(k,v),removeAttribute:k=>attributes.delete(k),close(){closed++;this.open=false},get closed(){return closed},animate(){let resolve;const finished=new Promise(r=>resolve=r);const a={finished,cancel(){resolve()},finish(){resolve()}};jobs.push(a);return a}};
}
test('reduced motion swaps and closes immediately without creating animations',async()=>{
  const motion=setup(true),el=element();let updated=0;
  await motion.swap(el,()=>updated++);assert.equal(updated,1);assert.equal(el.jobs.length,0);
  await motion.closeDialog(el);assert.equal(el.closed,1);assert.equal(el.jobs.length,0);
});
test('rapid Next activation updates once and clears busy state after exit',async()=>{
  const motion=setup(false),el=element();let updated=0;
  const first=motion.swap(el,()=>updated++),second=motion.swap(el,()=>updated++);
  assert.equal(first,second);assert.equal(updated,0);assert.equal(el.attributes.get('aria-busy'),'true');
  el.jobs[0].finish();await first;assert.equal(updated,1);assert.equal(el.attributes.has('aria-busy'),false);
});
test('repeated close waits for exit and only closes the dialog once',async()=>{
  const motion=setup(false),el=element();const first=motion.closeDialog(el),second=motion.closeDialog(el);
  assert.equal(first,second);assert.equal(el.closed,0);el.jobs[0].finish();await first;
  assert.equal(el.closed,1);assert.equal(el.open,false);
});
