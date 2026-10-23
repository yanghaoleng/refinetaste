const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(){
 const runScope={window:{}};vm.runInNewContext(fs.readFileSync('dist/question-run.js','utf8'),runScope);
 const exercise={inert:false,busy:false,hasAttribute(){return this.busy}},saved=[],rendered=[],progress={16:{chatDraft:'保留这段尚未提交的想法',messages:[{role:'assistant',content:'原来的提问'}]}},variants={16:{contextKey:'alternate:10'}},answers={};let update,resolve,transitions=0;
 const ctx={Promise,screen:'lesson',current:16,chapter:3,selected:null,runOrder:[16,17,56],runPosition:0,runVariants:variants,sessionAnswers:answers,course:{questions:[{id:16,chapter:3}]},$:()=>exercise,window:{RefineRun:runScope.window.RefineRun},persist:(key,value)=>saved.push({key,value}),render(){rendered.push(ctx.current)},transition(fn){transitions++;exercise.busy=true;update=fn;return new Promise(r=>resolve=r)}};
 vm.createContext(ctx);const source=fs.readFileSync('dist/app.js','utf8');vm.runInContext(source.slice(source.indexOf('function skipQuestion('),source.indexOf('function recordAnswer(')),ctx);
 return {ctx,exercise,saved,rendered,progress,variants,answers,get transitions(){return transitions},async finish(){update();exercise.busy=false;resolve();await Promise.resolve();await Promise.resolve()}};
}
test('skip navigates once, preserves the draft and variant, and records no answer',async()=>{
 const e=setup(),draft=JSON.stringify(e.progress);e.ctx.skipQuestion();assert.equal(e.exercise.inert,true);e.ctx.skipQuestion();assert.equal(e.transitions,1);await e.finish();
 assert.deepEqual(Array.from(e.ctx.runOrder),[17,56,16]);assert.equal(e.ctx.runPosition,0);assert.equal(e.ctx.current,17);assert.equal(e.exercise.inert,false);assert.deepEqual(e.rendered,[17]);assert.deepEqual(e.answers,{});assert.equal(JSON.stringify(e.progress),draft);
 assert.equal(e.saved[0].key,'refinetaste-last-run-16');assert.equal(e.saved[0].value.variants,e.variants);
 e.ctx.skipQuestion();await e.finish();e.ctx.skipQuestion();await e.finish();assert.equal(e.ctx.current,16);assert.equal(e.ctx.runVariants[16].contextKey,'alternate:10');assert.equal(e.progress[16].chatDraft,'保留这段尚未提交的想法');
});
test('skip ignores completed questions, the last remaining question, and non-lesson screens',()=>{
 const e=setup();e.answers[16]=0;e.ctx.skipQuestion();assert.equal(e.transitions,0);delete e.answers[16];e.ctx.runPosition=2;e.ctx.current=56;e.ctx.skipQuestion();assert.equal(e.transitions,0);e.ctx.runPosition=0;e.ctx.current=16;e.ctx.screen='result';e.ctx.skipQuestion();assert.equal(e.transitions,0);
});
