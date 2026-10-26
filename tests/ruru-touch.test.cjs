const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('viewport gesture handling permits a finger swipe instead of treating it as a double tap',()=>{
 const handlers={};let now=1000;
 vm.runInNewContext(fs.readFileSync('dist/viewport.js','utf8'),{Date:{now:()=>now},document:{addEventListener:(type,fn)=>handlers[type]=fn}});
 function start(x,y){handlers.touchstart({touches:[{clientX:x,clientY:y}]})}
 function end(x,y){const event={touches:[],changedTouches:[{clientX:x,clientY:y}],defaultPrevented:false,preventDefault(){this.defaultPrevented=true}};handlers.touchend(event);return event}
 start(200,400);now+=60;assert.equal(end(200,400).defaultPrevented,false);
 now+=50;start(200,400);now+=120;assert.equal(end(200,180).defaultPrevented,false);
 now+=50;start(200,180);now+=60;assert.equal(end(200,180).defaultPrevented,false);
});
