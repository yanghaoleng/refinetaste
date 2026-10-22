/* Carry correct outcomes forward; every retry contains only the remaining mistakes. */
(()=>{
 function prepare(questions,stored={},progress={}){
  const baseline={};for(const q of questions){const saved=stored?.answers?.[q.id];baseline[q.id]=saved===1||saved===0?saved:progress[q.id]?.correct===true?1:0}
  return {baseline,questions:questions.filter(q=>baseline[q.id]!==1)};
 }
 function merge(questions,baseline,answers){return Object.fromEntries(questions.filter(q=>Object.hasOwn(answers,q.id)||Object.hasOwn(baseline,q.id)).map(q=>[q.id,Object.hasOwn(answers,q.id)?answers[q.id]:baseline[q.id]]))}
 window.RefinePractice={prepare,merge};
})();
