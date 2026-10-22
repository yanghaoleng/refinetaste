const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const ctx={window:{}};vm.runInNewContext(fs.readFileSync('dist/chapter-score.js','utf8'),ctx);const calculate=ctx.window.RefineScores.calculate;
const questions=[{id:32,kind:'choice',correct:1},{id:33,kind:'choice',correct:0},{id:34,kind:'open'}];
test('passing requires every comparison correct and a complete chapter, without grading open answers',()=>{
 const pass=calculate(questions,{32:1,33:0,34:-1});assert.equal(pass.passed,true);assert.equal(pass.percent,100);assert.equal(pass.total,2);
 assert.equal(calculate(questions,{32:1,33:0}).passed,false);
 const fail=calculate(questions,{32:1,33:1,34:-1});assert.equal(fail.passed,false);assert.equal(fail.percent,50);assert.equal(fail.complete,true);
 assert.equal(calculate(questions,{32:1,33:1,34:-1}).percent,50);
});
test('chapter display order keeps original question identities intact',()=>{
 const course=JSON.parse(fs.readFileSync('dist/course.json','utf8'));assert.deepEqual(course.chapters.map(ch=>course.questions.find(q=>q.chapter===ch.id).id),[0,32,8,16,24]);
 course.questions.forEach((q,index)=>assert.equal(q.id,index));assert.equal(course.chapters.length,5);
});
