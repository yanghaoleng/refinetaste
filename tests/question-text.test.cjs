const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/app.js','utf8'),scope={esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')};
vm.createContext(scope);vm.runInContext(source.slice(source.indexOf('function questionText('),source.indexOf('function presentQuestion(')),scope);
const course=JSON.parse(fs.readFileSync('dist/course.json','utf8'));
test('every question and alternate merges all wording and emphasizes its final task once',()=>{
 for(const base of course.questions)for(const q of [base,...base.variants.map(v=>({...base,...v}))]){
  const html=scope.questionText(q),plain=html.replaceAll('<strong>','').replaceAll('</strong>','');
  assert.equal(plain,scope.esc(q.brief.trim()+(q.kind==='open'?' '+q.prompt.trim():'')));
  assert.equal((html.match(/<strong>/g)||[]).length,1);
  assert.ok(html.endsWith('</strong>'));
  if(q.kind==='open')assert.ok(html.endsWith(`<strong>${scope.esc(q.prompt.trim())}</strong>`));
 }
});
test('question text escapes markup and both quiz and notebook use the combined text',()=>{
 assert.equal(scope.questionText({kind:'choice',brief:'背景。哪版更清楚？'}),'背景。<strong>哪版更清楚？</strong>');
 assert.equal(scope.questionText({kind:'open',brief:'<背景>',prompt:'<任务>'}),'&lt;背景&gt; <strong>&lt;任务&gt;</strong>');
 assert.match(source,/<h2 id="exercise-title" tabindex="-1">\$\{questionText\(q\)\}<\/h2>/);
 assert.match(source,/<section class="note-question"><p>\$\{questionText\(q\)\}<\/p><\/section>/);
});
