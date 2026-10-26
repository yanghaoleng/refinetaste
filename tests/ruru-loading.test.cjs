const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('academy/selfcare/loading.js','utf8');
function fixture(fetch,configure=()=>{}){
 const requests=[],events={},nodes={'#notes-list':{},'#notebook':{hidden:false}};
 const manifest={questions:[{id:0,chapter:0,kind:'open'},{id:1,chapter:11,kind:'open'}],chapters:[{id:11},{id:0}],chapterFiles:{0:'zero.json',11:'eleven.json'},extras:'tools.js'};
 const ctx={window:{RuruManifest:manifest,RefineGuide:{hold(){requests.push('hold')},home(){requests.push('home')},map(index){requests.push('map:'+index)}}},course:null,notes:[{questionId:0}],screen:'map',navigator:{},document:{readyState:'loading',hidden:false,head:{append(el){requests.push(el.src);el.onload()}},createElement(){return{remove(){}}}},addEventListener(k,v){events[k]=v},read(){return{}},$:key=>nodes[key],renderNoteDetail(){requests.push('note')},showMap(){ctx.window.RefineGuide.map(0)},expRender(){},healthRender(){},expActive:()=>true,healthActive:()=>true,begin(){},loadCourse(){},warmCourse(){},AbortController,setTimeout,clearTimeout,fetch:async(url,options)=>{requests.push(url);return fetch(url,options)}};
 configure(ctx,requests);vm.createContext(ctx);vm.runInContext(source,ctx);return{ctx,requests,events,nodes};
}
const response=id=>({ok:true,status:200,json:async()=>({chapterId:id,questions:[{id:id===11?1:0,chapter:id,kind:'open',prompt:'完整题目'}]})});
test('shell and directory use metadata without requesting questions or decorative tools',async()=>{
 const f=fixture(()=>{throw Error('unexpected fetch')});await f.ctx.loadCourse();f.ctx.showMap();
 assert.deepEqual(f.requests,['hold','map:0']);assert.equal(f.ctx.course.questions[1].prompt,undefined);assert.ok(f.events.load);
});
test('chapter loads deduplicate, retain stable indexes, and leave other chapters light',async()=>{
 let release;const f=fixture(()=>new Promise(resolve=>release=resolve));const first=f.ctx.loadCourse(11),second=f.ctx.loadCourse(11);
 assert.deepEqual(f.requests,['eleven.json']);release(response(11));await Promise.all([first,second]);
 assert.equal(f.ctx.course.questions[1].prompt,'完整题目');assert.equal(f.ctx.course.questions[0].prompt,undefined);await f.ctx.loadCourse(11);assert.equal(f.requests.length,1);
});
test('failed chapter requests can retry without erasing metadata or progress',async()=>{
 let calls=0;const f=fixture(()=>++calls===1?Promise.reject(Error('offline')):response(0));
 await assert.rejects(f.ctx.loadCourse(0),/offline/);assert.equal(f.ctx.window.RuruLoad.pending.size,0);await f.ctx.loadCourse(0);assert.equal(calls,2);assert.equal(f.ctx.course.questions[0].id,0);
});
test('missing old release shards fall back to complete compatible course endpoint',async()=>{
 const f=fixture(url=>url==='eleven.json'?{status:404}:{ok:true,json:async()=>({questions:[{id:1,chapter:11,kind:'open',prompt:'旧页面恢复'}]})});
 await f.ctx.loadCourse(11);assert.deepEqual(f.requests,['eleven.json','course.json']);assert.equal(f.ctx.course.questions[1].prompt,'旧页面恢复');
});
test('malformed shards cannot overwrite another chapter',async()=>{
 const f=fixture(()=>response(0));await assert.rejects(f.ctx.loadCourse(11),/资料不完整/);assert.equal(f.ctx.course.questions[0].prompt,undefined);
});
test('topic chooser also anchors the avatar before a health card exists',async()=>{const f=fixture(()=>response(0));await f.ctx.begin(3);assert.equal(f.requests.at(-1),'home')});
test('returning to a later chapter preserves its destination and avatar through action replacement',()=>{
 for(const reduced of [false,true]){
  const avatar={alive:true,parent:'prior'},oldAction={},newAction={};let action=oldAction,decorating=false;
  const f=fixture(()=>response(0),(ctx,requests)=>{
   ctx.window.RefineGuide.hold=()=>{assert.equal(avatar.alive,true);avatar.parent='carrier'};
   ctx.window.RefineGuide.map=index=>{assert.equal(decorating,false);requests.push(index);if(reduced)avatar.parent=action;else avatar.parent='carrier'};
   ctx.showMap=()=>{decorating=true;ctx.window.RefineGuide.map(10);if(avatar.parent===oldAction)avatar.alive=false;action=newAction;decorating=false};
  });
  f.ctx.showMap();assert.equal(avatar.alive,true);assert.deepEqual(f.requests,[10]);
  if(reduced)assert.equal(avatar.parent,newAction);
 }
});
test('failed map rendering restores the guide API for a subsequent retry',()=>{
 let move;const f=fixture(()=>response(0),ctx=>{move=ctx.window.RefineGuide.map;ctx.showMap=()=>{throw Error('render failed')}});
 assert.throws(()=>f.ctx.showMap(),/render failed/);assert.equal(f.ctx.window.RefineGuide.map,move);
});
test('old notes wait for their full chapter, and custom pages reanchor the same avatar',async()=>{
 const f=fixture(()=>response(0));f.ctx.renderNoteDetail(0);await new Promise(resolve=>setImmediate(resolve));
 assert.ok(f.requests.includes('note'));f.ctx.expRender();f.ctx.healthRender();assert.deepEqual(f.requests.slice(-2),['home','home']);
});
test('health cards without a chat form render safely and retain composer binding when present',()=>{
 const nodes={'#training':{open:true},'#exercise':{},'#health-clear':{}},calls=[];
 const ctx={window:{RuruChapters:{chapters:{}},RuruHealth:{cards:()=>[{key:'schedule',title:'你的作息通常是哪一种？',type:'single',options:[]}]}},begin(){},showMap(){},stopReview(){},screen:'health',$:id=>nodes[id]||null,document:{querySelectorAll:()=>[]},bindChatComposer:el=>calls.push(el),esc:s=>s};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('academy/selfcare/health.js','utf8'),ctx);
 vm.runInContext("healthState={topic:'sleep',step:0,answers:{},notes:{},view:'cards'};healthChoices=()=>'';healthRender()",ctx);
 assert.match(nodes['#exercise'].innerHTML,/你的作息通常是哪一种/);assert.equal(calls.length,0);
 nodes['#health-chat-form']={};nodes['#health-input']={};vm.runInContext('healthRender()',ctx);
 assert.equal(calls[0],nodes['#health-input']);assert.equal(typeof nodes['#health-chat-form'].onsubmit,'function');
});
