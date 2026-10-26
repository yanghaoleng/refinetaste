/* RURU reuses lesson motion, the single guide, and the shared compact composer. */
(()=>{
 const seen=new Map();let menu=null,layout=null;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 function closeMenu(focus=false){if(!menu)return;const old=menu;menu=null;old.trigger.setAttribute('aria-expanded','false');if(old.panel.hidePopover)try{old.panel.hidePopover()}catch{}else old.panel.hidden=true;if(focus&&old.trigger.isConnected)old.trigger.focus()}
 function before(){closeMenu();document.querySelector('.training-top .ruru-tools')?.remove();const dialog=document.getElementById('training'),exercise=document.getElementById('exercise');layout=dialog?{key:exercise?.dataset.ruruView,nearBottom:dialog.scrollHeight-dialog.scrollTop-dialog.clientHeight<240,scrollTop:dialog.scrollTop,hadMessages:!!exercise?.querySelector('[data-ruru-message]')}:null;const avatar=document.getElementById('coach-avatar');if(avatar?.closest('#exercise'))window.RefineGuide?.hold()}
 function follow(){const latest=[...document.querySelectorAll('#exercise [data-ruru-message]')].at(-1);if(!latest)return false;let anchor=latest.querySelector('.coach-avatar-target');if(!anchor){anchor=document.createElement('span');anchor.className='coach-avatar-target';latest.prepend(anchor)}if(!window.RefineGuide?.follow)return false;window.RefineGuide.follow(anchor);return true}
 function after(key,messages){
  const prior=seen.get(key),fresh=prior?messages.filter(m=>!prior.has(m.id)):[];seen.set(key,new Set(messages.map(m=>m.id)));
  const rows=[...document.querySelectorAll('#exercise [data-ruru-message]')];
  for(const m of fresh){const row=rows.find(el=>el.dataset.ruruMessage===m.id);if(row&&!reduced()){animateMessage(row);window.RefineText?.text(row.querySelector('.chat-bubble>p'))}}
  if(!follow())window.RefineGuide?.home();
  const exercise=document.getElementById('exercise'),dialog=document.getElementById('training'),same=layout?.key===key;exercise.dataset.ruruView=key;
  const last=rows.at(-1);if(last&&((!prior&&messages.length)||fresh.length&&(fresh.some(m=>m.role==='user')||same&&layout.nearBottom)))requestAnimationFrame(()=>{if(last.isConnected)last.scrollIntoView({block:'nearest',behavior:reduced()?'instant':'smooth'})});else if(dialog&&same&&layout.hadMessages&&rows.length)dialog.scrollTop=layout.scrollTop;
 }
 function composer(id,label,draft,pending){return `<form id="${id}-form" class="ruru-chat-form"><div class="chat-composer"><label class="sr-only" for="${id}-input">${esc(label)}</label><textarea id="${id}-input" maxlength="2000" rows="1" autocomplete="off" placeholder="随便聊聊" ${pending?'disabled':''}>${esc(draft||'')}</textarea><button type="submit" id="${id}-send" aria-label="发送消息" ${pending||!draft?.trim()?'disabled':''}>${icon('arrow-up')}</button></div></form>`}
 function bindComposer(input){
  let composing=false;input.addEventListener('compositionstart',()=>composing=true);input.addEventListener('compositionend',()=>composing=false);
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&(composing||e.isComposing||e.keyCode===229))e.stopImmediatePropagation()});
  input.form.addEventListener('submit',e=>{if(composing){e.preventDefault();e.stopImmediatePropagation()}});
  bindChatComposer(input);const update=()=>{input.form.querySelector('[type="submit"]').disabled=input.disabled||!input.value.trim()};input.addEventListener('input',update);update();
 }
 function privacy(id,report=false){return `<details class="ruru-privacy"><summary>对话隐私如何保护</summary><p>对话不会自动公开。${report?'对话和报告':'盘点和聊天'}保存在这台设备的浏览器，不会跨设备同步。${report?'发送消息或整理报告时，本站会把本次对话和已有报告':'主动点聊聊或发送补充时，本站会把这份盘点和本次对话'}交给现有 AI 服务处理，不写入本站学习对话库；请求仍受服务器和 AI 服务的处理规则约束。清除只影响本机，无法撤回已发送的内容。</p></details>`}
 function tools(id,items){return `<div class="ruru-tools"><button id="${id}-tools-toggle" type="button" class="ruru-tools-toggle" aria-label="会谈菜单" aria-haspopup="menu" aria-expanded="false" aria-controls="${id}-tools-menu"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button><div id="${id}-tools-menu" class="ruru-tools-menu" role="menu" popover="auto">${items}</div></div>`}
 function bindMenu(id){
  const trigger=document.getElementById(id+'-tools-toggle'),panel=document.getElementById(id+'-tools-menu');if(!trigger||!panel)return;
  document.querySelector('.training-top')?.append(trigger.closest('.ruru-tools'));
  const state={trigger,panel};if(!panel.showPopover){panel.hidden=true;panel.classList.add('ruru-menu-fallback')}
  panel.querySelectorAll('button').forEach(b=>b.setAttribute('role','menuitem'));
  function position(){const r=trigger.getBoundingClientRect(),width=Math.min(264,innerWidth-32),height=Math.min(panel.scrollHeight||240,innerHeight-32);panel.style.left=Math.max(16,Math.min(r.left,innerWidth-width-16))+'px';panel.style.top=Math.max(16,r.bottom+height+8<innerHeight?r.bottom+8:r.top-height-8)+'px'}
  trigger.onclick=()=>{if(menu===state){closeMenu(true);return}closeMenu();menu=state;trigger.setAttribute('aria-expanded','true');if(panel.showPopover)panel.showPopover();else panel.hidden=false;position();panel.querySelector('button:not(:disabled)')?.focus()};
  panel.addEventListener('toggle',e=>{if(e.newState==='closed'&&menu===state){menu=null;trigger.setAttribute('aria-expanded','false')}});
  panel.addEventListener('click',e=>{if(e.target.closest('button:not(:disabled)'))closeMenu()});
  panel.addEventListener('keydown',e=>{const buttons=[...panel.querySelectorAll('button:not(:disabled)')],i=buttons.indexOf(document.activeElement);if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();buttons[(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus()}});
 }
 document.addEventListener('pointerdown',e=>{if(menu&&!menu.panel.contains(e.target)&&!menu.trigger.contains(e.target))closeMenu()},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu){e.preventDefault();e.stopImmediatePropagation();closeMenu(true)}},true);
 window.addEventListener('resize',()=>closeMenu());
 window.RuruConversation={before,after,follow,composer,bindComposer,privacy,tools,bindMenu,closeMenu};
})();
