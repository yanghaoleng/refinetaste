/* Opening choices are editable expression aids, never personality labels. */
(()=>{
 const scenes={
  enjoy:{title:'最近有空时，你比较常做什么？',items:{video:['看剧、电影、视频',['故事角色','放松一下','学到东西','和别人聊得上','画面或音乐','暂时不用想别的']],games:['玩游戏',['熟悉省心','探索新东西','挑战过关','和朋友一起','故事角色','暂时不用想别的']],reading:['阅读、听播客',['一个具体问题','故事经历','新鲜观点','安静独处','别人推荐','随手看看']],outside:['运动、出门',['身体舒服些','换个环境','看点新东西','和人一起','喜欢这项活动','暂时不用想别的']],people:['和人聊天',['有人听我说','听别人的经历','一起玩','聊一个问题','熟悉安心','说不上来']],other:['其他或想不起来',['想自己补充','暂时想不起来']] }},
  concern:{title:'最近哪方面比较让你挂心？',items:{work:['工作、学习',['事情太多','不知怎么开始','期待或评价','和人配合','方向不清楚','说不上来']],relations:['和人的关系',['难开口','想被理解','想留点空间','常在照顾别人','有分歧','说不上来']],energy:['休息、精力',['没时间休息','很累','停下来也不放松','作息不固定','想独处','说不上来']],decision:['做一个选择',['想法打架','信息不够','现实限制','在意别人的看法','怕选错','说不上来']],other:['说不上来',['只想先歇歇','想自己补充','暂时不聊原因']]}}
 };
 const create=()=>({open:true,step:'side',branch:null,scenes:[],tags:{},custom:''});
 const clone=x=>JSON.parse(JSON.stringify(x));
 function branch(g,value){if(!scenes[value])return g;return {...create(),branch:value,step:'scene'}}
 function toggleScene(g,id){if(!scenes[g.branch]?.items[id])return g;const next=clone(g);if(next.scenes.includes(id)){next.scenes=next.scenes.filter(x=>x!==id);delete next.tags[id]}else if(next.scenes.length<3)next.scenes.push(id);return next}
 function toggleTag(g,id,tag){if(!g.scenes.includes(id)||![...scenes[g.branch].items[id][1],'都不太像'].includes(tag))return g;const next=clone(g),current=next.tags[id]||[];next.tags[id]=tag==='都不太像'?(current.includes(tag)?[]:[tag]):current.includes(tag)?current.filter(x=>x!==tag):[...current.filter(x=>x!=='都不太像'),tag];return next}
 function summary(g){const lines=['我在开场点选中选了：'+(g.branch==='enjoy'?'最近喜欢做的事':'最近有点困扰的事')];for(const id of g.scenes){const item=scenes[g.branch].items[id];lines.push(item[0]+((g.tags[id]||[]).length?'（'+g.tags[id].join('、')+'）':''))}if(g.custom.trim())lines.push('我补充：'+g.custom.trim());return lines.join('；')+'。这些是我此刻选的线索，还没有展开具体经历。'}
 function question(g){const id=g.scenes[0],tags=g.tags[id]||[];if(id==='games')return tags.includes('熟悉省心')?'有没有一个你总会回去玩的游戏？':'最近玩哪个游戏时，你想多停留一会儿？';return {video:'最近有没有一个片段，让你多停留了一会儿？',reading:'最近读到或听到什么，让你记着了？',outside:'最近哪次出门或活动，让你觉得还不错？',people:'最近哪次聊天，让你记着了？',work:'最近有哪件具体的事，让你比较挂心？',relations:'最近和人相处时，哪件事让你记着了？',energy:'最近哪次让你特别想歇一歇？',decision:'眼下是哪一个选择，让你拿不定主意？'}[id]||'可以慢慢来，最近有没有一件小事，你愿意说说？'}
 window.RuruOpening={scenes,create,branch,toggleScene,toggleTag,summary,question};
})();
