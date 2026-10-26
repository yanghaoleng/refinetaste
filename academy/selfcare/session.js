/* One continuous, browser-local session. No lesson grading or conversation telemetry. */
const expCore=window.RuruExploration,expOldBegin=begin,expOldMap=showMap,expOldStop=stopReview;
let expState=null,expRequestState=null,expGeneration=0,expError='',expFailed=null,expSelectedReport=null;
function expLoad(){const stored=read(expCore.key,null);if(stored&&!expCore.valid(stored)){expError='本机的会谈记录暂时无法读取。请先保留需要的内容，再清除本次会谈。';return null}return stored}
function expSave(){if(!persist(expCore.key,expState))expError='浏览器无法保存。记录目前只在这一页，离开前请复制需要的内容。'}
function expActive(){return screen==='exploration'&&$('#training').open}
function expMessage(role,content,kind){return {id:crypto.randomUUID(),role,content,...(kind?{kind}:{}),at:new Date().toISOString()}}
function expAdd(message){expState=expCore.add(expState,message);expSave()}
function expCancel(message='已取消等待，聊天记录还在。',render=true){if(expRequestState){expFailed=expRequestState.mode;expGeneration++;expRequestState.controller.abort();expRequestState=null;expError=message}if(render&&expActive())expRender()}
stopReview=function(){expCancel('已暂停等待，回来后可以重试。',false);expOldStop()};
begin=async function(index,mistakes=false){
 await loadCourse();if(course.chapters[index]?.id!==11)return expOldBegin(index,mistakes);
 navigationGeneration++;stopReview();window.RefineParticles?.dispose();closeNotes(false);expState=expLoad();
 if(!expState){let stored=false;try{stored=!!localStorage.getItem(expCore.key)}catch{expError='浏览器无法保存，离开前请复制需要的内容。'}if(stored){screen='exploration';$('#exercise').innerHTML=`<p role="alert">${esc(expError)}</p><button id="exp-clear-broken" class="secondary">清除本次会谈</button>`;$('#exp-clear-broken').onclick=expConfirmClear;return}expState=expCore.create(crypto.randomUUID());expSave()}
 if(!expState.guide&&!expState.messages.length&&!expState.reports.length)expState.guide=window.RuruOpening.create();
 current=88;chapter=index;screen='exploration';expSelectedReport=null;$('#coach-header').hidden=false;setCoachMood('curious');setCoachGaze(null);setExerciseProgress();$('#exit').innerHTML=icon('arrow-left');$('#exit').setAttribute('aria-label','返回课程目录');persist('selfcare-last-chapter',{index,id:11});expRender();focusTitle();
};
showMap=function(){
 expOldMap();const entry=document.querySelector('[data-chapter="0"]');if(!entry)return;
 const saved=expState||expLoad();entry.setAttribute('aria-label','开始或继续对话：先找到，你真正想认真对待的事');
 entry.closest('.course-chapter').querySelector('.chapter-catalog').hidden=true;
 entry.closest('.course-chapter').querySelector('.chapter-action').innerHTML=`<span class="exploration-status">${saved?.reports?.length?'已有报告':saved?.messages?.length?'继续聊':'开始聊'}</span>`;
 const copy=entry.closest('.course-chapter').querySelector('.chapter-copy');copy.insertAdjacentHTML('beforeend','<button id="exp-legacy" class="explore-history">回看旧版练习记录</button>');
 $('#exp-legacy').onclick=event=>{event.stopPropagation();transition(async()=>{await expOldBegin(0);$('#exercise').insertAdjacentHTML('afterbegin','<div class="explore-legacy-banner">旧版练习记录 <button id="exp-return" class="chat-invite">回到连续对话</button></div>');$('#exp-return').onclick=()=>transition(()=>begin(0))})};
};
function expChoiceOutdated(id){return expState.messages.some(m=>m.supersedes?.includes(id))}
function expGuideView(){
 const g=expState.guide;if(!g?.open)return '';
 const lib=window.RuruOpening,group=lib.scenes[g.branch];
 const choices=(items,attr,selected=[])=>items.map(([id,label])=>`<button type="button" class="secondary" ${attr}="${esc(id)}" aria-pressed="${selected.includes(id)}">${esc(label)}</button>`).join('');
 return `<section class="explore-opening explore-guide" aria-label="开场选择"><p>${g.step==='side'?'我们先从哪边聊？':g.step==='scene'?group.title:'哪些地方比较贴近你？'}</p>${g.step==='side'?`<div class="explore-choices">${choices([['enjoy','最近喜欢做的事'],['concern','最近有点困扰的事']],'data-exp-branch')}</div>`:g.step==='scene'?`<small>可多选，最多三个</small><div class="explore-choices">${choices(Object.entries(group.items).map(([id,item])=>[id,item[0]]),'data-exp-scene',g.scenes)}</div>`:g.scenes.map(id=>`<fieldset><legend>${esc(group.items[id][0])} · 可多选</legend><div class="explore-choices">${choices([...group.items[id][1],'都不太像'].map(t=>[id+'|'+t,t]),'data-exp-tag',(g.tags[id]||[]).map(t=>id+'|'+t))}</div></fieldset>`).join('')}
 ${g.step==='tags'?`<label for="exp-guide-custom">想补充也可以</label><input id="exp-guide-custom" maxlength="200" value="${esc(g.custom)}" placeholder="不填也可以">`:''}
 <div class="explore-choices">${g.step!=='side'?'<button class="chat-invite" id="exp-guide-back">上一步</button>':''}${g.step==='scene'?`<button class="secondary" id="exp-guide-next" ${g.scenes.length?'':'disabled'}>继续选几个词</button>`:g.step==='tags'?'<button class="primary" id="exp-guide-done">从这里聊</button>':''}<button class="chat-invite" id="exp-guide-unsure">不确定</button><button class="chat-invite" id="exp-guide-skip">跳过点选</button>${expState.messages.length?'<button class="chat-invite" id="exp-guide-close">保留原对话</button>':''}</div></section>`;
}
function expGuideUpdate(update){if(expRequestState)return;expState.guide=update;expSave();expRender()}
function expGuideCommit(){
 if(expRequestState||!expState.guide?.open||expState.guide.step!=='tags')return;
 const g=expState.guide,lib=window.RuruOpening,content=lib.summary(g),prior=expState.messages.filter(m=>m.kind==='selection'),message={...expMessage('user',content,'selection'),supersedes:prior.map(m=>m.id)};
 if(!expCore.capacity([...expState.messages,message,{content:lib.question(g)}]))return expTooLong();
 g.open=false;expAdd(message);expAdd(expMessage('assistant',lib.question(g)));expState.view='chat';expFailed=null;expError='';expSave();expRender();$('#exp-input')?.focus();
}
function expProof(entries){return entries.map(e=>`<blockquote><button type="button" class="explore-evidence" data-exp-evidence="${esc(e.messageId)}">${expChoiceOutdated(e.messageId)?'旧选择（已改选）':expState.messages.find(m=>m.id===e.messageId)?.kind==='selection'?'你点选':'你说'}：“${esc(e.quote)}”</button></blockquote>`).join('')}
function expConversation(){
 return `<section class="explore-welcome"><h2 id="exercise-title" tabindex="-1">和小满聊一聊</h2><p>聊聊什么值得你认真对待。结束后，你会得到一份基于这次对话的探索报告，可修改，不是心理测评。</p><details><summary>保存与隐私</summary><p>记录保存在当前浏览器，不跨设备同步。回复和报告会使用本站现有的 AI 服务；本会谈不写入本站学习对话库，也不会自动共享。清除只清除本机这场会谈，无法撤回已发送给 AI 的内容。</p></details></section>
 ${expGuideView()}
 <div id="exp-messages" class="explore-messages">${expState.messages.map((m,i)=>`<article class="chat-message ${m.role}" data-exp-message="${esc(m.id)}"><div class="chat-bubble"><p>${esc(m.content)}</p>${m.kind?`<small>${{confirmation:'你确认的观察',correction:'你的更正',stop:'你选择先暂停',selection:expChoiceOutdated(m.id)?'旧点选，已被后来的改选替代':'开场点选 · 尚未展开经历'}[m.kind]||''}</small>`:''}${m.role==='user'?`<button class="explore-correction" data-exp-correct="${i}">更正这句话</button>`:''}</div>${m.role==='assistant'&&i===expState.messages.length-1&&m.choices?.length?`<div class="explore-choices">${m.choices.map(choice=>`<button type="button" class="secondary" data-exp-choice="${esc(choice)}">${esc(choice)}</button>`).join('')}</div>`:''}${m.checkIn?`<aside class="explore-check"><small>${expState.messages.some(row=>row.kind==='confirmation'&&row.content==='这句贴近我的意思：'+m.checkIn.text)?'你已确认':expState.messages.some(row=>row.kind==='correction'&&row.content.includes(m.checkIn.text))?'已记录更正':'待你核对'}</small><p>${esc(m.checkIn.text)}</p>${expProof(m.checkIn.evidence)}<button class="secondary" data-exp-confirm="${i}">贴近我的意思</button><button class="secondary" data-exp-revise="${i}">想改一下</button></aside>`:''}</article>`).join('')}</div>
 ${expRequestState?`<p class="explore-status" role="status">${expRequestState.mode==='exploration_report'?'正在整理报告…':'小满正在想…'} <button id="exp-cancel" class="chat-invite">取消等待</button></p>`:''}
 ${expState.paused?'<p class="explore-status">已先停在这里。想继续时，直接输入就好。</p>':''}
 <form id="exp-form" class="explore-composer"><label class="sr-only" for="exp-input">和小满聊聊</label><textarea id="exp-input" maxlength="2000" rows="2" placeholder="随便聊聊就好" ${expRequestState?'disabled':''}>${esc(expState.draft||'')}</textarea><button class="primary" id="exp-send" aria-label="发送消息" ${expRequestState?'disabled':''}>${icon('arrow-up')}</button></form>`;
}
const expStatusLabels={explicit:'来自你的话',tentative:'待核对的推测',not_explored:'还没聊到',user_edited:'你的修改'};
function expReportView(){
 const index=expSelectedReport??expState.reports.length-1,r=expState.reports[index];if(!r){expState.view='chat';return expConversation()}
 return `<section class="explore-report"><h2 id="exercise-title" tabindex="-1">重要性感受探索报告</h2><p>基于本次对话的暂时整理，可核对、修改；不是心理测评，也不给人格价值打分。</p><p class="explore-status">第 ${r.version} 版 · 保存在本机${expCore.stale(expState,r)?' · 后来的对话或更正尚未全部纳入':''}</p><label>回看版本 <select id="exp-report-version">${expState.reports.map((item,i)=>`<option value="${i}" ${i===index?'selected':''}>第 ${item.version} 版</option>`).join('')}</select></label>
 ${expCore.sections.map(([key,title])=>`<section class="explore-report-section"><h3>${title}</h3>${r.sections[key].map((item,i)=>`<article><span class="explore-claim-status">${expStatusLabels[item.status]}</span><p>${esc(item.text)}</p>${expProof(item.evidence)}<button class="chat-invite" data-exp-edit-report="${key}:${i}">这句想改一下</button></article>`).join('')}</section>`).join('')}
 ${r.courses.length?`<section class="explore-report-section"><h3>可选的课程方向</h3>${r.courses.map(c=>`<article><strong>${esc(c.title)}</strong><p>${esc(c.reason)}</p>${expProof(c.evidence)}<button class="secondary" data-exp-course="${c.chapterId}">看看这个主题</button></article>`).join('')}</section>`:''}
 <div class="explore-actions"><button class="primary" id="exp-continue">继续聊</button><button class="secondary" id="exp-regenerate" ${expRequestState?'disabled':''}>${expCore.stale(expState,r)?'按新对话与更正更新报告':'重新整理一版'}</button><button class="secondary" id="exp-copy-report">复制报告</button></div>
 ${expRequestState?'<p class="explore-status" role="status">正在整理报告… <button id="exp-cancel" class="chat-invite">取消等待</button></p>':''}</section>`;
}
function expRender(){
 if(!expActive()||!expState)return;
 $('#exercise').innerHTML=`<div class="explore-session">${expState.view==='report'?expReportView():expConversation()}<div id="exp-status" role="status">${esc(expError)} ${expFailed&&!expRequestState?'<button id="exp-retry" class="chat-invite">重试</button>':''}</div><div id="exp-edit-host"></div><div class="explore-session-tools"><button id="exp-report" class="secondary" ${expRequestState?'disabled':''}>${expCore.latest(expState)&&!expCore.stale(expState)?'查看我的探索报告':'整理我的探索报告'}</button><button id="exp-adjust-guide" class="chat-invite" ${expRequestState?'disabled':''}>调整开场选择</button><button id="exp-pause" class="chat-invite">先停一下</button><button id="exp-clear" class="chat-invite">清除本次会谈</button></div><p class="explore-local">仅保存在当前浏览器 · 可随时离开</p></div>`;
 document.querySelectorAll('[data-exp-branch]').forEach(b=>b.onclick=()=>expGuideUpdate(window.RuruOpening.branch(expState.guide,b.dataset.expBranch)));
 document.querySelectorAll('[data-exp-scene]').forEach(b=>b.onclick=()=>expGuideUpdate(window.RuruOpening.toggleScene(expState.guide,b.dataset.expScene)));
 document.querySelectorAll('[data-exp-tag]').forEach(b=>b.onclick=()=>{const [id,tag]=b.dataset.expTag.split('|');expGuideUpdate(window.RuruOpening.toggleTag(expState.guide,id,tag))});
 if($('#exp-guide-custom'))$('#exp-guide-custom').oninput=e=>{expState.guide.custom=e.target.value;expSave()};
 if($('#exp-guide-back'))$('#exp-guide-back').onclick=()=>expGuideUpdate({...expState.guide,step:expState.guide.step==='tags'?'scene':'side'});
 if($('#exp-guide-next'))$('#exp-guide-next').onclick=()=>expGuideUpdate({...expState.guide,step:'tags'});
 if($('#exp-guide-done'))$('#exp-guide-done').onclick=expGuideCommit;
 if($('#exp-guide-skip'))$('#exp-guide-skip').onclick=()=>{expGuideUpdate({...expState.guide,open:false});$('#exp-input')?.focus()};
 if($('#exp-guide-unsure'))$('#exp-guide-unsure').onclick=()=>expSubmit('还不确定从哪里聊起。');
 if($('#exp-guide-close'))$('#exp-guide-close').onclick=()=>expGuideUpdate({...expState.guide,open:false});
 $('#exp-adjust-guide').onclick=()=>{if(expRequestState)return;expState.view='chat';expGuideUpdate({...window.RuruOpening.create(),...expState.guide,open:true,step:'side'})};
 const input=$('#exp-input');if(input){input.oninput=()=>{expState.draft=input.value;expSave()};$('#exp-form').onsubmit=event=>{event.preventDefault();expSubmit(input.value)}}
 document.querySelectorAll('[data-exp-choice]').forEach(button=>button.onclick=()=>expSubmit(button.dataset.expChoice));
 document.querySelectorAll('[data-exp-correct]').forEach(button=>button.onclick=()=>{const m=expState.messages[+button.dataset.expCorrect];expEdit('更正你说过的话',m.content,replacement=>expSubmit(`更正我之前说的“${m.content}”：${replacement}`,'correction'))});
 document.querySelectorAll('[data-exp-confirm]').forEach(button=>button.onclick=()=>{const m=expState.messages[+button.dataset.expConfirm];expSubmit('这句贴近我的意思：'+m.checkIn.text,'confirmation')});
 document.querySelectorAll('[data-exp-revise]').forEach(button=>button.onclick=()=>{const m=expState.messages[+button.dataset.expRevise];expEdit('怎样说更贴近你？','',replacement=>expSubmit(`我想更正你的观察“${m.checkIn.text}”：${replacement}`,'correction'))});
 document.querySelectorAll('[data-exp-evidence]').forEach(button=>button.onclick=()=>{const id=button.dataset.expEvidence;expState.view='chat';expSave();expRender();[...document.querySelectorAll('[data-exp-message]')].find(el=>el.dataset.expMessage===id)?.scrollIntoView({block:'center'})});
 document.querySelectorAll('[data-exp-edit-report]').forEach(button=>button.onclick=()=>{const [section,index]=button.dataset.expEditReport.split(':'),reportIndex=expSelectedReport??expState.reports.length-1,item=expState.reports[reportIndex].sections[section][+index];expEdit('怎样写更贴近你？',item.text,replacement=>{const message=expMessage('user',`报告中的“${item.text}”不贴近我。我想改成：${replacement}`,'correction');if(!expCore.capacity([...expState.messages,message]))return expTooLong();expState=expCore.edit(expState,reportIndex,section,+index,replacement,message);expSelectedReport=null;expSave();expError='更正已保存。可以继续聊，或更新整份报告。';expRender()})});
 document.querySelectorAll('[data-exp-course]').forEach(button=>button.onclick=()=>transition(()=>begin(course.chapters.findIndex(ch=>ch.id===+button.dataset.expCourse))));
 $('#exp-report').onclick=()=>expRequest('exploration_report');$('#exp-pause').onclick=expPause;$('#exp-clear').onclick=expConfirmClear;
 if($('#exp-continue'))$('#exp-continue').onclick=()=>{expState.view='chat';expState.paused=false;expSave();expRender()};
 if($('#exp-regenerate'))$('#exp-regenerate').onclick=()=>expRequest('exploration_report',true);
 if($('#exp-report-version'))$('#exp-report-version').onchange=event=>{expSelectedReport=+event.target.value;expRender()};
 if($('#exp-copy-report'))$('#exp-copy-report').onclick=async()=>{try{await navigator.clipboard.writeText(expCore.exportReport(expState.reports[expSelectedReport??expState.reports.length-1]));$('#exp-status').textContent='报告已复制'}catch{$('#exp-status').textContent='未能复制，请直接选择报告文字复制。'}};
 if($('#exp-cancel'))$('#exp-cancel').onclick=()=>expCancel();if($('#exp-retry'))$('#exp-retry').onclick=()=>expRequest(expFailed,true);
}
function expEdit(label,value,save){if(expRequestState)return;$('#exp-edit-host').innerHTML=`<form id="exp-edit-form" class="explore-edit"><label for="exp-edit-input">${esc(label)}</label><textarea id="exp-edit-input" maxlength="350" rows="3" required>${esc(value)}</textarea><button class="primary">保存更正</button><button type="button" id="exp-edit-cancel" class="secondary">取消</button></form>`;$('#exp-edit-input').focus();$('#exp-edit-form').onsubmit=event=>{event.preventDefault();const text=$('#exp-edit-input').value.trim();if(text)save(text)};$('#exp-edit-cancel').onclick=()=>$('#exp-edit-host').replaceChildren()}
function expTooLong(){expError='这场对话已比较长，新的内容还留在输入框。可以先整理报告，再决定是否清除本次会谈重开。';expRender()}
function expSubmit(text,kind){text=text.trim();if(!text||expRequestState)return;const message=expMessage('user',text,kind);if(!expCore.capacity([...expState.messages,message,{content:' '.repeat(800)}]))return expTooLong();if(expState.guide)expState.guide.open=false;expState.draft='';expState.paused=false;expAdd(message);expState.view='chat';expRequest('exploration_session')}
function expPause(){expCancel('',false);if(!expState.paused){const messages=[expMessage('user','想先停一下，暂时不行动。','stop'),expMessage('assistant','好，我们先停在这里。想继续时再回来就好。')];if(expCore.capacity([...expState.messages,...messages]))messages.forEach(expAdd)}expState.paused=true;expError='';expFailed=null;expSave();expRender()}
function expConfirmClear(){if(!expActive())return;$('#exercise').insertAdjacentHTML('beforeend','<section id="exp-clear-confirm" class="explore-edit" role="alert"><p>清除本机这场对话和它的报告？旧课程进度和笔记会保留。已发送给 AI 的内容无法在这里撤回。</p><button class="secondary" id="exp-keep">保留</button><button class="secondary" id="exp-confirm-clear">确认清除本次会谈</button></section>');$('#exp-keep').onclick=()=>$('#exp-clear-confirm').remove();$('#exp-confirm-clear').onclick=()=>{expCancel('',false);try{localStorage.removeItem(expCore.key)}catch{expError='无法清除本机记录。';return}expState=expCore.create(crypto.randomUUID());expState.guide=window.RuruOpening.create();expError='';expFailed=null;expSelectedReport=null;expRender()}}
async function expRequest(mode,force=false){
 if(expRequestState)return;
 if(mode==='exploration_report'&&!force&&expCore.latest(expState)&&!expCore.stale(expState)){expState.view='report';expSelectedReport=null;expSave();expRender();return}
 const latest=expCore.latest(expState),revision=expState.revision,sessionId=expState.id,ticket=++expGeneration,controller=new AbortController();
 const messages=expState.messages.map(({id,role,content,kind,checkIn,supersedes})=>({id,role,content,...(supersedes?{supersedes}:{}),...(kind?{kind}:{}),...(checkIn?{checkIn}:{})}));
 const payload={id:crypto.randomUUID(),q:88,mode,revision,messages,answer:mode==='exploration_report'?'整理本次探索报告':expState.messages.at(-1).content,...(latest?{report:{sections:latest.sections,courses:latest.courses}}:{})};
 if(new TextEncoder().encode(JSON.stringify(payload)).length>120000){expTooLong();return}
 expRequestState={mode,controller};expError='';expFailed=null;expRender();const timer=setTimeout(()=>controller.abort(),48000);
 try{
  const response=await fetch('api/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal}),result=await response.json();
  if(ticket!==expGeneration||expState.id!==sessionId||expState.revision!==revision)return;
  if(!response.ok)throw Error(result.error||'暂时没有完成，请重试。');
  if(mode==='exploration_report'){expState=expCore.acceptReport(expState,result,crypto.randomUUID());expSelectedReport=null;expSave()}
  else{expAdd({...expMessage('assistant',result.reply),choices:result.choices||[],checkIn:result.checkIn||null});setCoachMood(result.emotion)}
 }catch(error){if(ticket===expGeneration){expError=(error.name==='AbortError'?'等待已停止，可以重试。':error.message)+' 聊天记录还在。';expFailed=mode}}
 finally{clearTimeout(timer);if(ticket===expGeneration){expRequestState=null;expRender();if(expActive()&&expState.view==='chat')$('#exp-input')?.scrollIntoView({block:'nearest'})}}
}
