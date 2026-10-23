const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(){
 let now=0;const destinations=[],titles=[true,false].map(link=>({matches:()=>link,addEventListener(type,handler){this.click=handler}}));
 const source=fs.readFileSync('dist/hero-carousel.js','utf8');
 vm.runInNewContext(source.slice(0,source.indexOf('})();')+5),{document:{querySelectorAll:()=>titles},performance:{now:()=>now},URL,window:{location:{href:'https://mikeywa.site/refinetaste/',assign:url=>destinations.push(String(url))}}});
 return {titles,destinations,click(index=0,gap=200,extra={}){now+=gap;const event={button:0,preventDefault(){this.prevented=true},...extra};titles[index].click(event);return event}};
}
test('each homepage title opens the data dashboard only on its fifth quick click',()=>{
 for(const index of [0,1]){const e=setup();for(let i=0;i<4;i++)e.click(index);assert.deepEqual(e.destinations,[]);e.click(index);assert.deepEqual(e.destinations,['https://mikeywa.site/refinetaste/data/'])}
});
test('pauses and clicks on a different title do not complete the gesture',()=>{
 const e=setup();for(let i=0;i<4;i++)e.click();e.click(0,1600);e.click(1);assert.deepEqual(e.destinations,[]);for(let i=0;i<4;i++)e.click();assert.equal(e.destinations.length,1);
});
test('modified clicks retain normal link behavior and do not count toward entry',()=>{
 const e=setup();assert.equal(e.click(0,200,{metaKey:true}).prevented,undefined);assert.equal(e.click().prevented,true);for(let i=0;i<3;i++)e.click();assert.equal(e.destinations.length,0);e.click();assert.equal(e.destinations.length,1);
});
