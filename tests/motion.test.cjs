const test=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
function setup(reduced,visualViewport=null){
  const media={matches:reduced,addEventListener(){}};
  const context={matchMedia:()=>media,window:{visualViewport},document:{readyState:'loading',addEventListener(){}},getComputedStyle:()=>({transform:'none'}),Set,WeakSet,WeakMap,Promise};
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
test('each option assembles its elements in order before the next option enters',()=>{
  const motion=setup(false),{root,scheduled}=designRoot();motion.assembleDesign(root);
  const a=scheduled.filter(job=>job.name.startsWith('A')),b=scheduled.filter(job=>job.name.startsWith('B'));
  assert.equal(a.length,4);assert.equal(b.length,4);
  assert.ok(a[1].options.delay>a[0].options.delay);
  assert.ok(a[2].options.delay>a[1].options.delay);
  assert.ok(a[3].options.delay>a[2].options.delay);
  assert.ok(b[0].options.delay>Math.max(...a.map(job=>job.options.delay+job.options.duration)));
  root.focus();assert.ok(scheduled.every(job=>job.animation.completed));
});
test('reduced motion shows both finished designs without delayed animations',()=>{
  const motion=setup(true),{root,scheduled}=designRoot();motion.assembleDesign(root);
  assert.equal(scheduled.length,0);assert.ok(root.attributes.has('data-design-build'));
});

test('the coach question appears before both complete design messages',()=>{
  const motion=setup(false),{root,scheduled,piece}=designRoot(),heading=piece('question');
  const title=piece('title'),brief=piece('brief');
  heading.querySelector=selector=>({'h2':title,'p':brief}[selector]);
  motion.assembleDesign(root,heading);
  const question=scheduled.find(job=>job.name==='question'),a=scheduled.find(job=>job.name==='A'),b=scheduled.find(job=>job.name==='B');
  assert.ok(a.options.delay>question.options.delay+question.options.duration);
  assert.ok(b.options.delay>a.options.delay+a.options.duration);
  assert.ok(heading.attributes.has('data-design-build'));
  root.focus();assert.ok(scheduled.every(job=>job.animation.completed));
});

test('feedback waits for the actual verdict animation and reduced motion skips the wait',async()=>{
  const motion=setup(false),el=element();el.animate();el.animate();el.getAnimations=()=>el.jobs;
  let complete=false;const waiting=motion.afterAnimations(el).then(()=>complete=true);
  el.jobs[0].finish();await Promise.resolve();assert.equal(complete,false);
  el.jobs[1].finish();await waiting;assert.equal(complete,true);
  await setup(true).afterAnimations({getAnimations(){throw Error('should not query animations')}});
});
test('conversation scrolling keeps the composer above bottom controls and accounts for the keyboard viewport',()=>{
  const calls=[],container={scrollTop:0,scrollHeight:2600,clientHeight:844,getBoundingClientRect:()=>({top:0,bottom:844}),scrollTo:options=>calls.push(options)};
  const discussion={getBoundingClientRect:()=>({top:900,bottom:1200,height:300})},chrome={getBoundingClientRect:()=>({bottom:60})},controls={getBoundingClientRect:()=>({top:760})};
  setup(false).scrollConversation(container,discussion,chrome,controls);
  assert.equal(calls[0].top,460);assert.equal(calls[0].behavior,'smooth');
  setup(true,{offsetTop:0,height:500}).scrollConversation(container,discussion,chrome,controls);
  assert.equal(calls[1].top,720);assert.equal(calls[1].behavior,'auto');
  discussion.getBoundingClientRect=()=>({top:100,bottom:400,height:300});
  setup(false).scrollConversation(container,discussion,chrome,controls);assert.equal(calls.length,2);
});
test('question title, background, and task finish in sequence before the designs enter',()=>{
 const motion=setup(false),{root,scheduled,piece}=designRoot(),heading=piece('question');const title=piece('title'),brief=piece('brief'),task=piece('task');heading.querySelector=s=>({'h2':title,'p':brief,'.question-task':task}[s]);motion.assembleDesign(root,heading);const a=scheduled.find(j=>j.name==='A'),t=scheduled.find(j=>j.name==='title'),b=scheduled.find(j=>j.name==='brief'),p=scheduled.find(j=>j.name==='task');assert.ok(b.options.delay>t.options.delay+t.options.duration);assert.ok(p.options.delay>b.options.delay+b.options.duration);assert.ok(a.options.delay>p.options.delay+p.options.duration);
});
