const $=s=>document.querySelector(s),esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const fmt=n=>Number(n).toLocaleString('zh-CN'),pct=(a,b)=>b?`${(100*a/b).toFixed(1)}%`:'—',date=t=>t?new Date(t*1000).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'—';
let data=null,pin='',busy=false,lockedUntil=0,userPage=0,generation=0,detailGeneration=0,selectedUser=null,recordPage=0,searchTimer;
const transcriptNodes=new Map();
function dots(){document.querySelectorAll('.pin-dots i').forEach((n,i)=>n.classList.toggle('filled',i<pin.length));$('.pin-dots').setAttribute('aria-label',`已输入 ${pin.length} 位`)}
function gate(){data=null;selectedUser=null;detailGeneration++;$('#gate').hidden=false;$('#dashboard').hidden=true;$('#users').replaceChildren();$('#transcripts').replaceChildren();$('#learner-detail').hidden=true}
async function api(path,options){const response=await fetch('../api/'+path,{cache:'no-store',...options});if(response.status===401){gate();throw Error('请重新输入访问码。')}const value=await response.json();if(!response.ok)throw Error(value.error||'数据暂时无法读取，请重试。');return value}
async function key(k){
 if(busy||Date.now()<lockedUntil)return;
 if(k==='clear')pin='';else if(k==='delete')pin=pin.slice(0,-1);else if(/^\d$/.test(k)&&pin.length<6)pin+=k;
 dots();if(pin.length!==6)return;busy=true;$('#pin-error').textContent='正在验证…';
 try{const response=await fetch('../api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:pin})});const result=await response.json();if(!response.ok){if(response.status===429)lockedUntil=Date.now()+(result.retryAfter||300)*1000;throw Error(result.error||'验证失败')}pin='';dots();await load()}
 catch(error){$('#pin-error').textContent=error.message==='Failed to fetch'?'连接失败，请重试。':error.message;pin='';dots()}
 finally{busy=false}
}
document.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>key(b.dataset.key));
document.addEventListener('keydown',event=>{if($('#gate').hidden||event.ctrlKey||event.metaKey||event.altKey)return;let k=event.key;if(k==='Backspace')k='delete';if(k==='Escape')k='clear';if(/^\d$/.test(k)||['delete','clear'].includes(k)){event.preventDefault();key(k)}});
setInterval(()=>{if(Date.now()<lockedUntil)$('#pin-error').textContent=`尝试过于频繁，${Math.ceil((lockedUntil-Date.now())/1000)} 秒后重试。`;else if(lockedUntil){lockedUntil=0;$('#pin-error').textContent='可以重新输入访问码。'}},1000);
async function load(){
 const token=++generation;$('#load-state').textContent='正在读取…';$('#refresh').disabled=true;
 selectedUser=null;detailGeneration++;$('#learner-detail').hidden=true;
 try{
  const result=await api(`learners?days=${$('#period').value}&page=${userPage}&search=${encodeURIComponent($('#user-search').value.trim())}`);
  if(token!==generation)return;data=result;render();$('#load-state').textContent='';$('#pin-error').textContent='';$('#gate').hidden=true;$('#dashboard').hidden=false;
 }catch(error){if(token===generation){if($('#dashboard').hidden)$('#pin-error').textContent=error.message==='请重新输入访问码。'?'':error.message;else $('#load-state').textContent=error.message+' 当前数据未更新。'}}
 finally{if(token===generation)$('#refresh').disabled=false}
}
function render(){
 const t=data.totals;
 $('#scope').textContent=`近 ${$('#period').value} 个自然日 · 上海时区 · 刷新于 ${new Date().toLocaleTimeString('zh-CN',{timeZone:'Asia/Shanghai'})}`;
 const items=[['匿名用户',fmt(t.users),'按浏览器标识去重'],['答题记录',fmt(t.answers),'包含重复练习；正文另列'],['总体正确率',pct(t.correct,t.graded),`${fmt(t.correct)} / ${fmt(t.graded)} 次已判定`],['简答题原文',fmt(t.openAnswers),'用户提交消息数'],['对话消息',fmt(t.messages),'包含用户与 JOJO']];
 $('#metrics').innerHTML=items.map(([label,value,detail])=>`<div><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-detail">${detail}</div></div>`).join('');
 const chapter=$('#chapter').value;
 $('#chapter').innerHTML='<option value="all">全部章节</option>'+data.chapters.map(c=>`<option value="${c.id}">${esc(c.title)}</option>`).join('');$('#chapter').value=chapter;
 renderQuestions();
 $('#users').innerHTML=data.users.length?data.users.map(u=>`<tr><td><button class="user-link" data-user="${u.id}">${esc(u.label)}</button><small>${u.starts} 轮练习</small></td><td><span class="depth-value">${u.depth} / ${u.totalQuestions}</span><progress max="${u.totalQuestions}" value="${u.depth}" aria-label="答题深度 ${u.depth} / ${u.totalQuestions}"></progress></td><td>${u.chapters} / ${data.chapters.length}</td><td>${u.correct} / ${u.graded}</td><td>${pct(u.correct,u.graded)}</td><td>${u.openAnswers}</td><td>${date(u.lastActive)}</td></tr>`).join(''):'<tr><td colspan="7" class="empty-cell">当前范围暂无匹配用户。</td></tr>';
 $('#user-count').textContent=`${fmt(data.total)} 位用户`;$('#user-page').textContent=`第 ${userPage+1} / ${Math.max(1,Math.ceil(data.total/data.pageSize))} 页`;
 $('#user-prev').disabled=userPage===0;$('#user-next').disabled=(userPage+1)*data.pageSize>=data.total;
 document.querySelectorAll('[data-user]').forEach(button=>button.onclick=()=>openUser(button.dataset.user));
 $('#recording-since').textContent=`简答与对话正文从 ${date(t.recordingSince)} 起接入。此前服务器未保存正文，无法恢复；后续继续对话时，可同步该浏览器仍保存的同题历史。数字统计与正文覆盖时间可能不同。`;
}
function renderQuestions(){
 if(!data)return;
 const chapter=$('#chapter').value,sort=$('#question-sort').value;
 const rows=data.questions.filter(q=>chapter==='all'||q.chapter===Number(chapter));
 rows.sort((a,b)=>sort==='accuracy'?(a.graded?a.correct/a.graded:2)-(b.graded?b.correct/b.graded:2)||a.id-b.id:sort==='answers'?b.answers-a.answers:a.id-b.id);
 $('#questions').innerHTML=rows.map(q=>`<tr><td><strong>${q.id+1}. ${esc(q.title)}</strong><small>${esc(q.chapterName)} · ${q.kind==='open'?'简答题 · AI 判定':'选择题'}</small></td><td>${q.users}</td><td>${q.answers}</td><td>${q.correct} / ${q.graded}</td><td>${pct(q.correct,q.graded)}</td></tr>`).join('');
}
async function openUser(id){
 selectedUser=id;recordPage=0;transcriptNodes.clear();$('#transcripts').replaceChildren();$('#answer-history').replaceChildren();$('#learner-summary').textContent='';$('#learner-title').textContent='访客 '+id.slice(0,10);$('#learner-detail').hidden=false;$('#records-more').hidden=true;
 $('#learner-title').focus({preventScroll:true});$('#learner-detail').scrollIntoView({behavior:'smooth',block:'start'});await loadRecords(true);
}
async function loadRecords(first=false){
 const id=selectedUser,token=++detailGeneration;$('#detail-status').textContent='正在读取作答与对话…';$('#records-more').disabled=true;
 try{
  const d=await api(`learner?id=${encodeURIComponent(id)}&days=${$('#period').value}&page=${recordPage}`);
  if(token!==detailGeneration||selectedUser!==id)return;
  if(first){
   $('#learner-summary').textContent=`答题深度 ${d.depth} / ${d.totalQuestions} · 涉及 ${d.chapters} 章 · 答题记录 ${d.answers.length} 次 · 正确率 ${pct(d.correct,d.graded)}（${d.correct} / ${d.graded} 次已判定）`;
   $('#answer-history').innerHTML=d.answers.length?`<table><thead><tr><th>题目</th><th>题型</th><th>判定</th><th>时间</th></tr></thead><tbody>${d.answers.map(a=>`<tr><td>${a.course===1?'旧版 · ':''}${a.q+1}. ${esc(a.title)}</td><td>${a.kind==='open'?'简答':'选择'}</td><td><span class="outcome ${a.correct===null?'ungraded':a.correct?'right':'wrong'}">${a.correct===null?'未判定':a.correct?'答对':'答错'}</span></td><td>${date(a.ts)}</td></tr>`).join('')}</tbody></table>`:'<p class="empty-cell">暂无答题判定记录。</p>';
  }
  for(const m of d.records){
   let thread=transcriptNodes.get(m.thread);
   if(!thread){thread=document.createElement('details');thread.className='transcript';thread.open=true;thread.innerHTML=`<summary>${m.q+1}. ${esc(m.title)} <small>${m.kind==='open'?'简答题':'选择题讨论'}</small></summary><p class="transcript-question">${esc(m.question)}</p><ol class="message-list"></ol>`;$('#transcripts').append(thread);transcriptNodes.set(m.thread,thread)}
   const item=document.createElement('li');item.className='record-message '+m.role;
   item.innerHTML=`<div class="record-meta"><strong>${m.role==='user'?(m.kind==='open'?'用户 · 简答原文':'用户'):'JOJO'}</strong><time>${date(m.ts)}</time>${m.correct!==null?`<span class="outcome ${m.correct?'right':'wrong'}">AI 判定${m.correct?'答对':'答错'}</span>`:''}</div><p>${esc(m.content)}</p>`;thread.querySelector('ol').append(item);
  }
  $('#records-more').hidden=!d.hasMore;$('#detail-status').textContent=d.messages?`已显示 ${$('#transcripts').querySelectorAll('li').length} / ${d.messages} 条消息`:'本期没有服务器保存的对话正文。历史正文未采集，无法恢复。';
 }catch(error){if(token===detailGeneration){$('#detail-status').textContent=error.message+' 可再次点击重试。';$('#records-more').hidden=false}}
 finally{if(token===detailGeneration)$('#records-more').disabled=false}
}
$('#records-more').onclick=()=>{const count=$('#transcripts').querySelectorAll('li').length;recordPage=Math.floor(count/50);loadRecords(count===0)};
$('#detail-close').onclick=()=>{detailGeneration++;selectedUser=null;$('#learner-detail').hidden=true;$('#transcripts').replaceChildren()};
$('#chapter').onchange=renderQuestions;$('#question-sort').onchange=renderQuestions;
$('#period').onchange=()=>{userPage=0;load()};$('#refresh').onclick=load;
$('#user-prev').onclick=()=>{userPage--;load()};$('#user-next').onclick=()=>{userPage++;load()};
$('#user-search').oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{userPage=0;load()},300)};
$('#logout').onclick=async()=>{generation++;detailGeneration++;try{await api('logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});gate();$('#pin-error').textContent='已退出。'}catch(error){$('#load-state').textContent=error.message}};
load();
