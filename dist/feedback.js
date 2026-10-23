/* A small contact panel anchored above the footer entry. */
(()=>{
 const entry=document.querySelector('.feedback-entry'),trigger=document.querySelector('#feedback-trigger'),panel=document.querySelector('#feedback-panel');if(!entry||!trigger||!panel)return;
 let timer=null,pinned=false,uid=null,identityPending=false;
 const uidButton=document.querySelector('#feedback-uid'),uidValue=document.querySelector('#feedback-uid-value');
 async function loadUid(){
  if(uid||identityPending||!uidButton)return;identityPending=true;
  try{uid=await window.RefineMetrics?.identity();uidValue.textContent=uid||'暂不可用';uidButton.disabled=!uid;place()}
  catch{uidValue.textContent='暂不可用';uidButton.disabled=true}
  finally{identityPending=false}
 }
 function place(){if(panel.hidden)return;const anchor=trigger.getBoundingClientRect(),box=panel.getBoundingClientRect();panel.style.left=Math.max(16,Math.min(anchor.left+anchor.width/2-box.width/2,innerWidth-box.width-16))+'px';panel.style.top=Math.max(16,anchor.top-box.height-10)+'px'}
 function show(){clearTimeout(timer);panel.hidden=false;trigger.setAttribute('aria-expanded','true');place();loadUid()}
 function hide(){clearTimeout(timer);pinned=false;panel.hidden=true;trigger.setAttribute('aria-expanded','false')}
 function later(){if(pinned)return;clearTimeout(timer);timer=setTimeout(hide,160)}
 entry.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')show()});entry.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse')later()});
 panel.addEventListener('pointerenter',()=>clearTimeout(timer));panel.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse')later()});
 trigger.addEventListener('click',()=>{pinned=true;show()});entry.addEventListener('focusin',show);entry.addEventListener('focusout',event=>{if(!entry.contains(event.relatedTarget))hide()});
 document.addEventListener('pointerdown',event=>{if(!entry.contains(event.target))hide()});
 entry.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();trigger.focus();hide()}});
 window.addEventListener('resize',place);document.addEventListener('scroll',place,true);
 async function copyValue(value,focused,message='复制成功'){
  const field=document.createElement('textarea');field.value=value;field.readOnly=true;field.tabIndex=-1;field.style.cssText='position:fixed;opacity:0;pointer-events:none';panel.append(field);field.select();field.setSelectionRange(0,value.length);
  let copied=false;try{copied=document.execCommand('copy')}catch{}finally{field.remove();focused?.focus({preventScroll:true})}
  try{if(!copied)await navigator.clipboard.writeText(value);pinned=true;show();window.RefineToast?.success(message)}catch{window.RefineToast?.error('复制失败，请再试一次')}
 }
 const wechat=document.querySelector('#feedback-wechat');
 wechat.addEventListener('click',()=>copyValue('yanghaoleng',wechat));
 uidButton?.addEventListener('click',()=>{if(uid)return copyValue(uid,uidButton,'UID 已复制')});
})();
