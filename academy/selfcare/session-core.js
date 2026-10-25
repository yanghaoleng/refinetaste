/* Only this session key is mutable here. Legacy progress and notebooks stay separate. */
(()=>{
 const key='selfcare-exploration-session-v1',sections=[['question','本次想弄清的问题'],['clues','目前出现的线索'],['context','关切、外界标准与现实限制'],['uncertainties','仍不确定的地方'],['directions','愿意继续探索的方向']];
 const copy=value=>JSON.parse(JSON.stringify(value));
 function create(id){return {schema:1,id,revision:0,messages:[],reports:[],draft:'',view:'chat',paused:false,updatedAt:new Date().toISOString()}}
 function add(session,message){const next=copy(session);next.messages.push(message);next.revision++;next.updatedAt=new Date().toISOString();return next}
 function acceptReport(session,result,id){if(result.basedOnRevision!==session.revision)throw Error('会谈已更新，请重新整理。');const next=copy(session);next.reports.push({id,version:next.reports.length+1,basedOnRevision:session.revision,createdAt:new Date().toISOString(),...copy(result.report)});next.view='report';return next}
 function edit(session,reportIndex,section,index,replacement,message){const next=add(session,message),report=copy(next.reports[reportIndex]);report.id=message.id;report.version=next.reports.length+1;report.createdAt=new Date().toISOString();report.sections[section][index]={text:replacement,status:'user_edited',evidence:[{messageId:message.id,quote:replacement}]};next.reports.push(report);return next}
 function latest(session){return session.reports.at(-1)||null}
 function stale(session,report=latest(session)){return !!report&&report.basedOnRevision!==session.revision}
 function proofValid(entries){return Array.isArray(entries)&&entries.every(e=>e&&typeof e.messageId==='string'&&typeof e.quote==='string')}
 function claimValid(item){return item&&typeof item.text==='string'&&['explicit','tentative','not_explored','user_edited'].includes(item.status)&&proofValid(item.evidence)}
 function valid(session){return session?.schema===1&&typeof session.id==='string'&&Number.isInteger(session.revision)&&session.revision>=0&&Array.isArray(session.messages)&&session.messages.every(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string'&&typeof m.id==='string'&&(!m.checkIn||(typeof m.checkIn.text==='string'&&proofValid(m.checkIn.evidence))))&&Array.isArray(session.reports)&&session.reports.every(r=>r&&Number.isInteger(r.version)&&Number.isInteger(r.basedOnRevision)&&r.sections&&sections.every(([key])=>Array.isArray(r.sections[key])&&r.sections[key].every(claimValid))&&Array.isArray(r.courses)&&r.courses.every(c=>c&&Number.isInteger(c.chapterId)&&typeof c.title==='string'&&typeof c.reason==='string'&&proofValid(c.evidence)))}
 function capacity(messages){return messages.length<=200&&messages.reduce((sum,m)=>sum+m.content.length,0)<=24000}
 function exportReport(report){const labels={explicit:'来自你的话',tentative:'待核对的推测',not_explored:'还没聊到',user_edited:'你的修改'},proof=entries=>entries.map(e=>'\n依据：你说“'+e.quote+'”').join('');return ['重要性感受探索报告 · 第 '+report.version+' 版','基于本次会谈的暂时整理，可修改；不是心理测评。',...sections.flatMap(([key,title])=>['\n'+title,...report.sections[key].map(item=>'['+labels[item.status]+'] '+item.text+proof(item.evidence))]),...(report.courses.length?['\n可选的课程方向',...report.courses.map(c=>c.title+'：'+c.reason+proof(c.evidence))]:[])].join('\n')}
 window.RuruExploration={key,sections,create,add,acceptReport,edit,latest,stale,valid,capacity,exportReport};
})();
