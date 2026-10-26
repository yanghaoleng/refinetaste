const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={window:{}};vm.createContext(ctx);for(const f of ['guide-core','health-core'])vm.runInContext(fs.readFileSync('academy/selfcare/'+f+'.js','utf8'),ctx);const g=ctx.window.RuruOpening,h=ctx.window.RuruHealth;
test('both opening branches narrow to scenes and optional tags without inferring personality',()=>{
 for(const branch of ['enjoy','concern']){let s=g.branch(g.create(),branch),id=Object.keys(g.scenes[branch].items)[0];s=g.toggleScene(s,id);s=g.toggleTag(s,id,g.scenes[branch].items[id][1][0]);assert.ok(g.summary(s).includes('点选'));assert.ok(g.summary(s).includes('还没有展开具体经历'));assert.ok(g.question(s).endsWith('？'))}
 let s=g.toggleScene(g.branch(g.create(),'enjoy'),'games');s=g.toggleTag(s,'games','熟悉省心');assert.equal(g.question(s),'有没有一个你总会回去玩的游戏？');s=g.toggleTag(s,'games','都不太像');assert.deepEqual([...s.tags.games],['都不太像']);s=g.toggleScene(s,'games');assert.equal(s.tags.games,undefined);assert.equal(s.scenes.length,0);
});
test('opening back and branch changes cannot retain hidden tags from removed scenes',()=>{
 let s=g.toggleScene(g.branch(g.create(),'enjoy'),'games');s=g.toggleTag(s,'games','挑战过关');s=g.branch(s,'concern');assert.equal(Object.keys(s.tags).length,0);assert.equal(s.scenes.length,0);
});
test('sleep handles midnight and distinguishes time in bed from sleep, including shift work',()=>{
 assert.equal(h.inBed('23:30','07:00'),450);assert.equal(h.inBed('08:00','15:00'),420);assert.equal(h.inBed('07:00','07:00'),null);assert.equal(h.inBed('99:01','07:00'),null);assert.equal(h.inBed('', '07:00'),null);
 let s=h.create('sleep');s=h.set(s,'schedule','轮班或不固定');s.answers.times={usual:{bed:'08:00',try:'08:30',wake:'15:00'}};const f=h.feedback(s);assert.ok(f.known.some(x=>x.includes('不是实际睡眠')));assert.ok(f.effects.some(x=>x.source==='shift'));assert.ok(!f.known.some(x=>x.includes('实际睡了7小时')));
 s=h.set(s,'schedule','工作日和休息日不同');assert.equal(s.answers.times,undefined);
});
test('changed or skipped food and sleep choices remove stale followups',()=>{
 let s=h.create('sleep');s.answers.concerns=['想晚点睡自己的时间'];s.answers.causes=['刷屏或娱乐'];assert.ok(h.cards('sleep',s.answers).some(c=>c.key==='causes'));s=h.set(s,'concerns',['没明显困扰']);assert.equal(s.answers.causes,undefined);assert.ok(!h.cards('sleep',s.answers).some(c=>c.key==='causes'));
 s=h.create('diet');s.answers.foods=['含糖饮料'];s.answers.frequency={'含糖饮料':'几乎每天'};assert.ok(h.feedback(s).effects.some(e=>e.text.includes('游离糖')));s=h.set(s,'foods',['蔬菜、水果']);assert.equal(s.answers.frequency['含糖饮料'],undefined);assert.ok(!h.feedback(s).effects.some(e=>e.text.includes('游离糖')));
});
test('food preference without frequency never implies a diagnosis and missing answers stay unknown',()=>{
 let s=h.create('diet');s.answers.foods=['含糖饮料','腌制或加工食品'];assert.ok(!h.feedback(s).effects.some(e=>e.text.includes('游离糖')));s.answers.frequency={'含糖饮料':'几乎每天','腌制或加工食品':'一周2—4次'};const f=h.feedback(s);assert.ok(f.effects.some(e=>e.text.includes('不能由此推断')));assert.ok(f.effects.some(e=>e.text.includes('不能判断')));assert.ok(f.unknown.length);assert.ok(!('score' in f));assert.ok(h.feedback(h.create('sleep')).known[0].includes('没有提供'));
});
test('ranking is optional, reversible and exclusive non-action can replace other priorities',()=>{
 assert.deepEqual([...h.move(['a','b'],1,-1)],['b','a']);assert.deepEqual([...h.move(['a'],0,-1)],['a']);assert.deepEqual([...h.toggle(['少坐一会儿'],'先了解，不调整')],['先了解，不调整']);assert.equal(h.create('activity').answers.activityPriority,undefined);const s=h.create('activity');s.answers.limits=['活动时有疼痛或不适'];const f=h.feedback(s);assert.ok(f.safety[0].text.includes('当地急救'));assert.ok(f.unknown[0].includes('强度'));
});
test('all sixty-four non-health legacy lessons have individual original interactions',()=>{
 const x={window:{}};vm.createContext(x);vm.runInContext(fs.readFileSync('academy/selfcare/chapters-core.js','utf8'),x);const ch=x.window.RuruChapters,ids=[];
 for(const [topic,chapter] of Object.entries(ch.chapters)){assert.equal(chapter.cards.length,8);for(const c of ch.cards(topic)){ids.push(c.id);assert.ok(c.title.length<40);assert.ok(c.options.length>=3);assert.ok(['single','multi','rank'].includes(c.type))}const f=ch.feedback({topic,answers:{},notes:{}});assert.ok(f.known[0].includes('没有提供'));assert.ok(f.unknown[0].includes('点选'));assert.equal('score' in f,false)}
 assert.deepEqual(ids,[...Array(8).keys(),...Array.from({length:56},(_,i)=>i+24)]);
});
test('a selected adjustment stays optional and changing answers clears an old plan',()=>{
 let s=h.create('diet');s.answers.dietPriority=['看看饮料选择'];s.answers.readiness='准备试一点';assert.ok(h.feedback(s).suggestions.length);s.answers.plan='原来的计划';s=h.set(s,'readiness','暂时不调整');assert.equal(s.answers.plan,undefined);assert.equal(h.feedback(s).suggestions.length,0);
});

test('sleep context preserves day labels and avoids raw implementation keys',()=>{const s=h.create('sleep');s.answers.schedule='工作日和休息日不同';s.answers.times={work:{bed:'23:30',wake:'07:00'}};assert.ok(h.context(s).includes('工作日：上床'));assert.ok(!h.context(s).includes('\"answers\"'));});
