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
function designRoot(){
  const root=element(),focus={};root.addEventListener=(name,handler)=>focus[name]=handler;root.focus=()=>focus.focusin?.();
  const scheduled=[];
  function piece(name){const el=element();el.animate=(frames,options)=>{let done;const animation={finished:new Promise(r=>done=r),completed:false,finish(){this.completed=true;done()},cancel(){done()}};scheduled.push({name,frames,options,animation});return animation};return el}
  root.children=['A','B'].map(name=>{const card=piece(name);card.matches=()=>true;const parts=[piece(name+'-title'),piece(name+'-body'),piece(name+'-contact')];card.querySelectorAll=()=>parts;return card});
  return {root,scheduled,piece};
}
test('designs assemble A completely before B, and focus reveals the finished comparison',()=>{
  const motion=setup(false),{root,scheduled}=designRoot();motion.assembleDesign(root);
  const first=scheduled.filter(job=>job.name.startsWith('A'));
  const second=scheduled.filter(job=>job.name.startsWith('B'));
  assert.ok(second[0].options.delay>Math.max(...first.map(job=>job.options.delay+job.options.duration)));
  assert.ok(first[1].options.delay>first[0].options.delay);
  assert.ok(first[2].options.delay>first[1].options.delay);
  assert.equal(scheduled.every(job=>job.animation.completed),false);
  root.focus();assert.ok(scheduled.every(job=>job.animation.completed));
});
test('reduced motion shows both finished designs without delayed animations',()=>{
  const motion=setup(true),{root,scheduled}=designRoot();motion.assembleDesign(root);
  assert.equal(scheduled.length,0);assert.ok(root.attributes.has('data-design-build'));
});

test('question title and brief appear together after completed options',()=>{
  const motion=setup(false),{root,scheduled,piece}=designRoot(),heading=element();
  const title=piece('title'),brief=piece('brief'),bookmark=piece('bookmark');
  heading.querySelector=selector=>({'h2':title,'p':brief,'.bookmark':bookmark}[selector]);
  motion.assembleDesign(root,heading);
  const designs=scheduled.filter(job=>/^[AB]/.test(job.name));
  const titleJob=scheduled.find(job=>job.name==='title'),briefJob=scheduled.find(job=>job.name==='brief');
  assert.ok(titleJob.options.delay>Math.max(...designs.map(job=>job.options.delay+job.options.duration)));
  assert.equal(briefJob.options.delay,titleJob.options.delay);
  assert.ok(heading.attributes.has('data-design-build'));
  root.focus();assert.ok(scheduled.every(job=>job.animation.completed));
});
