const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(reduced=false){
 let now=0,serial=0;const frames=new Map(),anchors=[],media={matches:reduced,addEventListener(_,fn){this.change=fn}};
 const rect=(left,top,width=54)=>({left,top,width,height:width,bottom:top+width});
 function element(cls='',position=rect(0,0)){
  const el={className:cls,children:[],isConnected:true,style:{setProperty(k,v){this[k]=v}},position,
   getBoundingClientRect(){
    if(this===avatar&&this.parentElement){const p=this.parentElement;if(p.className==='coach-flight'){const n=p.style.transform.match(/-?[\d.]+/g).map(Number);return {...rect(n[0],n[1],54*n[2]),height:54*n[3]}}return p.getBoundingClientRect()}
    return this.position;
   },
   append(node){node.remove();node.isConnected=true;this.children.push(node);node.parentElement=this},
   prepend(node){this.append(node);if(node.className==='coach-avatar-target')anchors.push(node)},
   remove(){this.isConnected=false;if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this);this.parentElement=null},
   setAttribute(){},hasAttribute(){return false},showPopover(){this.raised=(this.raised||0)+1},hidePopover(){},
   querySelector(){return this.children.find(x=>x.className==='coach-avatar-target')}
  };
  el.classList={add(c){el.className+=' '+c},remove(c){el.className=el.className.split(' ').filter(x=>x!==c).join(' ')},toggle(c,on){this.remove(c);if(on)this.add(c)}};return el;
 }
 const win={},avatar=element(),home=element('coach-identity',rect(500,3,67.5)),brand=element('brand-coach-slot',rect(24,20,40)),body=element(),messages=[element('assistant',rect(100,600))];home.append(avatar);
 avatar.open=true;
 const document={body,readyState:'loading',addEventListener(){},getElementById:()=>avatar,querySelector:s=>s==='.coach-identity'?home:s==='.brand-coach-slot'?brand:null,querySelectorAll:s=>s.startsWith('#chat-messages')?messages:anchors.filter(x=>x.isConnected&&!x.children.length),createElement:()=>element('',rect(100,600,48.6))};
 vm.runInNewContext(fs.readFileSync('dist/coach-guide.js','utf8'),{window:win,document,matchMedia:()=>media,performance:{now:()=>now},requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial},cancelAnimationFrame:id=>frames.delete(id)});
 return {api:win.RefineGuide,avatar,home,brand,messages,frames,body,media,step(time){now=time;const jobs=[...frames.values()];frames.clear();jobs.forEach(fn=>fn(time))},element,rect};
}
test('the same avatar shrinks into conversation then returns to the enlarged header along a visible flight',()=>{
 const e=setup();e.api.latest();assert.equal(e.avatar.parentElement.className,'coach-flight');assert.equal(e.avatar.getBoundingClientRect().width,67.5);
 e.step(200);const midway=e.avatar.getBoundingClientRect();assert.ok(midway.width>48.6&&midway.width<67.5);e.step(500);
 assert.equal(e.avatar.parentElement,e.messages[0].querySelector());assert.equal(e.avatar.getBoundingClientRect().width,48.6);
 e.api.home();assert.equal(e.avatar.parentElement.className,'coach-flight');assert.equal(e.avatar.getBoundingClientRect().width,48.6);e.step(1000);assert.equal(e.avatar.parentElement,e.home);assert.equal(e.frames.size,0);
});
test('content replacement and retargeting preserve the actual in-flight coordinates and scale',()=>{
 const e=setup();e.api.latest();e.step(180);const before=e.avatar.getBoundingClientRect();e.api.hold();assert.deepEqual(e.avatar.getBoundingClientRect(),before);
 e.messages[0].isConnected=false;e.home.position=e.rect(320,3,62.5);e.api.home();assert.deepEqual(e.avatar.getBoundingClientRect(),before);e.step(680);assert.equal(e.avatar.parentElement,e.home);assert.equal(e.body.children.length,0);
});
test('flight follows a scrolling destination and closing returns to the brand without duplicating the avatar',()=>{
 const e=setup();e.api.latest();e.step(200);const anchor=e.messages[0].querySelector();anchor.position=e.rect(80,380,48.6);e.step(500);assert.equal(e.avatar.parentElement,anchor);assert.equal(e.avatar.getBoundingClientRect().top,380);
 e.api.hold();e.api.raise();assert.equal(e.avatar.parentElement.raised,2);e.api.brand();e.step(1000);assert.equal(e.avatar.parentElement,e.brand);assert.equal(e.avatar.getBoundingClientRect().width,40);assert.equal(e.body.children.length,0);
});
test('reduced motion lands immediately, including a preference change during a flight',()=>{
 const e=setup(true);e.api.latest();assert.equal(e.avatar.parentElement,e.messages[0].querySelector());assert.equal(e.frames.size,0);e.api.home();assert.equal(e.avatar.parentElement,e.home);
 const flying=setup();flying.api.latest();flying.step(100);flying.media.matches=true;flying.media.change();assert.equal(flying.avatar.parentElement,flying.messages[0].querySelector());assert.equal(flying.frames.size,0);
});
test('replacing an anchor during flight recovers into the visible header instead of stranding the carrier',()=>{
 const e=setup();e.api.latest();e.messages[0].querySelector().isConnected=false;
 e.step(200);e.step(201);e.step(701);
 assert.equal(e.avatar.parentElement,e.home);assert.equal(e.body.children.length,0);assert.equal(e.frames.size,0);
});
