const $=s=>document.querySelector(s),esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const fmt=n=>Number(n).toLocaleString('zh-CN'),pct=(a,b)=>b?`${(100*a/b).toFixed(1)}%`:'—',date=t=>t?new Date(t*1000).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'—';
let period='7',data=null,pin='',busy=false,lockedUntil=0,userPage=0,generation=0,detailGeneration=0,selectedUser=null,recordPage=0,searchTimer;
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
  const result=await api(`learners?days=${period}&page=${userPage}&search=${encodeURIComponent($('#user-search').value.trim())}`);
  if(token!==generation)return;data=result;render();$('#load-state').textContent='';$('#pin-error').textContent='';$('#gate').hidden=true;$('#dashboard').hidden=false;
 }catch(error){if(token===generation){if($('#dashboard').hidden)$('#pin-error').textContent=error.message==='请重新输入访问码。'?'':error.message;else $('#load-state').textContent=error.message+' 当前数据未更新。'}}
 finally{if(token===generation)$('#refresh').disabled=false}
}
function render(){
 const t=data.totals;
 $('#scope').textContent=`${period==='all'?'全部可用数据':`近 ${period} 天`} · ${data.trend.from} 至 ${data.trend.to} · 上海时区 · 刷新于 ${new Date().toLocaleTimeString('zh-CN',{timeZone:'Asia/Shanghai'})}`;
 const items=[['匿名用户',fmt(t.users),'按浏览器标识去重'],['答题记录',fmt(t.answers),'包含重复练习；正文另列'],['总体正确率',pct(t.correct,t.graded),`${fmt(t.correct)} / ${fmt(t.graded)} 次已判定`],['简答题原文',fmt(t.openAnswers),'用户提交消息数'],['对话消息',fmt(t.messages),'包含用户与 JOJO']];
 $('#metrics').innerHTML=items.map(([label,value,detail])=>`<div><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-detail">${detail}</div></div>`).join('');
 const chapter=$('#chapter').value;
 $('#chapter').innerHTML='<option value="all">全部章节</option>'+data.chapters.map(c=>`<option value="${c.id}">${esc(c.title)}</option>`).join('');$('#chapter').value=chapter;
 renderQuestions();drawTrend();
 $('#users').innerHTML=data.users.length?data.users.map(u=>`<tr><td><button class="user-link" data-user="${u.id}">${esc(u.label)}</button><small>${u.starts} 轮练习</small></td><td><span class="depth-value">${u.depth} / ${u.totalQuestions}</span><progress max="${u.totalQuestions}" value="${u.depth}" aria-label="答题深度 ${u.depth} / ${u.totalQuestions}"></progress></td><td>${u.chapters} / ${data.chapters.length}</td><td>${u.correct} / ${u.graded}</td><td>${pct(u.correct,u.graded)}</td><td>${u.openAnswers}</td><td>${date(u.lastActive)}</td></tr>`).join(''):'<tr><td colspan="7" class="empty-cell">当前范围暂无匹配用户。</td></tr>';
 $('#user-count').textContent=`${fmt(data.total)} 位用户`;$('#user-page').textContent=`第 ${userPage+1} / ${Math.max(1,Math.ceil(data.total/data.pageSize))} 页`;
 $('#user-prev').disabled=userPage===0;$('#user-next').disabled=(userPage+1)*data.pageSize>=data.total;
 document.querySelectorAll('[data-user]').forEach(button=>button.onclick=()=>openUser(button.dataset.user));
 $('#recording-since').textContent=`简答与对话正文从 ${date(t.recordingSince)} 起接入。此前服务器未保存正文，无法恢复；后续继续对话时，可同步该浏览器仍保存的同题历史。数字统计与正文覆盖时间可能不同。`;
}
const trendSeries=[
 {key:'views',name:'访问量',unit:'次',axis:'count'},
 {key:'users',name:'用户数',unit:'人',axis:'count'},
 {key:'retention',name:'次日留存率',unit:'%',axis:'percent'},
 {key:'accuracy',name:'正确率',unit:'%',axis:'percent'},
 {key:'depth',name:'使用深度',unit:'题 / 人',axis:'count'}
];
const shownSeries=new Set(trendSeries.map(s=>s.key));let trendCursor=0;
function trendValue(series,value){return value===null||value===undefined?'—':series.axis==='percent'?`${value.toFixed(1)}%`:series.key==='depth'?`${Number(value.toFixed(2))} 题 / 人`:`${fmt(value)} ${series.unit}`}
function niceTrendMax(value){const power=10**Math.floor(Math.log10(Math.max(value,1))),ratio=value/power;return (ratio<=1?1:ratio<=2?2:ratio<=5?5:10)*power}
function drawTrend(){
 const rows=data?.trend?.days||[],active=trendSeries.filter(s=>shownSeries.has(s.key)),host=$('#trend-chart');
 if(!$('#trend-legend').children.length){
 $('#trend-legend').innerHTML=trendSeries.map(s=>`<label class="trend-toggle legend-${s.key}"><input type="checkbox" data-series="${s.key}" ${shownSeries.has(s.key)?'checked':''}><span class="metric-dot" aria-hidden="true"></span><span>${s.name}</span></label>`).join('');
 $('#trend-legend').querySelectorAll('input').forEach(input=>input.onchange=()=>{input.checked?shownSeries.add(input.dataset.series):shownSeries.delete(input.dataset.series);drawTrend()});
 }
 $('#trend-note').textContent='访问量、用户数和使用深度看左侧数量刻度；留存率与正确率看右侧百分比。留存的次日尚未结束时显示「待观察」。';
 $('#trend-table').innerHTML=`<table><thead><tr><th>日期</th>${trendSeries.map(s=>`<th>${s.name}</th>`).join('')}<th>次日回来 / 首次出现</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.day}${r.covered?'':' · 未采集'}</td>${trendSeries.map(s=>`<td>${trendValue(s,r[s.key])}</td>`).join('')}<td>${!r.cohort?'—':r.retentionMature?`${r.returned} / ${r.cohort}`:`待观察 / ${r.cohort}`}</td></tr>`).join('')}</tbody></table>`;
 $('#trend-tooltip').hidden=true;
 if(!active.length){host.innerHTML='<div class="trend-empty">选择上方任意指标，即可查看趋势。</div>';return}
 if(!rows.some(r=>active.some(s=>r[s.key]!==null&&r[s.key]!==undefined))){host.innerHTML='<div class="trend-empty">当前范围暂无这些指标的有效数据。</div>';return}
 const W=Math.max(320,Math.round($('#trend-plot').getBoundingClientRect().width)||900),H=300,left=44,right=48,top=26,bottom=36,plotW=W-left-right,plotH=H-top-bottom;
 const counts=active.filter(s=>s.axis==='count'),hasPercent=active.some(s=>s.axis==='percent');
 const max=niceTrendMax(Math.max(1,...rows.flatMap(r=>counts.map(s=>r[s.key]??0))));
 const x=i=>left+(rows.length===1?plotW/2:i*plotW/(rows.length-1)),y=(s,value)=>top+plotH*(1-value/(s.axis==='percent'?100:max));
 let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" tabindex="0" aria-label="关键指标每日趋势，左右方向键查看日期，详情可展开每日数值表">`;
 for(let i=0;i<=4;i++){
  const yy=top+plotH*i/4,count=max*(4-i)/4;
  svg+=`<line class="trend-grid" x1="${left}" y1="${yy}" x2="${W-right}" y2="${yy}"/>`;
  if(counts.length)svg+=`<text class="trend-axis" x="${left-10}" y="${yy+4}" text-anchor="end">${Number(count.toFixed(1))}</text>`;
  if(hasPercent)svg+=`<text class="trend-axis" x="${W-right+9}" y="${yy+4}">${100-i*25}%</text>`;
 }
 if(counts.length)svg+=`<text class="trend-axis" x="${left}" y="13">数量</text>`;
 if(hasPercent)svg+=`<text class="trend-axis" x="${W-right}" y="13" text-anchor="end">百分比</text>`;
 const ticks=Math.min(rows.length,Math.max(2,Math.floor(plotW/105))),indices=new Set(Array.from({length:ticks},(_,i)=>Math.round(i*(rows.length-1)/Math.max(1,ticks-1))));
 for(const i of indices)svg+=`<text class="trend-axis" x="${x(i)}" y="${H-10}" text-anchor="middle">${rows[i].day.slice(5)}</text>`;
 for(const s of active){
  let path='',connected=false;
  rows.forEach((r,i)=>{const v=r[s.key];if(v===null||v===undefined){connected=false;return}path+=`${connected?'L':'M'}${x(i).toFixed(2)},${y(s,v).toFixed(2)} `;connected=true});
  svg+=`<g class="trend-line line-${s.key}"><path d="${path}"/>${rows.map((r,i)=>r[s.key]===null||r[s.key]===undefined?'':`<circle cx="${x(i)}" cy="${y(s,r[s.key])}" r="2.4"/>`).join('')}</g>`;
 }
 svg+=`<line id="trend-cursor" class="trend-cursor" visibility="hidden" x1="0" x2="0" y1="${top}" y2="${H-bottom}"/></svg>`;
 host.innerHTML=svg;const drawing=host.querySelector('svg');
 function showPoint(index){
  trendCursor=Math.max(0,Math.min(rows.length-1,index));const row=rows[trendCursor],tip=$('#trend-tooltip'),cursor=$('#trend-cursor');
  cursor.setAttribute('x1',x(trendCursor));cursor.setAttribute('x2',x(trendCursor));cursor.setAttribute('visibility','visible');
  tip.innerHTML=`<strong>${row.day}${row.covered?'':' · 未采集'}</strong>${active.map(s=>{
   let detail=row.covered?trendValue(s,row[s.key]):'未采集';
   if(s.key==='retention'&&row.covered)detail=!row.cohort?'无首次出现用户':!row.retentionMature?'待观察':`${detail}（${row.returned} / ${row.cohort}）`;
   if(s.key==='accuracy'&&row.graded)detail+=`（${row.correct} / ${row.graded}）`;
   return `<div class="legend-${s.key}"><span class="metric-dot" aria-hidden="true"></span><span>${s.name}</span><b>${detail}</b></div>`;
  }).join('')}`;
  tip.hidden=false;tip.style.left=Math.max(0,Math.min(W-tip.offsetWidth,x(trendCursor)+12))+'px';
 }
 drawing.onpointermove=event=>{const rect=drawing.getBoundingClientRect(),px=(event.clientX-rect.left)*W/rect.width;showPoint(rows.length===1?0:Math.round((px-left)/plotW*(rows.length-1)))};
 drawing.onpointerdown=drawing.onpointermove;
 drawing.onpointerleave=()=>{$('#trend-tooltip').hidden=true;$('#trend-cursor')?.setAttribute('visibility','hidden')};
 drawing.onfocus=()=>showPoint(trendCursor);
 drawing.onblur=drawing.onpointerleave;
 drawing.onkeydown=event=>{let next=trendCursor;if(event.key==='ArrowLeft')next--;else if(event.key==='ArrowRight')next++;else if(event.key==='Home')next=0;else if(event.key==='End')next=rows.length-1;else return;event.preventDefault();showPoint(next)};
}
function selectPeriod(button){
 period=button.dataset.period;userPage=0;
 document.querySelectorAll('[data-period]').forEach(tab=>{const selected=tab===button;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1});
 $('#data-content').setAttribute('aria-labelledby',button.id);load();
}
document.querySelectorAll('[data-period]').forEach((button,index,all)=>{
 button.onclick=()=>selectPeriod(button);
 button.onkeydown=event=>{let next=index;if(event.key==='ArrowRight')next=(index+1)%all.length;else if(event.key==='ArrowLeft')next=(index+all.length-1)%all.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=all.length-1;else return;event.preventDefault();selectPeriod(all[next]);all[next].focus()};
});
let chartWidth=0;new ResizeObserver(entries=>{const width=Math.round(entries[0].contentRect.width);if(width&&width!==chartWidth){chartWidth=width;if(data)drawTrend()}}).observe($('#trend-plot'));

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
  const d=await api(`learner?id=${encodeURIComponent(id)}&days=${period}&page=${recordPage}`);
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
$('#refresh').onclick=load;
$('#user-prev').onclick=()=>{userPage--;load()};$('#user-next').onclick=()=>{userPage++;load()};
$('#user-search').oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{userPage=0;load()},300)};
$('#logout').onclick=async()=>{generation++;detailGeneration++;try{await api('logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});gate();$('#pin-error').textContent='已退出。'}catch(error){$('#load-state').textContent=error.message}};
load();
