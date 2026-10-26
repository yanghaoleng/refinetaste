/* RURU-only exploration support. Existing subjects keep the shared runtime. */
const selfcareBase={begin,render,renderOpen,result,showMap,recordAnswer,catalogPoints,renderNoteDetail,toggleBookmark,syncBookmark};
const isExploration=q=>q?.feedbackMode==='exploration';
let selfcareRendering=false;
const revealSelfcareConversation=revealConversation;
revealConversation=function(){if(selfcareRendering&&isExploration(activeQuestion()))return;return revealSelfcareConversation()};
const createSelfcareRun=window.RefineRun.create;
window.RefineRun.create=(questions,previous)=>questions.every(isExploration)?{order:questions.map(q=>q.id),variants:Object.fromEntries(questions.map(q=>[q.id,window.RefineRun.resolve(q)]))}:createSelfcareRun(questions,previous);
const continueSelfcareChapter=window.RefinePractice.continueChapter;
window.RefinePractice.continueChapter=(chapters,questions,scores,progress,last)=>continueSelfcareChapter(chapters,questions,Object.fromEntries(Object.entries(scores).map(([id,score])=>[id,score.exploration?{...score,passed:score.complete}:score])),progress,last);

begin=async function(index,mistakes=false){
 await selfcareBase.begin(index,mistakes);
 if(screen!=='lesson'||!isExploration(activeQuestion()))return;
 const all=course.questions.filter(q=>q.chapter===course.chapters[index].id),pending=all.find(q=>!progress[q.id]?.done);
 if(pending){sessionAnswers=Object.fromEntries(all.filter(q=>progress[q.id]?.done).map(q=>[q.id,-1]));current=pending.id;runPosition=runOrder.indexOf(current);render()}
};
catalogPoints=function(questions,navigate=false){
 return questions.map(q=>{
  if(!isExploration(q))return selfcareBase.catalogPoints([q],navigate);
  const done=navigate?questionAnswered(q.id):progress[q.id]?.done,label=done?(progress[q.id]?.skipped?'已跳过':'已记录'):'未浏览';
  return `<li class="catalog-point" data-question="${q.id}" data-complete="${!!done}" data-outcome="${done?'answered':'unanswered'}" aria-label="${esc(q.principle)}，${label}">${navigate?`<button type="button" class="catalog-jump" data-jump-question="${q.id}" ${q.id===current?'aria-current="step"':''}>${esc(q.principle)}</button>`:`<strong>${esc(q.principle)}</strong>`}</li>`;
 }).join('');
};
showMap=function(){
 selfcareBase.showMap();
 const entry=document.querySelector('[data-chapter="0"]');if(!entry)return;
 entry.setAttribute('aria-label','开始或继续探索：先找到，你真正想认真对待的事');
 const action=entry.closest('.course-chapter').querySelector('.chapter-action');
 if(chapterScores[88]?.complete)action.innerHTML='<span class="exploration-status">已浏览</span>';
};
render=function(){
 window.RuruConversation?.before();
 selfcareBase.render();const q=activeQuestion();
 if(!isExploration(q)&&q.followUps?.length){
  const anchor=$('#exercise .open-case');
  anchor.insertAdjacentHTML('afterend',`<details class="selfcare-followups"><summary>想继续时，任选一个追问</summary><ul>${q.followUps.map(text=>`<li>${esc(text)}</li>`).join('')}</ul></details>`);
 }
 if(isExploration(q)){
  $('#exercise .open-case').hidden=true;
  $('.lesson-skip')?.remove();
  if(q.id===95)mountClueCard();
 }
};
recordAnswer=function(verdict,metricChoice=verdict){
 if(!isExploration(activeQuestion()))return selfcareBase.recordAnswer(verdict,metricChoice);
 if(Object.hasOwn(sessionAnswers,current))return;
 sessionAnswers[current]=-1;window.RefineMetrics?.send('answer',{q:current,choice:-1});
 saveProgress({done:true,correct:null,choice:-1,exploration:true});updateRunProgress();
};
function finishExplorationStep(skipped=false){
 if(reviewController)stopReview();
 saveProgress({skipped,draft:checkpoint().chatDraft||checkpoint().draft||''});recordAnswer(-1);const next=nextPendingQuestion();
 transition(()=>{if(next===null)result();else{current=next;runPosition=runOrder.indexOf(next);selected=null;render()}});
}
renderOpen=function(q){
 selfcareRendering=true;try{selfcareBase.renderOpen(q)}finally{selfcareRendering=false}if(!isExploration(q))return;
 const next=$('#open-next');next.hidden=false;
 $('#chat-input').placeholder='随便聊聊就好';
 $('#next').innerHTML=`${q.id===95?'先聊到这':'下一题'}<span>${icon('arrow-right')}</span>`;
 $('#next').onclick=()=>finishExplorationStep(false);
 next.insertAdjacentHTML('afterbegin','<button id="explore-skip" class="secondary" type="button">先跳过</button>');
 $('#explore-skip').onclick=()=>finishExplorationStep(true);
 $('#chat-form .chat-composer').classList.remove('awaiting-answer');
 positionControls();
};
const clueFields=[['care','目前在意'],['connection','生活联系（或不知道）'],['learn','想了解'],['limits','现实限制'],['next','下一步（包括不行动）']];
function currentClue(){return read('selfcare-importance-clue-v2',{})}
function mountClueCard(){
 const clue=currentClue();$('#feedback-slot').insertAdjacentHTML('beforebegin',`<details class="selfcare-followups selfcare-clue-fold"><summary>留张便签</summary><section class="selfcare-clue" aria-label="我的线索卡">${clueFields.map(([key,label])=>`<label>${label}<textarea data-clue="${key}" rows="2" maxlength="500">${esc(clue[key]||'')}</textarea></label>`).join('')}<p id="clue-storage" role="status"></p></section></details>`);
 document.querySelectorAll('[data-clue]').forEach(input=>input.oninput=()=>{const clue=Object.fromEntries([...document.querySelectorAll('[data-clue]')].map(field=>[field.dataset.clue,field.value]));const ok=persist('selfcare-importance-clue-v2',clue);saveProgress({clueCard:clue});$('#clue-storage').textContent=ok?'已保存在本机':'浏览器无法保存，离开前请复制内容'});
}
function clueMarkup(clue){return `<dl class="selfcare-clue-summary">${clueFields.map(([key,label])=>`<dt>${esc(label)}</dt><dd>${esc(clue?.[key]||'暂时留空')}</dd>`).join('')}</dl>`}
syncBookmark=function(){selfcareBase.syncBookmark();const note=noteForQuestion();if(note&&isExploration(activeQuestion())){note.reflection=checkpoint().chatDraft||checkpoint().draft||'';if(current===95)note.clueCard=currentClue();persist('selfcare-notes',notes)}};
toggleBookmark=function(event){selfcareBase.toggleBookmark(event);syncBookmark()};
renderNoteDetail=function(index){selfcareBase.renderNoteDetail(index);const note=notes[index];if(note?.reflection&&!note.messages?.some(m=>m.role==='user'&&m.content===note.reflection))$('#notes-list .note-item').insertAdjacentHTML('beforeend',`<p class="selfcare-reflection">${esc(note.reflection)}</p>`);if(note?.clueCard)$('#notes-list .note-item').insertAdjacentHTML('beforeend',clueMarkup(note.clueCard));if(note?.questionId>=80&&note.questionId<=87)$('#notes-list').insertAdjacentHTML('afterbegin','<p class="selfcare-permission">历史笔记：旧章使用的是心理学 mattering，与新版首章的“重要性感受”不是同一概念。原题与原回答保留供你回看。</p>')};
result=function(){
 if(course.chapters[chapter].feedbackMode!=='exploration')return selfcareBase.result();
 stopCoachMood();setCoachGaze(null);screen='result';window.RefineMetrics?.stage?.('result',{chapter:11,mode:'full',action:'view_result'});window.RefineMetrics?.send('complete');
 chapterScores[88]={exploration:true,complete:true,total:8,date:new Date().toISOString()};persist('selfcare-chapter-scores',chapterScores);setExerciseProgress(8,8);
 const clue=currentClue(),hasClue=Object.values(clue).some(value=>String(value).trim());
 $('#exercise').innerHTML=`<section class="result selfcare-result"><h2 id="exercise-title" tabindex="-1">先把这些线索留在这里</h2><p>这段探索没有分数，也没有必须完成的行动。</p>${hasClue?clueMarkup(clue):'<p>暂没找到，先留意让我停一下的时刻。</p>'}<p>${esc(course.questions[95].after)}</p><div class="result-actions"><button id="selfcare-next-chapter" class="primary">看看自我照顾 ${icon('arrow-right')}</button><button id="selfcare-map" class="secondary">返回目录</button><button id="selfcare-revisit" class="secondary">再看一遍</button></div></section>`;
 $('#selfcare-next-chapter').onclick=()=>transition(()=>begin(1));$('#selfcare-map').onclick=()=>transition(showMap);$('#selfcare-revisit').onclick=()=>transition(()=>begin(0));focusTitle();window.RefineGuide.home();
};
