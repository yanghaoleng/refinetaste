const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const data=JSON.parse(fs.readFileSync('academy/selfcare/course.json','utf8'));
function runtime(){
 const ctx={window:{RefineRun:{},RefinePractice:{}},document:{querySelector:()=>null},console};vm.createContext(ctx);
 vm.runInContext(fs.readFileSync('dist/question-run.js','utf8')+fs.readFileSync('dist/chapter-practice.js','utf8').split('window.RefinePractice.menu=')[0],ctx);
 vm.runInContext(`let notes=[],progress={4:{done:true,correct:true,messages:[{role:'user',content:'旧回答'}]},80:{done:true,correct:true}},chapterScores={0:{passed:true,total:8}},sessionAnswers={},current=88,screen='lesson';const course=${JSON.stringify(data)};function activeQuestion(){return course.questions[current]}function saveProgress(patch){progress[current]={...progress[current],...patch}}function updateRunProgress(){}function read(k,fallback){return fallback}function begin(){}function render(){}function renderOpen(){}function revealConversation(){}function esc(s){return String(s)}function result(){}function showMap(){}function recordAnswer(){}function catalogPoints(){return ''}function renderNoteDetail(){}function toggleBookmark(){}function syncBookmark(){}` ,ctx);
 vm.runInContext(fs.readFileSync('academy/selfcare/runtime.js','utf8'),ctx);return ctx;
}
test('exploration always follows narrative order and old answers cannot fill new IDs',()=>{
 const ctx=runtime();const actual=vm.runInContext(`JSON.stringify(window.RefineRun.create(course.questions.filter(q=>q.chapter===11),{order:[95,94,93,92,91,90,89,88]}).order)`,ctx);
 assert.deepEqual(JSON.parse(actual),[88,89,90,91,92,93,94,95]);
 assert.equal(vm.runInContext('progress[88]',ctx),undefined);
 vm.runInContext('recordAnswer(1)',ctx);
 assert.equal(vm.runInContext('progress[88].correct',ctx),null);assert.equal(vm.runInContext('sessionAnswers[88]',ctx),-1);
 assert.equal(vm.runInContext('progress[4].messages[0].content',ctx),'旧回答');assert.equal(vm.runInContext('progress[80].done',ctx),true);
});
test('exploratory catalog reports recorded status without a correct/incorrect verdict',()=>{
 const ctx=runtime();vm.runInContext('recordAnswer(0)',ctx);
 const html=vm.runInContext('catalogPoints([course.questions[88]])',ctx);
 assert.match(html,/已记录/);assert.doesNotMatch(html,/答对|答错|data-outcome="correct"/);
});
