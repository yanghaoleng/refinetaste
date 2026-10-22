const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function setup(reduced=false){
 const frames=new Map(),events=new Map(),rowEvents=new Map();let id=0,draws=0,lines=[];
 const ctx={setTransform(){},scale(){},beginPath(){},moveTo(x,y){lines.push([x,y])},lineTo(x,y){lines.push([x,y])},stroke(){draws++},arc(){},fill(){draws++},clearRect(){lines=[]},drawImage(){}};
 const dialog={open:true},row={addEventListener:(name,fn)=>rowEvents.set(name,fn),removeEventListener:name=>rowEvents.delete(name),contains:()=>false};
 const canvas={dataset:{particleChapter:'1'},isConnected:true,getContext:()=>ctx,getBoundingClientRect:()=>({width:130,height:125}),closest:selector=>selector==='dialog'?dialog:row};
 const document={hidden:false,documentElement:{},querySelector:()=>dialog,createElement:()=>({getContext:()=>ctx}),addEventListener:(name,fn)=>events.set(name,fn)};
 const Observer=class{observe(){}disconnect(){}};
 const context={window:{},document,matchMedia:()=>({matches:reduced,addEventListener(){}}),devicePixelRatio:3,getComputedStyle:()=>({color:'#fff'}),performance:{now:()=>0},requestAnimationFrame:fn=>{frames.set(++id,fn);return id},cancelAnimationFrame:n=>frames.delete(n),IntersectionObserver:Observer,ResizeObserver:Observer,MutationObserver:Observer};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/chapter-particles.js'),'utf8'),context);
 return {api:context.window.RefineParticles,root:{querySelectorAll:()=>[canvas]},frames,events,rowEvents,document,canvas,get draws(){return draws},get lines(){return lines},step(time){const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(time))}};
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

test('hover and focus restore the front drawing; leaving resumes spatial rotation without a jump',()=>{const reference=setup(true);reference.api.mount(reference.root);const target=reference.lines.flat();const e=setup();e.api.mount(e.root);const idle=e.lines.flat();assert.notDeepEqual(idle,target);e.rowEvents.get('focusin')();for(let t=40;t<2400;t+=40)e.step(t);const front=e.lines.flat();assert.equal(front.length,target.length);const error=front.reduce((sum,v,i)=>sum+Math.abs(v-target[i]),0)/front.length;assert.ok(error<.05);e.rowEvents.get('focusout')({relatedTarget:null});for(let t=2400;t<4000;t+=40)e.step(t);assert.notDeepEqual(e.lines.flat(),front);e.api.dispose();reference.api.dispose()});
