const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const course=JSON.parse(fs.readFileSync('dist/course.json','utf8')),questions=course.questions.filter(q=>q.module==='marketing-v1'),ctx={window:{}};
vm.runInNewContext(fs.readFileSync('dist/marketing-cases.js','utf8'),ctx);const render=ctx.window.RefineMarketing.render;
test('marketing is an ordered path with early service and a balanced set of case decisions and practice',()=>{
 assert.equal(questions.length,56);assert.deepEqual(course.chapters.filter(c=>c.track===2).map(c=>c.id),[8,9,10,11,12,13,14]);
 assert.match(course.chapters[9].title,/私域.*产品迭代/);
 for(const ch of course.chapters.filter(c=>c.track===2)){const qs=questions.filter(q=>q.chapter===ch.id);assert.equal(qs.filter(q=>q.kind==='choice').length,4);assert.equal(qs.filter(q=>q.kind==='open').length,4)}
 const privateQs=questions.filter(q=>q.chapter===9);assert.match(privateQs.at(-1).title,/自愿转介绍/);assert.match(privateQs[0].why,/服务|首次|价值/);
});
test('every original marketing case has legible visible evidence, escaped content, and official reading links',()=>{
 for(const q of questions){assert.ok(q.sources.length);for(const src of q.sources)assert.match(src.url,/^https:\/\//);
  for(const v of q.visuals){const html=render(v);assert.ok(html.includes('<figcaption>'));assert.ok(html.includes(v.title));assert.doesNotMatch(html,/<svg|<script|<button|<input/);for(const r of v.rows){assert.ok(html.includes(r.label));assert.ok(html.includes(r.text))}for(const m of v.metrics)assert.ok(html.includes(m.value));assert.match(html,/数据与品牌均为虚构/)}
  if(q.kind==='open'){assert.equal(q.rubric.length,3);assert.ok(q.reference.length>45)}
 }
 const unsafe=render({title:'<script>bad</script>',rows:[{label:'<b>x</b>',text:'a&b'}],metrics:[{label:'<x>',value:'"value"'}]});assert.doesNotMatch(unsafe,/<script>|<b>/);assert.match(unsafe,/&lt;script&gt;/);assert.match(unsafe,/a&amp;b/);
});
test('cost and measurement cases distinguish revenue, contribution and duplicated attribution',()=>{
 const roas=questions.find(q=>q.title.startsWith('ROAS'));assert.match(roas.visuals[roas.correct].rows.map(r=>r.text).join(' '),/−2000/);
 const dedup=questions.find(q=>q.title.includes('直接相加'));assert.match(dedup.visuals[dedup.correct].rows.map(r=>r.text).join(' '),/80/);
 const cac=questions.find(q=>q.title.includes('广告费不是'));assert.match(cac.reference,/60 元/);assert.match(cac.reference,/100 元/);
});
