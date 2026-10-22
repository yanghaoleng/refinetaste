const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function setup(reduced=false){
 const frames=new Map(),events=new Map(),rowEvents=new Map();let id=0,draws=0;
 const ctx={setTransform(){},scale(){},beginPath(){},moveTo(){},arc(){},fill(){draws++},clearRect(){},drawImage(){}};
 const dialog={open:true},row={addEventListener:(name,fn)=>rowEvents.set(name,fn),removeEventListener:name=>rowEvents.delete(name)};
 const canvas={dataset:{particleChapter:'1'},isConnected:true,getContext:()=>ctx,getBoundingClientRect:()=>({width:130,height:125}),closest:selector=>selector==='dialog'?dialog:row};
 const document={hidden:false,documentElement:{},querySelector:()=>dialog,createElement:()=>({getContext:()=>ctx}),addEventListener:(name,fn)=>events.set(name,fn)};
 const Observer=class{observe(){}disconnect(){}};
 const context={window:{},document,matchMedia:()=>({matches:reduced,addEventListener(){}}),devicePixelRatio:3,getComputedStyle:()=>({color:'#fff'}),performance:{now:()=>0},requestAnimationFrame:fn=>{frames.set(++id,fn);return id},cancelAnimationFrame:n=>frames.delete(n),IntersectionObserver:Observer,ResizeObserver:Observer,MutationObserver:Observer};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/chapter-particles.js'),'utf8'),context);
 return {api:context.window.RefineParticles,root:{querySelectorAll:()=>[canvas]},frames,events,rowEvents,document,canvas,get draws(){return draws}};
}
test('particle menus stop work when hidden or disposed and cap retina resolution',()=>{
 const env=setup();env.api.mount(env.root);assert.equal(env.frames.size,1);assert.equal(env.canvas.width,260);assert.equal(env.canvas.height,250);
 env.document.hidden=true;env.events.get('visibilitychange')();assert.equal(env.frames.size,0);
 env.document.hidden=false;env.events.get('visibilitychange')();assert.equal(env.frames.size,1);
 env.api.dispose();assert.equal(env.frames.size,0);assert.equal(env.rowEvents.size,0);
});
test('reduced motion draws the full particle geometry without a perpetual loop',()=>{
 const env=setup(true);env.api.mount(env.root);assert.ok(env.draws>0);assert.equal(env.frames.size,0);env.api.dispose();
});
