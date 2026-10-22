/* Decorative scenes: staggered native motion, random bag, no work behind the lesson. */
(()=>{
 const root=document.querySelector('.hero-carousel');if(!root)return;
 const scenes=[...root.querySelectorAll('[data-hero-scene]')],preference=matchMedia('(prefers-reduced-motion: reduce)');
 let current=-1,bag=[],timer=null,generation=0,visible=true,started=false,active=new Set();
 function pick(){if(!bag.length){bag=scenes.map((_,i)=>i).filter(i=>i!==current);for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}}return bag.pop()}
 function allowed(){return visible&&!document.hidden&&!document.querySelector('#training')?.open&&!document.body.classList.contains('notes-visible')&&!preference.matches}
 function clear(){clearTimeout(timer);timer=null;generation++;for(const animation of active)animation.cancel();active.clear()}
 async function pieces(scene,enter){
  const parts=[...scene.querySelectorAll('[data-hero-piece]')];if(!enter)parts.reverse();
  const jobs=parts.map((part,i)=>{const rest=getComputedStyle(part).transform,base=rest==='none'?'':rest;
   const frames=enter?[{opacity:0,transform:`translateY(18px) scale(.97) ${base}`},{opacity:1,transform:`translateY(0) scale(1) ${base}`}]:[{opacity:1,transform:`translateY(0) scale(1) ${base}`},{opacity:0,transform:`translateY(-12px) scale(.985) ${base}`}];
   const animation=part.animate(frames,{duration:enter?500:240,delay:i*(enter?75:45),easing:'cubic-bezier(.16,1,.3,1)',fill:enter?'backwards':'forwards'});active.add(animation);return animation.finished.catch(()=>{}).then(()=>{active.delete(animation);return animation});
  });return Promise.all(jobs);
 }
 function schedule(){if(!allowed()||timer)return;timer=setTimeout(()=>{timer=null;cycle()},8500+Math.random()*2000)}
 async function cycle(){
  if(!allowed())return;const token=++generation,previous=scenes[current],finished=await pieces(previous,false);
  if(token!==generation||!allowed())return;
  previous.hidden=true;finished.forEach(animation=>animation.cancel());current=pick();scenes[current].hidden=false;
  await pieces(scenes[current],true);if(token===generation)schedule();
 }
 function sync(){if(!allowed()){clear();return}if(!started){started=true;pieces(scenes[current],true).then(schedule)}else schedule()}
 current=pick();scenes.forEach((scene,i)=>scene.hidden=i!==current);
 new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;sync()},{threshold:.15}).observe(root);
 const observer=new MutationObserver(sync);observer.observe(document.querySelector('#training'),{attributes:true,attributeFilter:['open']});observer.observe(document.body,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',sync);preference.addEventListener('change',sync);sync();
})();
