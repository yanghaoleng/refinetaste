const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');const ctx={window:{},Math};vm.runInNewContext(fs.readFileSync('dist/question-run.js','utf8'),ctx);const api=ctx.window.RefineRun,course=JSON.parse(fs.readFileSync('dist/course.json','utf8'));
test('positive question wording and both A/B orders resolve to the correct design and preserve stable IDs',()=>{for(const base of course.questions){for(const variant of ['base','alternate'])for(const order of [[0,1],[1,0]]){const q=api.resolve(base,variant,order);assert.equal(q.id,base.id);if(base.kind==='choice'){const canonical=base.correct;assert.equal(order[q.correct],canonical);assert.equal(q.labels[q.correct],base.labels[canonical]);if(base.visuals.length)assert.equal(q.visuals[q.correct].kind,base.visuals[canonical].kind)}assert.equal(q.contextKey,variant+':'+order.join(''))}}});
test('each retry changes its question order and wording while including the same eight questions',()=>{const questions=course.questions.filter(q=>q.chapter===1),first=api.create(questions),second=api.create(questions,first);assert.deepEqual([...first.order].sort(),[...second.order].sort());assert.notDeepEqual([...first.order],[...second.order]);for(const q of questions)assert.notEqual(first.variants[q.id].variantId,second.variants[q.id].variantId)});

test('skipped questions move behind all remaining work and cannot disappear or create a score',()=>{
 let order=[1,2,3,4],position=0;const answers={},original=[...order];
 order=api.defer(order,position,answers);assert.deepEqual(Array.from(order),[2,3,4,1]);
 order=api.defer(order,position,answers);assert.deepEqual(Array.from(order),[3,4,1,2]);
 assert.equal(Object.keys(answers).length,0);
 const seen=[];while(position<order.length){const current=order[position];seen.push(current);if(position===order.length-1)assert.equal(api.defer(order,position,answers),null);answers[current]=1;assert.equal(api.defer(order,position,answers),null);position++}
 assert.deepEqual(seen,[3,4,1,2]);assert.deepEqual([...order].sort(),original);assert.equal(Object.keys(answers).length,4);
});
test('repeated deferral keeps the completed prefix and every question in an expanded chapter',()=>{
 const questions=course.questions.filter(q=>q.chapter===3),original=questions.map(q=>q.id),answers={[original[0]]:1};let order=[...original];
 for(let i=0;i<30;i++){order=api.defer(order,1,answers);assert.equal(order[0],original[0]);assert.equal(new Set(order).size,12);assert.deepEqual([...order].sort((a,b)=>a-b),[...original].sort((a,b)=>a-b))}
 for(const position of [-1,NaN,1.5,12])assert.equal(api.defer(order,position,answers),null);
});
