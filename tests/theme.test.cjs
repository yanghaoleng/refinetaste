const test=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
test('theme follows OS on first paint and on preference changes without storing an override',()=>{
  let onChange;const dataset={},meta={};const media={matches:true,addEventListener(name,fn){assert.equal(name,'change');onChange=fn}};
  const context={matchMedia:()=>media,document:{documentElement:{dataset},querySelector:()=>({setAttribute:(key,value)=>meta[key]=value})}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/theme.js'),'utf8'),context);
  assert.equal(dataset.theme,'dark');assert.equal(meta.content,'#000000');
  media.matches=false;onChange();assert.equal(dataset.theme,'light');assert.equal(meta.content,'#f8f6f0');
  media.matches=true;onChange();assert.equal(dataset.theme,'dark');assert.equal(meta.content,'#000000');
});
