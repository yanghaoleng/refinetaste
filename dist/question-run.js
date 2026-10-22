/* Keep stable question identities while varying reading goals, order, and A/B placement. */
(()=>{
 function shuffle(items){const values=[...items];for(let i=values.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[values[i],values[j]]=[values[j],values[i]]}return values}
 function resolve(base,variantId='base',optionOrder=[0,1]){
  const variant=variantId==='base'?{}:base.variants.find(v=>v.id===variantId),q={...base,...variant,id:base.id,variantId,optionOrder,contextKey:variantId+':'+optionOrder.join('')};delete q.variants;
  if(q.kind==='choice'){
   q.correct=optionOrder.indexOf(q.correct);q.labels=optionOrder.map(i=>q.labels[i]);if(q.visuals.length)q.visuals=optionOrder.map(i=>q.visuals[i]);
   if(optionOrder[0]===1){const swap=text=>typeof text==='string'?text.replace(/(?<![A-Za-z])[AB](?![A-Za-z])/g,c=>c==='A'?'B':'A'):text;for(const key of ['why','rule','tip'])q[key]=swap(q[key]);q.coachOpening=q.coachOpening?.map(swap)}
  }
  return q;
 }
 function create(questions,previous={}){
  let order=shuffle(questions.map(q=>q.id));if(order.length>1&&order.join(',')===(previous.order||[]).join(','))order=[...order.slice(1),order[0]];
  const variants={};for(const q of questions){const ids=['base',...(q.variants||[]).map(v=>v.id)],pool=ids.filter(id=>id!==previous.variants?.[q.id]?.variantId),variantId=pool[Math.floor(Math.random()*pool.length)]||ids[0],optionOrder=q.kind==='choice'?shuffle([0,1]):[0,1];variants[q.id]=resolve(q,variantId,optionOrder)}
  return {order,variants};
 }
 window.RefineRun={create,resolve};
})();
