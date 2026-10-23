const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('both entry-ticket alternatives show a QR-style visual matching the question, with different information priority',()=>{
 const source=fs.readFileSync('dist/app.js','utf8'),ctx={esc:s=>String(s),window:{}};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function specimen('),source.indexOf('function activateQuestionContext(')),ctx);
 const question=JSON.parse(fs.readFileSync('dist/course.json','utf8')).questions.find(q=>q.id===3);assert.equal(question.visuals.length,2);
 const images=question.visuals.map(ctx.specimen);for(const html of images){assert.match(html,/aria-label="示意检票二维码"/);assert.match(html,/<svg class="ticket-code"/)}
 assert.match(images[0],/ticket-scan-small/);assert.doesNotMatch(images[1],/ticket-scan-small/);assert.ok(images[1].indexOf('ticket-code')<images[1].indexOf('东门入场'));
});
