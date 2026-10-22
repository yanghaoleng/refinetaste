/* Only bounded emphasis and known concepts become markup; arbitrary HTML stays text. */
(()=>{
 const principles=['对比原则','对齐原则','重复原则','亲密性原则','一致性原则','主体清晰','风格一致','承诺真实','自主选择','场景匹配','概念一致','条件可读','视觉焦点','视线引导','图文互补','连续叙事','翻页悬念','视点运用','细节呼应','气氛塑造','品牌一致性','风格与一致性','场景与调性','一致性','信息层级'];
 const definitions={
  "信息层级": "把信息排出先后顺序，让人先看到重点，再读补充内容。",
  "视觉焦点": "画面里最先吸引你目光的地方。大小、颜色和位置都能帮它突出。",
  "对比度": "两个元素看起来差得有多明显。比如深色文字放在浅底上，通常更容易看清。",
  "认知负荷": "理解一件事需要花多少脑力。信息太多、关系太乱，就会让人看得累。",
  "渐进披露": "先展示眼下最需要的信息，等用户需要时，再展开细节。",
  "信息架构": "给内容分组、起名字、安排位置，让用户知道东西在哪、该怎么找。",
  "视觉锚点": "帮助眼睛定位的参照物。比如固定位置的标题，让你换页后也能快速找到重点。",
  "用户路径": "用户从开始到完成目标所经过的步骤，比如点活动入口、了解规则、领取优惠。",
  "图文互补": "文字和画面各自补充不同的信息，合起来才能读懂更完整的故事。",
  "连续叙事": "用前后有关联的画面交代事情如何发展，让人跟得上故事。",
  "翻页悬念": "在一页结束时留下一个未解的问题，让读者想翻到下一页找答案。",
  "视线引导": "用人物目光、线条或位置关系，带着读者的眼睛看向重要的地方。",
  "品牌一致性": "同一个品牌在配色、字体和表达方式上保持共同特点，让人容易认出来。",
  "字间距": "相邻文字之间的距离。太挤不易辨认，太散又不容易连起来读。",
  "行间距": "上下两行文字之间的距离。留得合适，眼睛就更容易接着往下读。",
  "字号": "文字的大小。通常重要内容可以大一些，但还要结合阅读距离和屏幕大小。",
  "字重": "文字笔画的粗细。加粗可以强调重点，用得太多就分不出主次了。",
  "留白": "内容周围有意留出的空地方。它能分清不同内容，也让重点更显眼。",
  "主次关系": "让人看出哪些最重要、哪些是补充，避免所有内容同时抢注意力。",
  "主标题": "最主要的标题，用来快速告诉读者这段内容在讲什么。",
  "次要信息": "对理解有帮助、但不用第一眼就看到的补充内容，比如说明和备注。",
  "转化率": "看到或进入某个流程的人中，最终完成目标的人占多少，比如完成报名的比例。",
  "承接页": "点击入口后到达的页面。它应该接住入口的承诺，让用户继续完成刚才想做的事。",
  "受众": "这份设计主要给谁看、给谁用。不同人的需求和理解方式可能不同。",
  "视点": "读者仿佛从什么位置看画面，比如远处、近处或人物的眼睛所在的位置。"
};
 const concepts=Object.keys(definitions);
 const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const terms=[...new Set([...principles,...concepts])].sort((a,b)=>b.length-a.length);
 function render(value){
  const text=String(value),seen=new Set();let result='',position=0,bold=0,links=0;
  while(position<text.length){
   const term=terms.find(word=>text.startsWith(word,position));
   if(term){let markup=escape(term);if(!seen.has(term)){
    if(concepts.includes(term)&&links<5){markup=`<button type="button" class="concept-term" data-concept-term="${escape(term)}" aria-label="解释概念：${escape(term)}" aria-expanded="false" aria-haspopup="dialog">${markup}</button>`;links++}
    if(principles.includes(term)&&bold<2){markup=`<strong>${markup}</strong>`;bold++}seen.add(term)
   }result+=markup;position+=term.length;continue}
   // A short explicit **emphasis** from the model is safe; never parse HTML or links.
   if(text.startsWith('**',position)&&bold<2){const end=text.indexOf('**',position+2);if(end>position+2&&end-position<=26){result+=`<strong>${escape(text.slice(position+2,end))}</strong>`;bold++;position=end+2;continue}}
   result+=escape(text[position]);position++;
  }
  return result;
 }
 let popup=null,anchor=null;
 function close(){if(!popup)return;anchor?.setAttribute('aria-expanded','false');popup.remove();popup=null;anchor=null}
 function place(){
  if(!popup||!anchor?.isConnected){close();return}
  const rect=anchor.getBoundingClientRect(),bounds=window.visualViewport;
  const left=bounds?.offsetLeft||0,top=bounds?.offsetTop||0,width=bounds?.width||window.innerWidth,height=bounds?.height||window.innerHeight;
  popup.style.maxWidth=`${Math.min(280,width-32)}px`;
  const box=popup.getBoundingClientRect();
  popup.style.left=`${Math.max(left+16,Math.min(rect.left,left+width-box.width-16))}px`;
  popup.style.top=`${Math.max(top+12,Math.min(rect.bottom+10,top+height-box.height-12))}px`;
 }
 document.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-concept-term]');if(!button)return;
  if(anchor===button){close();return}close();
  const term=button.dataset.conceptTerm;if(!definitions[term])return;
  anchor=button;popup=document.createElement('aside');popup.className='concept-popover';popup.id='concept-explanation';popup.setAttribute('role','dialog');popup.setAttribute('aria-label',term+'的解释');popup.setAttribute('popover','manual');
  popup.innerHTML=`<div class="concept-popover-heading"><strong>${escape(term)}</strong><button type="button" aria-label="关闭解释">×</button></div><p>${escape(definitions[term])}</p>`;
  (button.closest('dialog[open]')||document.body).append(popup);
  button.setAttribute('aria-expanded','true');button.setAttribute('aria-controls',popup.id);
  popup.querySelector('button').onclick=close;
  if(popup.showPopover)popup.showPopover();place();
 });
 document.addEventListener('pointerdown',event=>{if(popup&&!popup.contains(event.target)&&!event.target.closest?.('[data-concept-term]'))close()});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&popup){event.preventDefault();event.stopPropagation();const target=anchor;close();target?.focus({preventScroll:true})}},true);
 document.addEventListener('scroll',event=>{if(popup&&!popup.contains(event.target))place()},true);
 document.addEventListener('close',close,true);
 window.addEventListener?.('resize',close);
 window.RefineRichText={render};
})();
