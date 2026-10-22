const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('refresh changes all site icons together and removes the stale responsive image candidate',()=>{
 const saved=new Map(),firstCycle=new Set();let previous='';for(let i=0;i<30;i++){
  const image={src:'starry',srcset:'starry 2x',removeAttribute(key){delete this[key]}},icons=[{},{}],apple=[{}];
  const document={currentScript:{src:'https://example.com/refinetaste/site-icon.js'},readyState:'complete',querySelectorAll:s=>s==='.brand-icon'?[image]:s==='link[rel="icon"]'?icons:apple};
  const sessionStorage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
  vm.runInNewContext(fs.readFileSync('dist/site-icon.js','utf8'),{document,sessionStorage,URL,Math});
  const mood=image.src.match(/icons\/([a-z]+)-96/)[1];assert.notEqual(mood,previous);if(i<18){assert.equal(firstCycle.has(mood),false);firstCycle.add(mood)}previous=mood;assert.equal(image.srcset,undefined);assert.ok(icons.every(icon=>icon.href.endsWith(mood+'-32.png')));assert.ok(apple[0].href.endsWith(mood+'-180.png'));for(const suffix of ['96.webp','32.png','180.png'])assert.ok(fs.existsSync('dist/assets/icons/'+mood+'-'+suffix));
 }
});
