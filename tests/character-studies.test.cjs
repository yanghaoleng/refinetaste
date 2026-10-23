const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(reduce=false){
 const changes={},events={},jobs=new Map(),renders=[];let next=0;
 const media={matches:reduce,addEventListener:(_,fn)=>changes.motion=fn},document={hidden:false,addEventListener:(name,fn)=>events[name]=fn};
 class Image{constructor(){this.complete=true;this.naturalWidth=896;this.naturalHeight=448}}
 const scope={window:{RefineMotionModels:{draw:(ctx,scene,variant,t,options)=>renders.push({ctx,scene,variant,t,options})}},document,Image,matchMedia:()=>media,requestAnimationFrame:fn=>{jobs.set(++next,fn);return next},cancelAnimationFrame:id=>jobs.delete(id)};
 vm.runInNewContext(fs.readFileSync('dist/character-studies.js','utf8'),scope);
 return {api:scope.window.RefineCharacters,document,media,events,changes,jobs,renders,step(now){const pending=[...jobs.values()];jobs.clear();pending.forEach(fn=>fn(now))}};
}
function fixture(){
 const buttons={};for(const key of ['play','replay','slow','rig','silhouette','trace','step','back','seek','frame'])buttons['[data-character-'+key+']']={value:0,attrs:{'aria-pressed':'false'},setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]}};
 const scenes=['elastic','dense'].map(variant=>{
  const ctx={clearRect(){},save(){},restore(){},scale(){}},canvas={width:640,height:544,getContext:()=>ctx},classes=new Set();return {ctx,dataset:{characterScene:'ball',characterVariant:variant},classList:{contains:c=>classes.has(c),toggle(c,on){if(on)classes.add(c);else classes.delete(c)}},querySelector:s=>s==='.character-canvas'?canvas:null};
 });
 return {buttons,scenes,root:{querySelector:s=>s==='.character-study'?scenes[0]:s==='.character-structure'?null:buttons[s],querySelectorAll:s=>s==='[data-character-scene]'||s==='.character-study'?scenes:[]}};
}
test('fourteen studies expose accessible canvases; object motion never uses a bitmap sprite',()=>{
 const {api}=setup(),qs=JSON.parse(fs.readFileSync('dist/course.json','utf8')).questions.filter(q=>q.chapter===7);
 assert.equal(qs.length,14);assert.equal(qs.filter(q=>q.kind==='choice').length,9);assert.equal(qs.filter(q=>q.kind==='open').length,5);
 for(const q of qs)for(const v of q.visuals){const html=api.render(v);assert.match(html,/<canvas[^>]*role="img"/);assert.doesNotMatch(html,/<button|<svg|<script/);assert.ok(v.description.length>10);if(!['silhouette','turnaround'].includes(v.scene))assert.match(html,/character-model/)}
 assert.match(api.render({...qs[0].visuals[0],title:'<script>x</script>'}),/&lt;script&gt;/);
 assert.match(api.controls(qs[4].visuals),/前进一帧/);assert.match(api.controls(qs[4].visuals),/data-character-trace/);
});
test('paired models share one clock, pause, replay, slow, and dispose all animation work',()=>{
 const e=setup(),f=fixture();e.api.mount(f.root);assert.equal(e.jobs.size,1);e.step(1000);e.step(1800);
 assert.deepEqual(e.renders.slice(-2).map(r=>r.t),[.25,.25]);
 f.buttons['[data-character-play]'].onclick();assert.equal(e.jobs.size,0);
 f.buttons['[data-character-slow]'].onclick();f.buttons['[data-character-replay]'].onclick();assert.equal(e.renders.at(-1).t,0);e.step(2000);e.step(2800);assert.equal(e.renders.at(-1).t,.125);
 e.document.hidden=true;e.events.visibilitychange();assert.equal(e.jobs.size,0);f.buttons['[data-character-play]'].onclick();e.api.dispose();assert.equal(e.jobs.size,0);
});
test('single-frame controls and scrubbing pause both models, reach the final frame, and toggle trajectory together',()=>{
 const e=setup(),f=fixture();e.api.mount(f.root);f.buttons['[data-character-step]'].onclick();assert.equal(e.jobs.size,0);assert.ok(Math.abs(e.renders.at(-1).t-1/96)<1e-12);
 f.buttons['[data-character-back]'].onclick();assert.equal(e.renders.at(-1).t,0);
 f.buttons['[data-character-seek]'].value=96;f.buttons['[data-character-seek]'].oninput();assert.equal(e.renders.at(-1).t,1);assert.equal(f.buttons['[data-character-frame]'].textContent,'96 / 96 帧');
 f.buttons['[data-character-trace]'].onclick();assert.ok(e.renders.slice(-2).every(r=>r.options.trace));
});
test('reduced motion opens still and a preference change pauses and resets the timeline',()=>{
 const e=setup(true),f=fixture();e.api.mount(f.root);assert.equal(e.jobs.size,0);f.buttons['[data-character-play]'].onclick();e.step(0);e.step(800);e.changes.motion();assert.equal(e.jobs.size,0);assert.equal(e.renders.at(-1).t,0);
});
