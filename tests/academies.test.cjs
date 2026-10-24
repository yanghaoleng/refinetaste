const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const config=JSON.parse(fs.readFileSync('academy/sites.json','utf8')),slugs=Object.keys(config);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'academy-test-'));cp.execFileSync('python3',['scripts/build-academies.py','--output',dir]);process.on('exit',()=>fs.rmSync(dir,{recursive:true,force:true}));
test('independent curricula retain the full interaction runtime with separate storage and valid sources',()=>{
 for(const [slug,total,chapters] of [['selfcare',80,10],['philosophy',64,8],['mediaclass',96,12]]){const root=path.join(dir,slug,'dist'),course=JSON.parse(fs.readFileSync(path.join(root,'course.json'),'utf8'));assert.equal(course.questions.length,total);assert.equal(course.chapters.length,chapters);
  const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'chapter-practice.js'),'utf8'),ctx);assert.deepEqual(JSON.parse(JSON.stringify(ctx.window.RefinePractice.menu.chapters)),course.chapters);
  for(const name of ['app.js','analytics.js','privacy-id.js']){const s=fs.readFileSync(path.join(root,name),'utf8');assert.doesNotMatch(s,/refinetaste/);if(name==='analytics.js')assert.ok(s.includes('/'+slug+'/api/'))}
  for(const ch of course.chapters){const qs=course.questions.filter(q=>q.chapter===ch.id);assert.equal(qs.length,8);assert.equal(qs.filter(q=>q.kind==='choice').length,4)}
  for(const [i,q] of course.questions.entries()){assert.equal(q.id,i);assert.ok(q.sources.length);assert.ok(q.brief.length>15);if(q.kind==='choice'){assert.equal(q.visuals.length,2);assert.notDeepEqual(q.visuals[0],q.visuals[1])}else{assert.ok(q.prompt);assert.ok(q.reference.length>35)}}
 }
});
test('every homepage hides all other native course links behind the footer entry before privacy',()=>{
 const cases=[['design','dist/index.html'],['music',path.resolve('..','音乐班/lilaoshi/web/index.html')],...slugs.map(slug=>[slug,path.join(dir,slug,'dist/index.html')])];
 const urls={design:'https://mikeywa.site/refinetaste/',music:'https://m.mikeywa.site/pianoclass/',...Object.fromEntries(slugs.map(slug=>[slug,'https://mikeywa.site'+config[slug].base+'/']))};
 for(const [current,file] of cases){if(!fs.existsSync(file)&&current==='music')continue;const document=fs.readFileSync(file,'utf8');assert.ok(document.indexOf('id="more-courses"')<document.indexOf('id="privacy-open"'));assert.match(document,/<section id="more-courses-panel"[^>]+hidden>/);const section=document.match(/<span id="other-fields".*?<\/section><\/span>/s)[0];assert.equal((section.match(/<a /g)||[]).length,Object.keys(urls).length-1);for(const [key,url] of Object.entries(urls))assert.equal(section.includes('href="'+url+'"'),key!==current)}
});
test('each subject case renders as native readable information, without new vector illustrations',()=>{
 const ctx={window:{}};vm.runInNewContext(fs.readFileSync('dist/marketing-cases.js','utf8'),ctx);
 for(const slug of slugs)for(const q of JSON.parse(fs.readFileSync('academy/'+slug+'/course.json')).questions)for(const v of q.visuals){const html=ctx.window.RefineMarketing.render(v);assert.match(html,/<figcaption>/);assert.doesNotMatch(html,/<svg|<script/);for(const row of v.rows)assert.ok(html.includes(row.text))}
});
test('independent academy identities replace the coach, portraits and icons without changing lesson data',()=>{
 const config=JSON.parse(fs.readFileSync('academy/sites.json','utf8'));
 for(const slug of slugs){
  const root=path.join(dir,slug),web=path.join(root,'dist'),cfg=config[slug];
  const home=fs.readFileSync(path.join(web,'index.html'),'utf8');
  assert.ok(home.includes('<title>'+cfg.name+'</title>'));
  assert.ok(home.includes('alt="'+cfg.character+'"'));
  assert.ok(home.includes('src="assets/mascot.png"'));
  assert.ok(home.includes(cfg.coach));const app=fs.readFileSync(path.join(web,'app.js'),'utf8');assert.ok(app.includes(cfg.character));assert.doesNotMatch(app,/JOJO/);
  const generated=JSON.parse(fs.readFileSync(path.join(web,'course.json'),'utf8'));
  const source=JSON.parse(fs.readFileSync('academy/'+slug+'/course.json','utf8'));assert.deepEqual(generated.questions,source.questions);
  for(const name of ['favicon-starry-32.png','apple-touch-starry.png']){
   const image=fs.readFileSync(path.join(web,'assets',name));assert.ok(image.length>100);assert.notDeepEqual(image,fs.readFileSync(path.join('dist/assets',name)));
  }
  const icons=fs.readdirSync(path.join(web,'assets/icons')).filter(x=>x.endsWith('-96.webp'));assert.equal(icons.length,18);
  assert.notDeepEqual(fs.readFileSync(path.join(web,'assets/icons/happy-96.webp')),fs.readFileSync(path.join(web,'assets/icons/thinking-96.webp')));
  const css=fs.readFileSync(path.join(web,'course.css'),'utf8');
  const sprites=[...css.matchAll(/assets\/((?:wenwen|aying|xiaoman)-[a-z-]+-[a-f0-9]{12}\.webp)/g)].map(m=>m[1]);assert.equal(sprites.length,4);
  for(const asset of sprites){assert.ok(asset.startsWith(cfg.identity+'-'));assert.ok(home.includes('assets/'+asset));assert.ok(app.includes('assets/'+asset));assert.ok(fs.existsSync(path.join(web,'assets',asset)))}
  for(const text of [home,app,css])assert.doesNotMatch(text,/chick-(?:emotions|positive-emotions|cool-expressions|gaze)\.webp/);
  assert.match(home,/href="course\.css\?v=[a-f0-9]{12}"/);assert.match(home,/src="app\.js\?v=[a-f0-9]{12}"/);
 }
});
test('selfcare covers health and the whole coffee chat process with private notes and non-performance grading',()=>{
 const course=JSON.parse(fs.readFileSync('academy/selfcare/course.json','utf8'));
 assert.equal(new Set(course.questions.map(q=>q.title)).size,80);
 const titles=course.chapters.map(ch=>ch.title).join(' ');for(const topic of ['睡眠','饮食','压力','关系','破圈','邀约','追问','互惠','跟进'])assert.ok(titles.includes(topic));
 const app=fs.readFileSync(path.join(dir,'selfcare/dist/app.js'),'utf8');assert.ok(app.includes('selfcare-notes'));assert.doesNotMatch(app,/muguang-notes/);assert.ok(app.includes('不评价健康状况、性格或社交表现'));
 for(const q of course.questions){assert.ok(q.sources.every(s=>/^https:\/\//.test(s.url)));if(q.kind==='open')assert.ok(q.rubric.length>=3)}
});
