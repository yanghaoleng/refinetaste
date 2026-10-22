/* Reading pauses belong to fresh messages; restored conversations stay immediate. */
(()=>{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let timers=new Set(),generation=0,finish=null,scoreAnimation=null;
 function cancel(){generation++;scoreAnimation?.cancel?.();scoreAnimation=null;for(const timer of timers)clearTimeout(timer);timers.clear();finish=null}
 function later(callback,delay){const token=generation,timer=setTimeout(()=>{timers.delete(timer);if(token===generation)callback()},delay);timers.add(timer)}
 function opening({messages,form,showMessage,onChange,duration}){
  cancel();if(!messages.length)return;
  const revealAll=()=>{for(const message of messages)message.hidden=false;form.hidden=false;form.inert=false;onChange()};
  if(reduced.matches){revealAll();return}
  finish=revealAll;messages.slice(1).forEach(message=>message.hidden=true);form.hidden=true;form.inert=true;
  showMessage(messages[0]);onChange();
  let delay=duration(messages[0])+1600;
  messages.slice(1).forEach((message,index)=>{later(()=>{if(!message.isConnected)return;message.hidden=false;showMessage(message);onChange()},delay);delay+=duration(message)+(index===messages.length-2?300:1000)});
  later(()=>{if(!form.isConnected)return;form.hidden=false;form.inert=false;showMessage(form);finish=null;onChange()},delay);
 }
 function settlement({score,details,showDetails}){
  cancel();const reveal=()=>{details.hidden=false;showDetails()};
  if(reduced.matches){reveal();return}
  details.hidden=true;finish=reveal;
  const token=generation,animation=score.animate([{opacity:0,transform:'translateY(18px) scale(.94)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:540,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});
  scoreAnimation=animation;
  animation.finished.catch(()=>{}).then(()=>{if(token===generation)later(()=>{if(!details.isConnected)return;finish=null;reveal()},350)});
 }
 reduced.addEventListener('change',()=>{if(reduced.matches&&finish){const reveal=finish;cancel();reveal()}});
 window.RefineSequence={opening,settlement,cancel};
})();
