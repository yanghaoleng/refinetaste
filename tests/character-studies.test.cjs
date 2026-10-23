const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(reduce=false){
 const changes={},events={},jobs=new Map();let next=0;
 const media={matches:reduce,addEventListener:(_,fn)=>changes.motion=fn};
 const document={hidden:false,addEventListener:(name,fn)=>events[name]=fn};
 class Image{constructor(){this.complete=true;this.naturalWidth=1536;this.naturalHeight=1024}}
 const scope={window:{},document,Image,matchMedia:()=>media,requestAnimationFrame:fn=>{jobs.set(++next,fn);return next},cancelAnimationFrame:id=>jobs.delete(id)};
 vm.runInNewContext(fs.readFileSync('dist/character-studies.js','utf8'),scope);
 return {api:scope.window.RefineCharacters,document,media,events,changes,jobs,step(now){const pending=[...jobs.values()];jobs.clear();pending.forEach(fn=>fn(now))}};
}
function fixture(){
 const buttons={};for(const key of ['play','replay','slow','rig','silhouette'])buttons['[data-character-'+key+']']={attrs:{'aria-pressed':'false'},setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]}};
 const scenes=['elastic','dense'].map(variant=>{
  const calls=[],ctx={calls};for(const op of ['clearRect','save','restore','scale','translate','rotate','fillRect','drawImage','fillText','beginPath','closePath','rect','clip','moveTo','lineTo','stroke','setLineDash'])ctx[op]=(...args)=>calls.push([op,...args]);
  const canvas={getContext:()=>ctx},classes=new Set();return {ctx,dataset:{characterScene:'ball',characterVariant:variant},classList:{contains:c=>classes.has(c),toggle(c,on){if(on)classes.add(c);else classes.delete(c)}},querySelector:s=>s==='.character-canvas'?canvas:null};
 });
 return {buttons,scenes,root:{querySelector:s=>s==='.character-study'?scenes[0]:s==='.character-structure'?null:buttons[s],querySelectorAll:s=>s==='[data-character-scene]'||s==='.character-study'?scenes:[]}};
}
test('all ten character studies use accessible bitmap canvases and actual raster assets, with no SVG or nested buttons',()=>{
 const e=setup(),course=JSON.parse(fs.readFileSync('dist/course.json','utf8')),qs=course.questions.filter(q=>q.chapter===7);
 assert.equal(qs.length,10);assert.equal(qs.filter(q=>q.kind==='choice').length,6);assert.equal(qs.filter(q=>q.kind==='open').length,4);
 for(const q of qs)for(const v of q.visuals){const html=e.api.render(v);assert.match(html,/<canvas[^>]*role="img"/);assert.ok(html.includes(v.title));assert.doesNotMatch(html,/<button|<svg|<script/);assert.ok(v.description.length>10)}
 assert.match(e.api.render({...qs[0].visuals[0],title:'<script>alert(1)</script>'}),/&lt;script&gt;/);
 for(const name of ['motion','studies','ball']){const asset=fs.readFileSync('dist/assets/characters/pixel-'+name+'.webp');assert.equal(asset.toString('ascii',0,4),'RIFF');assert.equal(asset.toString('ascii',8,12),'WEBP')}
});
test('paired ball clips keep identical first falls and volume, then express different rebound height',()=>{
 const {api}=setup();for(const t of [0,.1,.2,.279])assert.equal(api.sample('ball','elastic',t).ballY,api.sample('ball','dense',t).ballY);
 for(const t of [.29,.31,.33]){const p=api.sample('ball','elastic',t);assert.ok(Math.abs(p.ballX*p.ballScaleY-1)<1e-9)}
 assert.ok(api.sample('ball','elastic',.48).ballY<api.sample('ball','dense',.48).ballY);
 for(const variant of ['prepared','translated']){assert.equal(api.sample('jump',variant,0).x,80);assert.equal(api.sample('jump',variant,.9).x,310)}
 assert.equal(api.tileAt('jump','prepared',.15),13);assert.equal(api.tileAt('jump','translated',.15),12);
 assert.notEqual(api.tileAt('stop','follow',.5),api.tileAt('stop','locked',.5));
});
test('one animation clock drives both bitmaps, pauses, replays, slows, and stops when disposed or hidden',()=>{
 const e=setup(),f=fixture();e.api.mount(f.root);assert.equal(e.jobs.size,1);e.step(1000);e.step(1800);
 const y=s=>s.ctx.calls.filter(c=>c[0]==='translate').at(-1)[2];assert.equal(y(f.scenes[0]),y(f.scenes[1]));
 f.buttons['[data-character-play]'].onclick();assert.equal(e.jobs.size,0);
 f.buttons['[data-character-slow]'].onclick();assert.equal(f.buttons['[data-character-slow]'].attrs['aria-pressed'],'true');
 f.buttons['[data-character-replay]'].onclick();assert.equal(y(f.scenes[0]),78);assert.equal(e.jobs.size,1);e.step(2000);e.step(2800);
 assert.equal(y(f.scenes[0]),e.api.sample('ball','elastic',.125).ballY);
 e.document.hidden=true;e.events.visibilitychange();assert.equal(e.jobs.size,0);
 f.buttons['[data-character-play]'].onclick();assert.equal(e.jobs.size,1);e.api.dispose();assert.equal(e.jobs.size,0);
});
test('reduced motion opens with a still pose and preference changes pause and reset the timeline',()=>{
 const e=setup(true),f=fixture();e.api.mount(f.root);assert.equal(e.jobs.size,0);
 f.buttons['[data-character-play]'].onclick();assert.equal(e.jobs.size,1);e.step(0);e.step(800);
 e.changes.motion();assert.equal(e.jobs.size,0);assert.equal(f.scenes[0].ctx.calls.filter(c=>c[0]==='translate').at(-1)[2],78);
});
