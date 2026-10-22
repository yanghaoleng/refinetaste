/* Only bounded emphasis and known concepts become markup; arbitrary HTML stays text. */
(()=>{
 const principles=['对比原则','对齐原则','重复原则','亲密性原则','一致性原则','主体清晰','风格一致','承诺真实','自主选择','场景匹配','概念一致','条件可读','视觉焦点','视线引导','图文互补','连续叙事','翻页悬念','视点运用','细节呼应','气氛塑造','品牌一致性','风格与一致性','场景与调性','一致性','信息层级'];
 const concepts=['信息层级','视觉焦点','对比度','认知负荷','渐进披露','信息架构','视觉锚点','用户路径','图文互补','连续叙事','翻页悬念','视线引导','品牌一致性','字间距','行间距','字号','字重','留白','主次关系','主标题','次要信息','转化率','承接页','受众','视点'];
 const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const terms=[...new Set([...principles,...concepts])].sort((a,b)=>b.length-a.length);
 function render(value){
  const text=String(value),seen=new Set();let result='',position=0,bold=0,links=0;
  while(position<text.length){
   const term=terms.find(word=>text.startsWith(word,position));
   if(term){let markup=escape(term);if(!seen.has(term)){
    if(concepts.includes(term)&&links<5){markup=`<button type="button" class="concept-term" data-copy-term="${escape(term)}" aria-label="复制概念：${escape(term)}">${markup}</button>`;links++}
    if(principles.includes(term)&&bold<2){markup=`<strong>${markup}</strong>`;bold++}seen.add(term)
   }result+=markup;position+=term.length;continue}
   // A short explicit **emphasis** from the model is safe; never parse HTML or links.
   if(text.startsWith('**',position)&&bold<2){const end=text.indexOf('**',position+2);if(end>position+2&&end-position<=26){result+=`<strong>${escape(text.slice(position+2,end))}</strong>`;bold++;position=end+2;continue}}
   result+=escape(text[position]);position++;
  }
  return result;
 }
 document.addEventListener('click',async event=>{
  const button=event.target.closest?.('[data-copy-term]');if(!button)return;
  const term=button.dataset.copyTerm;
  try{
   const active=document.activeElement,textarea=document.createElement('textarea');textarea.value=term;textarea.style.cssText='position:fixed;opacity:0;pointer-events:none';(document.querySelector('#training[open]')||document.body).append(textarea);textarea.select();let copied=false;try{copied=document.execCommand('copy')}finally{textarea.remove();active?.focus({preventScroll:true})}
   if(!copied){if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(term)}
   window.RefineToast.success(`已复制「${term}」`);
  }catch{window.RefineToast.error('复制未完成，请长按文字复制')}
 });
 window.RefineRichText={render};
})();
