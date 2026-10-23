const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function env(reduced=false){let now=0,id=0,change;const timers=new Map(),media={matches:reduced,addEventListener:(_,fn)=>change=fn},ctx={document:{createElement:()=>animatedElement()},window:{},matchMedia:()=>media,setTimeout:(fn,delay)=>{timers.set(++id,{fn,at:now+delay});return id},clearTimeout:id=>timers.delete(id)};vm.runInNewContext(fs.readFileSync('dist/conversation-sequence.js','utf8'),ctx);return {api:ctx.window.RefineSequence,step(time){now=time;for(const [id,job]of [...timers])if(job.at<=time){timers.delete(id);job.fn()}},timers,reduce(){media.matches=true;change()}}}
const el=()=>({hidden:false,inert:false,isConnected:true});
test('first message gets a reading pause, then the second and composer appear, in order',()=>{const e=env(),a=el(),b=el(),form=el(),seen=[];e.api.opening({messages:[a,b],form,duration:()=>790,showMessage:m=>seen.push(m),onChange(){}});assert.deepEqual(seen,[a]);assert.equal(b.hidden,true);assert.equal(form.hidden,true);e.step(2389);assert.equal(b.hidden,true);e.step(2390);assert.equal(b.hidden,false);assert.deepEqual(seen,[a,b]);e.step(3480);assert.equal(form.hidden,false);assert.equal(form.inert,false)});
test('navigation cancels pending message reveals and reduced motion exposes everything immediately',()=>{const e=env(),a=el(),b=el(),form=el();e.api.opening({messages:[a,b],form,duration:()=>790,showMessage(){},onChange(){}});e.api.cancel();e.step(10000);assert.equal(b.hidden,true);assert.equal(e.timers.size,0);e.api.opening({messages:[a,b],form,duration:()=>790,showMessage(){},onChange(){}});e.reduce();assert.equal(b.hidden,false);assert.equal(form.hidden,false);assert.equal(e.timers.size,0)});
test('settlement details wait for the actual score animation and hold, with safe cancellation',async()=>{const e=env(),details=el();let resolve;const score={animate:()=>({finished:new Promise(r=>resolve=r)})};let shown=0;e.api.settlement({score,details,showDetails:()=>shown++});assert.equal(details.hidden,true);resolve();await Promise.resolve();await Promise.resolve();e.step(349);assert.equal(shown,0);e.step(350);assert.equal(shown,1);assert.equal(details.hidden,false)});
test('score increases from zero before the final value and text reveal; navigation cancels updates',async()=>{const e=env(),details=el(),values=[];let resolve;const score={isConnected:true,animate:()=>({finished:new Promise(r=>resolve=r)})};e.api.settlement({score,details,value:87.5,updateScore:v=>values.push(v),showDetails(){}});assert.equal(values[0],0);e.step(400);assert.ok(values.at(-1)>0&&values.at(-1)<87.5);e.step(700);resolve();await Promise.resolve();await Promise.resolve();assert.equal(values.at(-1),87.5);assert.equal(details.hidden,true);e.step(1050);assert.equal(details.hidden,false);e.api.settlement({score,details,value:100,updateScore:v=>values.push(v),showDetails(){}});e.api.cancel();const count=values.length;e.step(5000);assert.equal(values.length,count)});

function animatedElement(){
 const jobs=[],children=[];
 return {hidden:true,isConnected:true,style:{},jobs,children,setAttribute(){},append(child){children.push(child)},remove(){this.removed=true},animate(frames,options){let resolve,reject;const animation={frames,options,finished:new Promise((r,j)=>{resolve=r;reject=j}),finish(){resolve()},cancel(){this.cancelled=true;reject(new Error('cancelled'))}};jobs.push(animation);return animation}};
}
async function flush(){for(let i=0;i<8;i++)await Promise.resolve()}
test('perfect score stamps after counting and bursts from the score row only when the stamp lands',async()=>{
 const e=env(),score=animatedElement(),stamp=animatedElement(),scoreLine=animatedElement(),details=el();let shown=0;
 e.api.settlement({score,stamp,scoreLine,details,value:100,updateScore(){},showDetails(){shown++}});
 assert.equal(stamp.hidden,true);score.jobs[0].finish();await flush();e.step(350);
 assert.equal(stamp.hidden,false);assert.equal(stamp.jobs[0].options.duration,680);assert.equal(scoreLine.children.length,0);assert.equal(shown,0);
 stamp.jobs[0].finish();await flush();assert.equal(shown,1);assert.equal(scoreLine.children.length,1);
 const burst=scoreLine.children[0];assert.equal(burst.className,'result-confetti');assert.equal(burst.children.length,28);
 burst.children.forEach(paper=>paper.jobs[0].finish());await flush();assert.equal(burst.removed,true);
});
test('non-perfect results do not stamp or burst; reduced motion shows the perfect check immediately',async()=>{
 const e=env(),score=animatedElement(),stamp=animatedElement(),scoreLine=animatedElement(),details=el();
 e.api.settlement({score,stamp,scoreLine,details,value:87.5,showDetails(){}});score.jobs[0].finish();await flush();e.step(350);
 assert.equal(stamp.hidden,true);assert.equal(stamp.jobs.length,0);assert.equal(scoreLine.children.length,0);assert.equal(details.hidden,false);
 const reduced=env(true);reduced.api.settlement({score,stamp,scoreLine,details,value:100,showDetails(){}});
 assert.equal(stamp.hidden,false);assert.equal(stamp.jobs.length,0);assert.equal(scoreLine.children.length,0);
});
test('navigation interrupts the stamp and a reduced-motion change clears an active burst',async()=>{
 const e=env(),score=animatedElement(),stamp=animatedElement(),scoreLine=animatedElement(),details=el();let shown=0;
 const start=()=>e.api.settlement({score,stamp,scoreLine,details,value:100,showDetails(){shown++}});
 start();score.jobs[0].finish();await flush();e.step(350);e.api.cancel();await flush();
 assert.equal(stamp.jobs[0].cancelled,true);assert.equal(shown,0);assert.equal(scoreLine.children.length,0);
 start();score.jobs[1].finish();await flush();e.step(700);stamp.jobs[1].finish();await flush();
 const burst=scoreLine.children[0];e.reduce();await flush();assert.equal(burst.removed,true);assert.ok(burst.children.every(paper=>paper.jobs[0].cancelled));assert.equal(shown,1);
});
