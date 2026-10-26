/* RURU: a light shell owns first paint; full stable questions arrive per chapter. */
(()=>{
 const manifest=window.RuruManifest,pending=new Map(),loaded=new Set();let extras=null,noteTicket=0,warmQueued=false;
 const lite=()=>{if(!course)course={...manifest,questions:manifest.questions.map(q=>({...q}))};return course};
 function script(url){return new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=url;el.async=true;el.onload=resolve;el.onerror=()=>{el.remove();reject(Error('辅助资源暂未加载'))};document.head.append(el)})}
 function tools(){return extras||(extras=script(manifest.extras).catch(error=>{extras=null;throw error}))}
 async function chapterData(id,urgent=true){
  lite();if(loaded.has(id))return course;if(pending.has(id))return pending.get(id);
  const url=manifest.chapterFiles[id];if(!url)throw Error('找不到这一章');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  const task=(async()=>{
   let response=await fetch(url,{signal:controller.signal,priority:urgent?'high':'low'}),data;
   if(response.status===404){response=await fetch('course.json',{signal:controller.signal});if(!response.ok)throw Error('课程暂时不可用');const full=await response.json();data={chapterId:id,questions:full.questions.filter(q=>q.chapter===id)}}
   else{if(!response.ok)throw Error('这一章暂时不可用');data=await response.json()}
   if(data.chapterId!==id||!Array.isArray(data.questions)||data.questions.length!==manifest.questions.filter(q=>q.chapter===id).length||new Set(data.questions.map(q=>q.id)).size!==data.questions.length||data.questions.some(q=>!manifest.questions[q.id]||manifest.questions[q.id].chapter!==id||!['open','choice'].includes(q.kind)||(q.kind==='choice'&&!Array.isArray(q.labels))||(q.kind==='open'&&typeof q.prompt!=='string')))throw Error('章节资料不完整');
   for(const q of data.questions)course.questions[q.id]=q;loaded.add(id);return course;
  })().finally(()=>{clearTimeout(timer);pending.delete(id)});pending.set(id,task);return task;
 }
 loadCourse=function(id=null){lite();return id===null?Promise.resolve(course):chapterData(id)};
 warmCourse=function(){if(warmQueued||navigator.connection?.saveData||/2g/.test(navigator.connection?.effectiveType||''))return;warmQueued=true;const warm=()=>{warmQueued=false;if(document.hidden)return;tools().catch(()=>{});const saved=read('selfcare-last-chapter',{}),id=manifest.chapters.some(c=>c.id===saved.id)?saved.id:11;chapterData(id,false).catch(()=>{})};const idle=()=>window.requestIdleCallback?requestIdleCallback(warm,{timeout:6000}):setTimeout(warm,1200);if(document.readyState==='complete')idle();else addEventListener('load',idle,{once:true})};
 const baseNotes=renderNoteDetail;
 renderNoteDetail=function(index){const qid=notes[index]?.questionId,id=manifest.questions[qid]?.chapter,ticket=++noteTicket;if(id===undefined)return baseNotes(index);$('#notes-list').innerHTML='<p role="status">正在准备这条笔记…</p>';Promise.all([chapterData(id),tools()]).then(()=>{if(ticket===noteTicket&&!$('#notebook').hidden)baseNotes(index)}).catch(()=>{if(ticket!==noteTicket||$('#notebook').hidden)return;$('#notes-list').innerHTML='<p>这条笔记暂未加载，原内容仍保留。</p><button id="ruru-note-retry" class="secondary">重试</button>';$('#ruru-note-retry').onclick=()=>renderNoteDetail(index)})};
 // The custom RURU screens replace the map's action; give the same avatar a live anchor.
 const mapBefore=showMap;showMap=function(){mapBefore();if(screen==='map')window.RefineGuide?.map(0)};
 const expBefore=expRender;expRender=function(){expBefore();if(expActive())window.RefineGuide?.home()};
 const healthBefore=healthRender;healthRender=function(){healthBefore();if(healthActive())window.RefineGuide?.home()};
 const beginBefore=begin;begin=async function(...args){await beginBefore(...args);if(expActive()||healthActive())window.RefineGuide?.home()};
 // Shared lesson code calls this loader before its first full-question access.
 window.RuruLoad={chapter:chapterData,tools,loaded,pending};
 warmCourse();
})();
