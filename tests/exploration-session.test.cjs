const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('academy/selfcare/session-core.js','utf8'),ctx);const core=ctx.window.RuruExploration;
const report=()=>({sections:Object.fromEntries(core.sections.map(([key])=>[key,[{text:'还没聊到',status:'not_explored',evidence:[]}]])),courses:[]});
test('continuous state round-trips a long conversation without replacing legacy keys',()=>{
 let s=core.create('session-one');for(let i=0;i<40;i++)s=core.add(s,{id:'m'+i,role:i%2?'assistant':'user',content:i?'后续内容'+i:'原来想聊照顾家人'});
 const saved=JSON.parse(JSON.stringify(s));assert.equal(saved.messages.length,40);assert.equal(saved.messages[0].content,'原来想聊照顾家人');assert.equal(saved.revision,40);assert.ok(core.valid(saved));assert.equal(core.key,'selfcare-exploration-session-v1');assert.ok(core.capacity(saved.messages));
});
test('report corrections preserve old versions and flag later dialogue for regeneration',()=>{
 let s=core.add(core.create('s'),{id:'u1',role:'user',content:'我不想转行，只是想休息'});s=core.acceptReport(s,{basedOnRevision:s.revision,report:report()},'r1');
 assert.equal(core.stale(s),false);const old=JSON.stringify(s.reports[0]);
 s=core.edit(s,0,'clues',0,'想休息，不是转行',{id:'fix',role:'user',kind:'correction',content:'我想改成：想休息，不是转行'});
 assert.equal(s.reports.length,2);assert.equal(JSON.stringify(s.reports[0]),old);assert.equal(s.reports[1].sections.clues[0].evidence[0].messageId,'fix');assert.ok(core.stale(s));
 s=core.acceptReport(s,{basedOnRevision:s.revision,report:report()},'r3');assert.equal(core.stale(s),false);assert.equal(s.reports[2].version,3);
});
test('a late report cannot overwrite a newer conversation',()=>{
 let s=core.create('s'),oldRevision=s.revision;s=core.add(s,{id:'u',role:'user',content:'新的议题'});
 assert.throws(()=>core.acceptReport(s,{basedOnRevision:oldRevision,report:report()},'late'));
 assert.equal(s.reports.length,0);assert.equal(s.messages[0].content,'新的议题');
});

test('malformed saved reports are preserved for explicit recovery instead of rendered as valid',()=>{
 const s=core.create('s');s.reports=[{version:1,basedOnRevision:0,sections:{question:[null]},courses:[]}];assert.equal(core.valid(s),false);
});

test('copied report retains uncertainty labels and user evidence',()=>{
 const r=report();r.version=1;r.sections.clues=[{text:'可能需要一点自己的空间',status:'tentative',evidence:[{messageId:'u',quote:'想留一点时间'}]}];const text=core.exportReport(r);
 assert.match(text,/待核对的推测/);assert.match(text,/想留一点时间/);assert.match(text,/还没聊到/);
});

test('source-only fallback stays labelled in saved and copied reports',()=>{let s=core.create('s');const r=report();r.origin='source_notes';s=core.acceptReport(s,{basedOnRevision:0,report:r},'r');assert.equal(s.reports[0].origin,'source_notes');assert.match(core.exportReport(s.reports[0]),/AI深入整理暂未完成/);});
