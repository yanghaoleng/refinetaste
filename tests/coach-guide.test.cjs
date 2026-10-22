const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function setup(reduced=false){
 let now=0,serial=0;const frames=new Map(),anchors=[],media={matches:reduced,addEventListener(){}};
 const rect=(x,y)=>({left:x,top:y,width:54,height:54});
 function element(cls='',position=rect(0,0)){
  return {className:cls,children:[],isConnected:true,style:{},getBoundingClientRect(){return position},append(node){if(node.parentElement)node.parentElement.children=node.parentElement.children.filter(x=>x!==node);this.children.push(node);node.parentElement=this},prepend(node){this.children.unshift(node);node.parentElement=this;if(node.className==='coach-avatar-target')anchors.push(node)},remove(){this.isConnected=false;if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this)},querySelector(){return this.children.find(x=>x.className==='coach-avatar-target')}};
 }
 const avatar=element('',rect(500,10)),home=element(),training=element(),messages=[element('assistant',rect(100,600))];home.append(avatar);
 const document={getElementById:id=>id==='coach-avatar'?avatar:training,querySelector:()=>home,querySelectorAll:s=>s.startsWith('#chat-messages')?messages:s.endsWith(':empty')?anchors.filter(x=>!x.children.length):anchors,createElement:()=>element('target',rect(100,600))};
 const ctx={window:{},document,matchMedia:()=>media,performance:{now:()=>now},requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial},cancelAnimationFrame:id=>frames.delete(id)};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/coach-guide.js'),'utf8'),ctx);
 return {api:ctx.window.RefineGuide,avatar,home,messages,frames,step(time){now=time;const jobs=[...frames.values()];frames.clear();jobs.forEach(fn=>fn(time))},element};
}
test('one avatar lands at the latest message, tracks subsequent replies, and returns home safely mid-flight',()=>{
 const e=setup();e.api.latest();assert.equal(e.avatar.parentElement.className,'coach-flight');
 e.step(300);assert.ok(e.avatar.parentElement.style.transform.includes('translate('));e.step(650);
 assert.equal(e.avatar.parentElement,e.messages[0].querySelector());assert.equal(e.frames.size,0);
 e.messages.push(e.element('assistant'));e.api.latest();assert.equal(e.avatar.parentElement.className,'coach-flight');
 e.api.home();assert.equal(e.avatar.parentElement,e.home);assert.equal(e.frames.size,0);
});
test('reduced motion reparents the same avatar without an animation loop',()=>{
 const e=setup(true);e.api.latest();assert.equal(e.avatar.parentElement,e.messages[0].querySelector());assert.equal(e.frames.size,0);e.api.home();assert.equal(e.avatar.parentElement,e.home);
});
