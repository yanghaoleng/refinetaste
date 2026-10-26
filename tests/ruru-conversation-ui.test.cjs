const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{parseHTML}=require('linkedom');
function setup({reduced=false,nativePopover=false}={}){
 const {document,window:dom}=parseHTML('<html><body><button id="outside">外面</button><dialog id="training" open><div id="coach-header"><div class="coach-identity"><span id="coach-avatar"></span></div></div><div id="exercise"></div></dialog></body></html>');
 const animations=[],textEffects=[],moves=[],requests=[];let active=null,response;
 Object.defineProperty(dom.HTMLElement.prototype,'form',{get(){return this.closest('form')},configurable:true});Object.defineProperty(dom.HTMLElement.prototype,'scrollHeight',{get(){return 34},configurable:true});
 const avatar=document.getElementById('coach-avatar'),dialog=document.getElementById('training');dialog.open=true;Object.defineProperty(dialog,'scrollHeight',{value:800,writable:true});dialog.clientHeight=844;dialog.scrollTop=0;
 Object.defineProperty(document,'activeElement',{get:()=>active});dom.HTMLElement.prototype.focus=function(){active=this};dom.HTMLElement.prototype.scrollIntoView=function(){this.scrolled=true};dom.HTMLElement.prototype.getBoundingClientRect=()=>({top:100,left:20,right:60,bottom:140,width:40,height:40});
 dom.HTMLElement.prototype.requestSubmit=function(){this.dispatchEvent(new dom.Event('submit',{bubbles:true,cancelable:true}))};
 if(nativePopover){dom.HTMLElement.prototype.showPopover=function(){this.popoverVisible=true};dom.HTMLElement.prototype.hidePopover=function(){this.popoverVisible=false}}
 const create=document.createElement.bind(document);document.createElement=tag=>tag==='canvas'?{getContext:()=>({measureText:t=>({width:t.length*10})})}:create(tag);
 const guide={hold(){document.body.append(avatar)},home(){document.querySelector('.coach-identity').append(avatar)},follow(anchor){moves.push(anchor.parentElement.dataset.ruruMessage);anchor.append(avatar)}};
 const win={addEventListener(){},RefineGuide:guide,RefineText:{text:p=>textEffects.push(p.textContent)}};
 const ctx={window:win,document,Map,Set,AbortController,TextEncoder,crypto:require('node:crypto').webcrypto,setTimeout,clearTimeout,innerWidth:390,innerHeight:844,matchMedia:()=>({matches:reduced}),getComputedStyle:()=>({font:'14px sans-serif'}),ResizeObserver:class{observe(){}disconnect(){}},requestAnimationFrame:fn=>fn(),animateMessage:row=>animations.push(row.dataset.ruruMessage),revealConversation(){},esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),icon:n=>'<svg data-icon="'+n+'"></svg>',$:s=>document.querySelector(s),screen:'exploration',begin(){},showMap(){},stopReview(){},persist:()=>true,read:(_k,f)=>f,setCoachMood(){},fetch:async(_url,options)=>{requests.push(JSON.parse(options.body));return new Promise(resolve=>response=resolve)}};
 vm.createContext(ctx);const app=fs.readFileSync('dist/app.js','utf8');vm.runInContext(app.slice(app.indexOf('const chatComposerBindings='),app.indexOf('function updateSend(){')),ctx);
 for(const name of ['session-core.js','guide-core.js','chapters-core.js','health-core.js','conversation-ui.js','session.js','health.js'])vm.runInContext(fs.readFileSync('academy/selfcare/'+name,'utf8'),ctx);
 function run(code){return vm.runInContext(code,ctx)}
 run("expState=expCore.create('test-session');expState.guide=window.RuruOpening.create();expRender()");
 const click=selector=>document.querySelector(selector).dispatchEvent(new dom.Event('click',{bubbles:true,cancelable:true}));
 const event=(el,type,props={})=>{const e=new dom.Event(type,{bubbles:true,cancelable:true});Object.assign(e,props);el.dispatchEvent(e);return e};
 return{ctx,document,dom,avatar,animations,textEffects,moves,requests,run,click,event,reply:async result=>{response({ok:true,json:async()=>result});await new Promise(resolve=>setImmediate(resolve))}};
}
test('fresh messages from both sides enter once, restored history stays immediate, and one avatar follows each newest turn',async()=>{
 const e=setup();e.run("expState.messages=[{id:'old-user',role:'user',content:'旧话'},{id:'old-ai',role:'assistant',content:'旧回复'}];expState.id='restored';expRender()");assert.deepEqual(e.animations,[]);
 e.run("expSubmit('新话')");assert.equal(e.animations.length,1);assert.equal(e.moves.at(-1),e.requests[0].messages.at(-1).id);
 e.run('expRender()');assert.equal(e.animations.length,1);await e.reply({reply:'新回复',choices:['继续聊','先休息']});assert.equal(e.animations.length,2);
 assert.equal(e.document.querySelectorAll('#coach-avatar').length,1);assert.equal(e.document.getElementById('coach-avatar'),e.avatar);assert.equal(e.avatar.parentElement.parentElement.dataset.ruruMessage,e.moves.at(-1));
 e.run('expRender()');assert.equal(e.animations.length,2);assert.equal(e.textEffects.length,2);
});
test('reduced motion never starts message effects',async()=>{const e=setup({reduced:true});e.run("expSubmit('你好')");await e.reply({reply:'你好'});assert.deepEqual(e.animations,[]);assert.deepEqual(e.textEffects,[]);assert.equal(e.document.querySelectorAll('#coach-avatar').length,1)});
test('opening selections and AI quick replies are input controls above the composer, not history',async()=>{
 const e=setup();assert.equal(e.document.querySelectorAll('.ruru-input-options [data-exp-branch]').length,2);assert.equal(e.document.querySelectorAll('#exp-messages [data-exp-branch]').length,0);
 e.click('[data-exp-branch="enjoy"]');e.click('[data-exp-scene]');e.click('#exp-guide-next');e.click('[data-exp-tag]');e.click('#exp-guide-done');assert.equal(e.run("expState.messages[0].kind"),'selection');assert.equal(e.requests.length,0);
 e.run("expSubmit('再聊聊')");await e.reply({reply:'可以从这里聊',choices:['说具体一点','先停一下']});assert.equal(e.document.querySelectorAll('#exp-messages [data-exp-choice]').length,0);assert.equal(e.document.querySelectorAll('.ruru-input-options [data-exp-choice]').length,2);
 const choice=e.document.querySelector('[data-exp-choice]');e.event(choice,'click');e.event(choice,'click');assert.equal(e.requests.length,2);assert.equal(e.requests[1].messages.at(-1).content,'说具体一点');await e.reply({reply:'好的'});
});
test('compact shared composer grows and resets, and IME Enter commits without submitting',async()=>{
 const e=setup(),input=e.document.querySelector('#exp-input');assert.equal(input.getAttribute('rows'),'1');assert.ok(input.closest('.chat-composer'));
 Object.defineProperty(input,'scrollHeight',{value:34,writable:true});e.event(input,'input');assert.equal(input.style.height,'34px');input.value='长句\n'.repeat(8);input.scrollHeight=190;e.event(input,'input');assert.equal(input.style.height,'190px');
 e.event(input,'compositionstart');const composing=e.event(input,'keydown',{key:'Enter',isComposing:true});assert.equal(composing.defaultPrevented,false);assert.equal(e.requests.length,0);e.event(input,'compositionend');e.event(input,'keydown',{key:'Enter',shiftKey:true});assert.equal(e.requests.length,0);
 e.event(input,'keydown',{key:'Enter'});assert.equal(e.requests.length,1);assert.equal(e.document.querySelector('#exp-input').value,'');assert.equal(e.document.querySelector('#exp-input').getAttribute('rows'),'1');await e.reply({reply:'收到'});
});
for(const nativePopover of [false,true])test(`one tools menu retains actions and dismisses outside/Escape (native=${nativePopover})`,()=>{
 const e=setup({nativePopover});assert.equal(e.document.querySelectorAll('.ruru-tools-toggle').length,1);assert.equal(e.document.querySelectorAll('.explore-session-tools').length,0);assert.equal(e.document.querySelectorAll('.ruru-tools-menu button').length,4);
 e.click('#exp-tools-toggle');assert.equal(e.document.querySelector('#exp-tools-toggle').getAttribute('aria-expanded'),'true');e.event(e.document,'scroll');assert.equal(e.document.querySelector('#exp-tools-toggle').getAttribute('aria-expanded'),'true');e.event(e.document,'keydown',{key:'Escape'});assert.equal(e.document.querySelector('#exp-tools-toggle').getAttribute('aria-expanded'),'false');
 e.click('#exp-tools-toggle');e.event(e.document.querySelector('#outside'),'pointerdown');assert.equal(e.document.querySelector('#exp-tools-toggle').getAttribute('aria-expanded'),'false');
 e.click('#exp-tools-toggle');e.click('#exp-adjust-guide');assert.equal(e.document.querySelector('#exp-tools-toggle').getAttribute('aria-expanded'),'false');assert.ok(e.document.querySelector('[data-exp-branch]'));
});
test('health conversation uses the same controls, preserves snapshots, and starts with accurate privacy',()=>{
 const e=setup();e.run("screen='health';healthState=healthCore.create('sleep');healthState.view='feedback';healthState.messages=[{id:'h1',role:'assistant',content:'想从哪聊？',choices:['聊休息','先停']}];healthRender()");
 assert.equal(e.document.querySelectorAll('.explore-messages [data-health-chat-choice]').length,0);assert.equal(e.document.querySelectorAll('.ruru-input-options [data-health-chat-choice]').length,2);assert.equal(e.document.querySelector('#health-input').getAttribute('rows'),'1');assert.ok(e.document.querySelector('#health-clear').closest('.ruru-tools-menu'));
 const text=e.document.querySelector('.ruru-privacy').textContent;assert.match(text,/交给现有 AI 服务处理/);assert.match(text,/无法撤回/);assert.doesNotMatch(e.document.querySelector('#exercise').textContent,/仅保存在当前浏览器 · 可随时离开/);
 assert.equal(e.document.querySelectorAll('#coach-avatar').length,1);
});
test('report actions and explicit clear confirmation survive the collapsed menu',()=>{
 const e=setup();e.run("expState=expCore.acceptReport(expState,{basedOnRevision:expState.revision,report:{sections:Object.fromEntries(expCore.sections.map(([key])=>[key,[{text:'还没聊到',status:'not_explored',evidence:[]}]])),courses:[]}},'r1');expState.view='report';expRender()");
 for(const id of ['exp-continue','exp-regenerate','exp-copy-report','exp-report','exp-adjust-guide','exp-pause','exp-clear'])assert.ok(e.document.getElementById(id).closest('.ruru-tools-menu'));
 e.click('#exp-continue');assert.ok(e.document.querySelector('#exp-input'));e.click('#exp-clear');assert.ok(e.document.querySelector('#exp-confirm-clear'));assert.equal(e.run('expState.reports.length'),1);e.click('#exp-keep');assert.equal(e.document.querySelector('#exp-clear-confirm'),null);assert.equal(e.run('expState.reports.length'),1);
});
