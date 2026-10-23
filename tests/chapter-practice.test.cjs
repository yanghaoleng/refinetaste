const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');const ctx={window:{}};vm.runInNewContext(fs.readFileSync('dist/chapter-practice.js','utf8'),ctx);const api=ctx.window.RefinePractice,questions=[{id:0},{id:1},{id:2},{id:3}];
test('wrong-answer practice retains correct outcomes across repeated rounds until the chapter passes',()=>{let stored={answers:{0:1,1:0,2:1,3:0}};let plan=api.prepare(questions,stored);assert.deepEqual(Array.from(plan.questions,q=>q.id),[1,3]);stored.answers=api.merge(questions,plan.baseline,{1:1,3:0});plan=api.prepare(questions,stored);assert.deepEqual(Array.from(plan.questions,q=>q.id),[3]);stored.answers=api.merge(questions,plan.baseline,{3:1});assert.equal(api.prepare(questions,stored).questions.length,0);assert.deepEqual({...stored.answers},{0:1,1:1,2:1,3:1})});
test('legacy chapter results use known question correctness without mixing other chapters',()=>{const plan=api.prepare(questions,{}, {0:{correct:true},1:{correct:false},2:{correct:true},8:{correct:true}});assert.deepEqual(Array.from(plan.questions,q=>q.id),[1,3]);assert.equal(Object.hasOwn(plan.baseline,8),false);assert.equal(Object.keys(api.merge(questions,{}, {0:1,10:1})).length,1)});
test('the guide favors the latest unfinished chapter, then started work, then the next unpassed chapter',()=>{const chapters=[{},{},{}],qs=[{id:0,chapter:0},{id:1,chapter:1},{id:2,chapter:2}],scores={0:{passed:true,total:1}};assert.equal(api.continueChapter(chapters,qs,scores,{},2),2);assert.equal(api.continueChapter(chapters,qs,scores,{2:{done:true}},0),2);assert.equal(api.continueChapter(chapters,qs,scores,{},0),1);assert.equal(api.continueChapter(chapters,qs,{0:{passed:true,total:8}},{},null),0);assert.equal(api.continueChapter(chapters,qs,{0:{passed:true,total:1},1:{passed:true,total:1},2:{passed:true,total:1}},{},2),2)});

test('an old eight-question pass keeps its answers but needs the four added product judgments',()=>{
 const course=JSON.parse(fs.readFileSync('dist/course.json','utf8')),qs=course.questions.filter(q=>q.chapter===3),old=qs.filter(q=>q.id<56),answers=Object.fromEntries(old.map(q=>[q.id,1]));
 const stored={passed:true,total:8,answers};
 assert.equal(api.continueChapter(course.chapters,course.questions,{16:stored},{},3),3);
 const plan=api.prepare(qs,stored);assert.deepEqual(Array.from(plan.questions,q=>q.id),[56,57,58,59]);
 const merged=api.merge(qs,plan.baseline,{56:1,57:1,58:1,59:1});
 const scoreScope={window:{}};vm.runInNewContext(fs.readFileSync('dist/chapter-score.js','utf8'),scoreScope);
 const score=scoreScope.window.RefineScores.calculate(qs,merged);assert.equal(score.total,12);assert.equal(score.percent,100);assert.equal(score.passed,true);
});
