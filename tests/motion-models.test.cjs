const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const scope={window:{}};vm.runInNewContext(fs.readFileSync('dist/motion-models.js','utf8'),scope);const api=scope.window.RefineMotionModels;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('3D meshes have depth, outward faces and an orthographic projection with real depth influence',()=>{
 const g=api.geometry.sphere();assert.ok(g.vertices.some(p=>p[2]>.5)&&g.vertices.some(p=>p[2]<-.5));
 const [a,b,c]=g.faces[60].map(i=>g.vertices[i]),u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
 assert.ok(n.reduce((sum,v,i)=>sum+v*a[i],0)>0);assert.notEqual(api.project([0,0,0])[0],api.project([0,0,1])[0]);
});
test('balls share initial gravity fall and preserve 3D volume while never penetrating the floor',()=>{
 for(const t of [0,.1,.2,.279])close(api.state('ball','elastic',t).ballY,api.state('ball','dense',t).ballY);
 for(let i=0;i<=96;i++)for(const variant of ['elastic','dense']){const p=api.state('ball',variant,i/96);close(p.sx*p.sy*p.sz,1);assert.ok(p.ballY-.5*p.sy>=-1e-9)}
 assert.ok(api.state('ball','elastic',.48).ballY>api.state('ball','dense',.48).ballY);
});
test('spacing variants take exactly the same second between identical endpoints',()=>{
 for(const variant of ['linear','eased']){close(api.state('spacing',variant,.12).x,-2);close(api.state('spacing',variant,.4325).x,2)}
 assert.notEqual(api.state('spacing','linear',.2).x,api.state('spacing','eased',.2).x);
 close((.4325-.12)*api.duration,1000);
});
test('contact-foot world position remains fixed during stance while the comparison deliberately slides',()=>{
 const a=api.state('walk-contact','grounded',.02),b=api.state('walk-contact','grounded',.1);close(a.feet[0][0],b.feet[0][0]);close(a.feet[0][1],.1);close(b.feet[0][1],.1);assert.ok(b.x>a.x);
 assert.notEqual(api.state('walk-contact','sliding',.02).feet[0][0],api.state('walk-contact','sliding',.1).feet[0][0]);
});
test('comparisons isolate wave pivots, stop attachments, matching jump endpoints and matching reach endpoints',()=>{
 for(const t of [0,.2,.6,1])assert.deepEqual(api.state('wave','joint',t),api.state('wave','center',t));
 for(const t of [.2,.6,.9]){const a=api.state('stop','follow',t),b=api.state('stop','locked',t);a.bag=a.scarf=b.bag=b.scarf=0;assert.deepEqual(a,b)}
 for(const variant of ['prepared','rushed']){const a=api.state('jump',variant,0),b=api.state('jump',variant,1);close(a.x,-1.5);close(b.x,1.5);close(a.y,0);close(b.y,0);assert.ok(api.state('jump',variant,.04).crouch>0)}
 for(const t of [0,1])assert.deepEqual(api.state('breakdown','clear',t).wrist,api.state('breakdown','crowded',t).wrist);
});
test('every motion scene rasterizes finite 3D triangles without drawing bitmap images',()=>{
 let triangles=0;const ctx={beginPath(){},closePath(){},fill(){triangles++},stroke(){},fillRect(){},fillText(){},drawImage(){throw Error('3D motion must not draw images')},moveTo(x,y){assert.ok(Number.isFinite(x)&&Number.isFinite(y))},lineTo(x,y){assert.ok(Number.isFinite(x)&&Number.isFinite(y))}};
 for(const [scene,variant]of [['ball','elastic'],['spacing','eased'],['wave','joint'],['wave','center'],['weight','grounded'],['weight','unbalanced'],['jump','prepared'],['stop','follow'],['walk-contact','grounded'],['feedback','energetic'],['review','lively'],['keys','consider'],['breakdown','clear']])for(const t of [0,.3,.6,1])api.draw(ctx,scene,variant,t,{rig:true,trace:true});
 assert.ok(triangles>10000);
});
