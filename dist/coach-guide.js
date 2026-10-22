/* One persistent avatar follows the newest coach message along a curved path. */
(()=>{
 let frame=0,carrier=null,target=null,flight=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const avatar=()=>document.getElementById('coach-avatar');
 function stop(){cancelAnimationFrame(frame);frame=0;flight++}
 function home(){const node=avatar();stop();if(node)document.querySelector('.coach-identity')?.append(node);carrier?.remove();carrier=null;target=null;document.querySelectorAll('.coach-avatar-target').forEach(el=>el.remove())}
 function latest(){
  const message=[...document.querySelectorAll('#chat-messages>.assistant:not(.typing-message)')].at(-1);
  if(!message)return;
  let anchor=message.querySelector('.coach-avatar-target');
  if(!anchor){anchor=document.createElement('span');anchor.className='coach-avatar-target';message.prepend(anchor)}
  if(anchor===target)return;
  const node=avatar();if(!node)return;
  const start=node.getBoundingClientRect();stop();target=anchor;
  const oldCarrier=carrier;
  if(reduced.matches){anchor.append(node);oldCarrier?.remove();carrier=null;return}
  carrier=document.createElement('div');carrier.className='coach-flight';carrier.style.left=start.left+'px';carrier.style.top=start.top+'px';
  document.getElementById('training').append(carrier);carrier.append(node);oldCarrier?.remove();
  const mover=carrier,token=flight,began=performance.now();
  function track(now){
   if(token!==flight||!anchor.isConnected)return;
   const t=Math.min(1,(now-began)/620),ease=1-Math.pow(1-t,4),end=anchor.getBoundingClientRect();
   const dx=end.left-start.left,dy=end.top-start.top,bend=Math.min(90,Math.abs(dy)*.2);
   mover.style.transform=`translate(${dx*ease-bend*4*ease*(1-ease)}px,${dy*ease}px)`;
   if(t<1){frame=requestAnimationFrame(track);return}
   anchor.append(node);mover.remove();carrier=null;frame=0;document.querySelectorAll('.coach-avatar-target:empty').forEach(el=>el.remove());
  }
  frame=requestAnimationFrame(track);
 }
 reduced.addEventListener('change',()=>{if(carrier&&target){const node=avatar(),anchor=target;stop();anchor.append(node);carrier.remove();carrier=null}});
 window.RefineGuide={home,latest};
})();
