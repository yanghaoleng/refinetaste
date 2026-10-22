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
    if(!el||seen.has(el)||el.closest('.catalog-popup')||el.closest('[data-design-build]')||el.closest('[hidden]')||el.closest('dialog:not([open])')||el.parentElement?.closest('details:not([open])'))return;
    seen.add(el);
    const base=getComputedStyle(el).transform;
    const rest=base==='none'?'':base;
    const distance=el.matches('.good-card,.bad-card,.case-poster')?60:30;
    play(el,[{opacity:0,transform:`translate3d(0,${distance}px,0) scale(.965) ${rest}`},{opacity:1,transform:`translate3d(0,0,0) scale(1) ${rest}`}],{duration:el.matches('.good-card,.bad-card')?960:680,delay:Math.min(index*65,390)});
  }
  const dynamicSelector=[
    '.course-chapter','.course-footnote','.open-prompt >*','.open-actions','.reference','.open-bottom','.model-feedback >*','.specimen','.exercise-heading >*','.options >.option','.feedback >h3','.feedback >p','.feedback >details','.feedback >.reflection','.feedback >.feedback-actions',
    '.result >*','.note-item','.empty','.coach-answer','.save-status','.metric-value','.insight >*','.chart >*','#questions >tr','#chapters >tr','#daily-table tr','#question-insight',
    '#pin-error','#load-state'
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
  const builds=new WeakMap();
  function finishDesignBuild(root){
    for(const animation of builds.get(root)||[]){try{animation.finish()}catch{animation.cancel()}}
    builds.delete(root);
  }
  function assembleDesign(root,heading=null){
    if(!root)return;
    root.setAttribute('data-design-build','');
    heading?.setAttribute('data-design-build','');
    if(preference.matches)return;
    root.setAttribute('data-design-entering','');
    const cards=[...root.children].filter(el=>el.matches('.option,.specimen'));
    const animations=[];
    let cursor=100;
    const partsSelector=[
      '.sample-card .studio','.sample-card .name','.sample-card .position','.sample-card .contact',
      '.specimen-tag','.specimen-title','.specimen-content >p:not(.status-row)',
      '.menu-row >span','.status-row >span','.mini-chart .bar','.chart-key',
      '.app-bar >*','.resource-banner >*','.app-placeholder >i',
      '.path-sample >div','.path-sample >span'
    ].join(',');
    for(const card of cards){
      const shell=play(card,[{opacity:0},{opacity:1}],{duration:160,delay:cursor});
      if(shell)animations.push(shell);
      const parts=[...card.querySelectorAll(partsSelector)];
      const step=parts.length>8?50:75;
      parts.forEach((part,index)=>{
        // Keep the existing design's rotations, offsets, alignment and typography.
        const base=getComputedStyle(part).transform;
        const rest=base==='none'?'':base;
        const animation=play(part,[
          {opacity:0,transform:`translate3d(0,9px,0) ${rest}`},
          {opacity:1,transform:`translate3d(0,0,0) ${rest}`}
        ],{duration:220,delay:cursor+160+index*step});
        if(animation)animations.push(animation);
      });
      cursor+=160+Math.max(0,parts.length-1)*step+220+110;
    }
    if(heading){
      const title=heading.querySelector('h2'),brief=heading.querySelector('p'),bookmark=heading.querySelector('.bookmark'),task=heading.querySelector('.question-task');
      const bubble=play(heading,[{opacity:0},{opacity:1}],{duration:220,delay:cursor});if(bubble)animations.push(bubble);
      for(const [element,delay] of [[title,cursor],[bookmark,cursor],[brief,cursor],...(task?[[task,cursor]]:[])]){
        if(element!==bookmark&&window.RefineText){animations.push(...window.RefineText.text(element,{delay}));continue}
        const animation=play(element,[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,delay});
        if(animation)animations.push(animation);
      }
    }
    builds.set(root,animations);
    const ready=Promise.all(animations.map(done)).then(()=>root.removeAttribute('data-design-entering'));
    // Interaction can always reveal the completed designs immediately.
    root.addEventListener('focusin',()=>finishDesignBuild(root),{once:true});
    return ready;
  }
  function bookmarkFeedback(symbol,counter){
    play(symbol,[{transform:'scale(1)'},{transform:'scale(1.25)',offset:.38},{transform:'scale(.94)',offset:.72},{transform:'scale(1)'}],{duration:330});

  }
  window.RefineMotion={swap,closeDialog,toggleDetails,switchView,assembleDesign,finishDesignBuild,bookmarkFeedback};
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
          modal.querySelectorAll('.training-top >button,.notes-head, #notebook-title, #notebook >p').forEach((el,i)=>{seen.delete(el);reveal(el,i)});
          enter(modal);
        }
        for(const node of record.addedNodes){
          if(node.nodeType===1)additions.add(node);
          else if(node.nodeType===3&&record.target.matches?.('#pin-error,.save-status,.coach-answer,#load-state')){
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
