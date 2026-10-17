/* Native Web Animations: 8/8/3, no dependencies, no perpetual loops or scroll listeners. */
(()=>{
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const running=new Set(),seen=new WeakSet(),swaps=new WeakMap(),closing=new WeakMap(),detailsReady=new WeakSet();
  const ease='cubic-bezier(.16,1,.3,1)';
  function play(el,frames,options={}){
    if(!el||preference.matches||!el.animate)return null;
    const a=el.animate(frames,{duration:540,easing:ease,fill:'backwards',...options});
    running.add(a);a.finished.then(()=>running.delete(a),()=>running.delete(a));return a;
  }
  const done=a=>a?a.finished.catch(()=>{}):Promise.resolve();
  function reveal(el,index=0){
    if(!el||seen.has(el)||el.closest('[hidden]')||el.closest('dialog:not([open])')||el.parentElement?.closest('details:not([open])'))return;
    seen.add(el);
    const base=getComputedStyle(el).transform;
    const rest=base==='none'?'':base;
    const distance=el.matches('.good-card,.bad-card,.case-poster')?60:30;
    play(el,[{opacity:0,transform:`translate3d(0,${distance}px,0) scale(.965) ${rest}`},{opacity:1,transform:`translate3d(0,0,0) scale(1) ${rest}`}],{duration:el.matches('.good-card,.bad-card')?960:680,delay:Math.min(index*65,390)});
  }
  const dynamicSelector=[
    '.course-chapter','.course-footnote','.open-prompt >*','.open-actions','.reference','.open-bottom','.model-feedback >*','.specimen','.exercise-heading >*','.options >.option','.feedback >h3','.feedback >p','.feedback >details','.feedback >.reflection','.feedback >.feedback-actions',
    '.result >*','.note-item','.empty','.coach-answer','.save-status','.metric-value','.insight >*','.chart >*','#questions >tr','#chapters >tr','#daily-table tr','#question-insight',
    '#pin-error','#exercise-progress','#load-state'
  ].join(',');
  function enter(root){
    if(!root||preference.matches)return;
    if(root.matches?.(dynamicSelector))reveal(root);
    root.querySelectorAll?.(dynamicSelector).forEach((el,i)=>reveal(el,i));
  }
  function swap(el,update){
    if(swaps.has(el))return swaps.get(el);
    if(preference.matches){update();return Promise.resolve()}
    const task=(async()=>{
      el.setAttribute('aria-busy','true');
      const exit=play(el,[{opacity:1,translate:'0 0'},{opacity:0,translate:'0 -18px'}],{duration:170,fill:'forwards',easing:'cubic-bezier(.4,0,1,1)'});
      try{await done(exit);update();}finally{exit?.cancel();el.removeAttribute('aria-busy')}
      enter(el);
    })();
    swaps.set(el,task);task.finally(()=>swaps.delete(el));return task;
  }
  function closeDialog(dialog){
    if(!dialog.open)return Promise.resolve();
    if(closing.has(dialog))return closing.get(dialog);
    if(preference.matches){dialog.close();return Promise.resolve()}
    const task=(async()=>{
      dialog.classList.add('is-leaving');
      const a=play(dialog,[{opacity:1,translate:'0 0',scale:'1'},{opacity:0,translate:'0 28px',scale:dialog.id==='training'?'1':'.96'}],{duration:240,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'});
      try{await done(a);dialog.close()}finally{a?.cancel();dialog.classList.remove('is-leaving')}
    })();closing.set(dialog,task);task.finally(()=>closing.delete(dialog));return task;
  }
  async function toggleDetails(details,open=!details.open){
    if(details.dataset.motionBusy)return;
    if(preference.matches){details.open=open;return}
    details.dataset.motionBusy='true';
    const content=details.querySelector('.details-body');
    try{
      if(open){details.open=true;await done(play(content,[{opacity:0,translate:'0 -12px'},{opacity:1,translate:'0 0'}],{duration:380}));}
      else{await done(play(content,[{opacity:1,translate:'0 0'},{opacity:0,translate:'0 -8px'}],{duration:180}));details.open=false;}
    }finally{delete details.dataset.motionBusy}
  }
  function prepareDetails(root){
    const items=[...(root.matches?.('details')?[root]:[]),...root.querySelectorAll('details')];
    items.forEach(details=>{
      if(detailsReady.has(details))return;detailsReady.add(details);
      const summary=details.querySelector(':scope >summary');if(!summary)return;
      const content=document.createElement('div');content.className='details-body';
      [...details.children].filter(n=>n!==summary).forEach(n=>content.append(n));details.append(content);
      summary.addEventListener('click',event=>{event.preventDefault();toggleDetails(details)});
    });
  }
  async function switchView(from,to){
    if(!from.hidden)await done(play(from,[{opacity:1,translate:'0 0'},{opacity:0,translate:'0 -18px'}],{duration:190}));
    from.hidden=true;to.hidden=false;
    play(to,[{opacity:0,translate:'0 24px'},{opacity:1,translate:'0 0'}],{duration:520});enter(to);
  }
  window.RefineMotion={swap,closeDialog,toggleDetails,switchView};
  preference.addEventListener('change',()=>{if(preference.matches){for(const a of running){try{a.finish()}catch{a.cancel()}}running.clear()}});
  function boot(){
    const observer=new IntersectionObserver(entries=>{
      entries.filter(e=>e.isIntersecting).forEach((entry,i)=>{reveal(entry.target,i);observer.unobserve(entry.target)});
    },{threshold:.12,rootMargin:'0px 0px -24px 0px'});
    const staticSelector='header .brand,header nav >*,header .nav-start,.hero-copy >*,.hero-art .bad-card,.hero-art .good-card,.art-guide,.art-cross,.art-star,.art-note,.art-index,.principle-strip >*,.section-heading >*,.lesson,.case-head >*,.case-poster,footer >*,.gate >*,.dash-title >*,.scope >*,.metrics >*,.chart-heading >*,.dash-section >h2,.definitions dl >div';
    document.querySelectorAll(staticSelector).forEach(el=>observer.observe(el));
    prepareDetails(document);
    document.querySelectorAll('dialog').forEach(dialog=>{
      dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog(dialog)});
    });
    new MutationObserver(records=>{
      const additions=new Set();
      for(const record of records){
        if(record.type==='attributes'&&record.target.open){
          const modal=record.target;
          play(modal,[{opacity:0,translate:modal.id==='training'?'0 40px':'0 28px',scale:modal.id==='training'?'1':'.94'},{opacity:1,translate:'0 0',scale:'1'}],{duration:560});
          modal.querySelectorAll('.training-top >*,.notes-head, #notebook-title, #notebook >p,#export-notes').forEach((el,i)=>{seen.delete(el);reveal(el,i)});
          enter(modal);
        }
        for(const node of record.addedNodes){
          if(node.nodeType===1)additions.add(node);
          else if(node.nodeType===3&&record.target.matches?.('#pin-error,.save-status,.coach-answer,#exercise-progress,#load-state')){
            const el=record.target;seen.delete(el);reveal(el);
            if(el.id==='pin-error'&&el.textContent.includes('不正确'))play(el,[{translate:'0 0'},{translate:'-7px 0'},{translate:'6px 0'},{translate:'-3px 0'},{translate:'0 0'}],{duration:340});
          }
        }
      }
      for(const root of additions){prepareDetails(root);enter(root)}
    }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
    const press=event=>{
      const target=event.target.closest('button:not(:disabled),a,summary');
      if(!target||target.closest('[aria-busy="true"]'))return;
      // Scale uses an independent transform, preserving the card's composed rotation.
      play(target,[{scale:'1'},{scale:'.955',offset:.35},{scale:'1'}],{duration:330});
    };
    let navigating=false,navigationAnimation=null;
    document.addEventListener('click',async event=>{
      const link=event.target.closest('a[href]');
      if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.hasAttribute('download')||link.target==='_blank')return;
      const next=new URL(link.href,location.href);
      if(next.origin!==location.origin||next.pathname===location.pathname||!/^https?:$/.test(next.protocol))return;
      event.preventDefault();if(navigating)return;navigating=true;
      navigationAnimation=play(document.body,[{opacity:1,translate:'0 0'},{opacity:0,translate:'0 -16px'}],{duration:170,fill:'forwards'});
      await done(navigationAnimation);location.assign(next.href);
    });
    window.addEventListener('pageshow',event=>{if(event.persisted){navigationAnimation?.cancel();navigating=false;play(document.body,[{opacity:0,translate:'0 16px'},{opacity:1,translate:'0 0'}],{duration:440})}});
    document.addEventListener('pointerdown',press);
    document.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' ')press(event)});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
