const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const moduleReady=import('../src/chinese-line-break.mjs');
test('animated Chinese runs bind closing punctuation backward and opening punctuation forward',async()=>{
 const {chineseTextRuns}=await moduleReady;
 for(const text of ['请看「红纸船」，再选。','需要（先观察），再做！','《绘本》里的“图文关系”，是什么？','AIGC 生成 20 秒。','看看👩🏽‍🎨，再说。']){
  const runs=chineseTextRuns(text);assert.equal(runs.map(r=>r.text).join(''),text);
  for(let i=1;i<runs.length;i++){assert.doesNotMatch(runs[i].text,/^[，。、；：！？）》」』】〕〉”’]/u);assert.doesNotMatch(runs[i-1].text,/[（《「『【〔〈“‘]$/u)}
 }
 const groups=chineseTextRuns('请选「纸船」，好不好？').filter(r=>r.keep).map(r=>r.text);
 assert.ok(groups.includes('「纸'));assert.ok(groups.includes('船」，'));assert.ok(groups.includes('好？'));
});
test('all course question variants and open tasks preserve their wording and safe punctuation boundaries',async()=>{
 const {chineseTextRuns}=await moduleReady,c=JSON.parse(fs.readFileSync('dist/course.json','utf8'));
 for(const q of c.questions)for(const variant of [{},...q.variants])for(const text of [variant.brief||q.brief,variant.prompt||q.prompt].filter(Boolean)){
  const runs=chineseTextRuns(text);assert.equal(runs.map(r=>r.text).join(''),text);
  runs.slice(1).forEach(run=>assert.doesNotMatch(run.text,/^[，。、；：！？）》」』】〕〉”’…]/u));
 }
});
