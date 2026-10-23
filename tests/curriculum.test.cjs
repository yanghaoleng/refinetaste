const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c=JSON.parse(fs.readFileSync('dist/course.json','utf8'));
test('comparison cards expose different content and the evidence question shows both conclusions',()=>{
 for(const q of c.questions.filter(q=>q.kind==='choice'&&q.visuals.length===2))assert.notDeepEqual(q.visuals[0],q.visuals[1],`Question ${q.id} has identical visible choices`);
 const q=c.questions.find(q=>q.id===17);
 assert.deepEqual(q.visuals.map(v=>v.title),q.labels);
 for(const v of q.visuals)assert.deepEqual(v.lines,['点击率 4% → 6%','两组流量来源不同','尚未追踪后续支付']);
});
test('all three learning paths have complete graded chapters and grounded open tasks',()=>{
 assert.equal(c.questions.length,130);assert.deepEqual(c.chapters.map(ch=>ch.track),[0,0,0,0,1,1,1,1,2,2,2,2,2,2,2]);
 for(const ch of c.chapters){const qs=c.questions.filter(q=>q.chapter===ch.id);assert.equal(qs.length,ch.id===3?12:ch.id===7?14:8);for(const q of qs){assert.ok(q.brief.length>15);assert.equal(q.variants.length,1);if(q.kind==='choice'){assert.equal(q.visuals.length||q.labels.length,2);assert.ok(q.labels[q.correct]);assert.ok(/哪|选择|找出|挑出/.test(q.brief))}else{assert.ok(q.prompt);assert.ok(q.reference);assert.ok(q.variants[0].prompt)}}}
});
test('all new storyboard cases render generated local WebP images and readable captions',()=>{
 const source=fs.readFileSync('dist/app.js','utf8'),begin=source.indexOf('function storySpecimen('),end=source.indexOf('function operationsSpecimen(',begin);const scope={esc:s=>String(s).replaceAll('<','&lt;')};vm.createContext(scope);vm.runInContext(source.slice(begin,end),scope);
 for(const q of c.questions.filter(q=>q.chapter===5||q.chapter===6))for(const v of q.visuals){const html=scope.storySpecimen(v);assert.ok(html.includes(v.title));if(v.kind==='storyboard'){assert.equal((html.match(/<img /g)||[]).length,v.frames.length);assert.doesNotMatch(html,/<svg /);for(const frame of v.frames)assert.ok(fs.existsSync('dist/'+frame.image));for(const f of v.frames)assert.ok(html.includes(f.caption));assert.doesNotMatch(html,/<rect width="180" height="128" fill="#f1eee5"\/><path d="M0 125/)}else for(const line of v.lines)assert.ok(html.includes(line))}
});
