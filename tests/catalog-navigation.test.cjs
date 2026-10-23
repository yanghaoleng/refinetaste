const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(){
 const window={};vm.runInNewContext(fs.readFileSync('dist/question-run.js','utf8'),{window});
 const popup={hidden:false},trigger={setAttribute(){}},exercise={hasAttribute:()=>false},renders=[];
 const ctx={window,screen:'lesson',current:1,chapter:0,runOrder:[1,2,3],runPosition:0,runVariants:{1:{contextKey:'base:01'},2:{contextKey:'base:10'},3:{contextKey:'base:01'}},sessionAnswers:{1:0},chapterBaseline:{},runMode:'full',selected:null,progress:{1:{choice:0,chatDraft:'保留草稿',messages:[{role:'user',content:'原有对话'}]}},course:{questions:[{id:0,chapter:1},{id:1,chapter:0},{id:2,chapter:0},{id:3,chapter:0}]},$:s=>s==='#exercise'?exercise:s==='#exercise-catalog-popup'?popup:trigger,transition:fn=>fn(),render(){renders.push(ctx.current)},setExerciseProgress(value,total){ctx.bar={value,total}}};
 vm.createContext(ctx);const src=fs.readFileSync('dist/app.js','utf8');vm.runInContext(src.slice(src.indexOf('function questionAnswered('),src.indexOf('function catalogPoints(')),ctx);return {ctx,popup,renders,exercise};
}
test('catalog jumps preserve run order, answers, variants and drafts without advancing completion',()=>{
 const {ctx,popup,renders}=setup(),before=JSON.stringify({order:ctx.runOrder,answers:ctx.sessionAnswers,progress:ctx.progress,variants:ctx.runVariants});ctx.updateRunProgress();assert.equal(ctx.bar.value,1);
 ctx.jumpQuestion(3);assert.equal(ctx.current,3);assert.equal(ctx.runPosition,2);assert.equal(popup.hidden,true);ctx.updateRunProgress();assert.equal(ctx.bar.value,1);
 ctx.jumpQuestion(1);assert.equal(ctx.questionAnswered(),true);assert.equal(ctx.current,1);assert.deepEqual(renders,[3,1]);assert.equal(JSON.stringify({order:ctx.runOrder,answers:ctx.sessionAnswers,progress:ctx.progress,variants:ctx.runVariants}),before);
});
test('jumping to the last question cannot skip earlier unanswered questions or settle early',()=>{
 const {ctx}=setup();ctx.jumpQuestion(3);ctx.sessionAnswers[3]=1;assert.equal(ctx.nextPendingQuestion(),2);ctx.sessionAnswers[2]=0;assert.equal(ctx.nextPendingQuestion(),null);ctx.updateRunProgress();assert.equal(ctx.bar.value,3);
});
test('a correct baseline question can be reviewed during mistakes practice without adding to its workload',()=>{
 const {ctx}=setup();ctx.runMode='mistakes';ctx.runOrder=[2,3];ctx.sessionAnswers={};ctx.chapterBaseline={1:1,2:0,3:0};ctx.jumpQuestion(1);assert.equal(ctx.questionAnswered(),true);assert.deepEqual(ctx.runOrder,[2,3]);assert.equal(ctx.nextPendingQuestion(),2);ctx.updateRunProgress();assert.equal(ctx.bar.value,0);assert.equal(ctx.bar.total,2);
});
test('cross-chapter, busy and non-lesson jumps are ignored',()=>{
 const {ctx,exercise,renders}=setup();ctx.jumpQuestion(0);ctx.jumpQuestion(99);exercise.hasAttribute=()=>true;ctx.jumpQuestion(2);exercise.hasAttribute=()=>false;ctx.screen='result';ctx.jumpQuestion(2);assert.deepEqual(renders,[]);
});
