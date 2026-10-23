/* Bitmap character studies: one shared clock, raster sprites, optional canvas guides. */
(()=>{
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const moving=new Set(['wave','ball','jump','stop','walk','feedback','review']);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const assetPaths={motion:'assets/characters/pixel-motion.webp',study:'assets/characters/pixel-studies.webp',ball:'assets/characters/pixel-ball.webp'};
 const images={};let host=null,playing=false,slow=false,elapsed=0,last=null,raf=0,scenes=[];
 function render(v){return `<figure class="specimen character-study ${v.rig?'character-structure':''}" data-character-scene="${escape(v.scene)}" data-character-variant="${escape(v.variant)}"><div class="character-study-tag">像素角色 · 动作观察</div><figcaption>${escape(v.title)}</figcaption><canvas class="character-canvas" width="200" height="170" role="img" aria-label="${escape(v.description)}">${escape(v.description)}</canvas>${v.scene==='silhouette'?'<div class="character-small"><canvas width="64" height="55" aria-hidden="true"></canvas><span>64 px 预览</span></div>':''}<div class="character-study-notes">${(v.notes||[]).map(line=>`<p>${escape(line)}</p>`).join('')}</div></figure>`}
 function controls(visuals){
  if(!visuals?.some(v=>v.kind==='character-study'))return '';
  const hasMotion=visuals.some(v=>moving.has(v.scene)),hasBody=visuals.some(v=>v.scene!=='ball'),hasRig=visuals.some(v=>['wave','weight','jump','stop','walk','review'].includes(v.scene));
  return `<div class="character-toolbar" role="group" aria-label="角色案例观察工具">${hasMotion?'<button type="button" data-character-play aria-pressed="false">播放</button><button type="button" data-character-replay>重播</button><button type="button" data-character-slow aria-pressed="false">慢放 0.5×</button>':''}${hasRig?'<button type="button" data-character-rig aria-pressed="false">骨架 / 受力辅助</button>':''}${hasBody?'<button type="button" data-character-silhouette aria-pressed="false">剪影</button>':''}<span>${hasMotion?'两版同步播放，可暂停观察':'切换辅助视图，检查结构'}</span></div>`;
 }
 const sin=Math.sin,pi=Math.PI;
 function legPose(side,phase,rootY=0,step=24,lift=18){
  const t=(phase+(side===1?.5:0))%1,x=t<.5?step*(1-4*t):step*(-1+4*(t-.5)),y=84-rootY-(t<.5?0:lift*sin((t-.5)*2*pi));
  const d=Math.min(87.9,Math.hypot(x,y)),a=d/2,h=Math.sqrt(44*44-a*a),kx=x/2-y/d*h,ky=y/2+x/d*h;
  const upper=Math.atan2(ky,kx)*180/pi-90,lower=Math.atan2(y-ky,x-kx)*180/pi-90-upper;
  return {upper,lower};
 }
 function sample(scene,variant,t){
  const p={x:200,y:210,body:0,head:0,bag:0,scarf:0,armL:12,armR:-12,foreL:-8,foreR:8,legL:7,legR:-7,kneeL:-10,kneeR:10,ballY:78,ballX:1,ballScaleY:1,stars:0};
  if(scene==='wave'||scene==='review'){
   p.armR=-120+18*sin(t*2*pi);p.foreR=-23+28*sin(t*4*pi);p.head=3*sin(t*2*pi);
   if(variant==='lively'){p.y-=8*Math.abs(sin(t*4*pi));p.armR=-100+45*sin(t*4*pi);p.bag=10*sin(t*4*pi-.5)}
  }
  if(scene==='ball'){
   if(t<.28)p.ballY=78+182*(t/.28)**2;
   else if(t<.34){const squeeze=sin((t-.28)/.06*pi)*(variant==='elastic'?.28:.035);p.ballX=1+squeeze;p.ballScaleY=1/p.ballX;p.ballY=282-22*p.ballScaleY}
   else {const ranges=variant==='elastic'?[[.34,.62,105],[.62,.82,45],[.82,.96,15]]:[[.34,.53,18],[.53,.65,5]];p.ballY=260;for(const [a,b,h]of ranges)if(t>=a&&t<b){const u=(t-a)/(b-a);p.ballY=260-4*h*u*(1-u)}}
  }
  if(scene==='jump'){
   const u=Math.max(0,Math.min(1,(t-.25)/.43));p.x=80+230*u;p.y=210-78*sin(pi*u);
   if(variant==='prepared'){
    const crouch=t<.25?15*sin(pi*t/.25):t>.68&&t<.86?12*sin(pi*(t-.68)/.18):0;p.y+=crouch;p.body=-6*sin(pi*u);p.armR=-15-100*sin(pi*u);p.armL=15+50*sin(pi*u);
    const bend=legPose(1,0,crouch,8,0);p.legR=bend.upper;p.kneeR=bend.lower;p.legL=-bend.upper;p.kneeL=-bend.lower;
   }
  }
  if(scene==='stop'){
   p.x=80+160*Math.min(1,t/.4);p.body=t<.4?-8:0;
   const phase=(Math.min(t,.4)/.4*2)%1;for(const side of [-1,1]){const leg=legPose(side,phase,0,20,15);p[side===1?'legR':'legL']=leg.upper;p[side===1?'kneeR':'kneeL']=leg.lower}
   if(variant==='follow'&&t>.4){const u=(t-.4)/.6;p.bag=-30*sin(u*pi*3)*Math.exp(-3*u);p.scarf=38*sin(u*pi*4)*Math.exp(-2.5*u)}
  }
  if(scene==='walk'){
   const phase=t;p.y=210-2*Math.abs(sin(phase*2*pi));
   for(const side of [-1,1]){const leg=legPose(side,phase,p.y-210);p[side===1?'legR':'legL']=leg.upper;p[side===1?'kneeR':'kneeL']=leg.lower}
   p.armR=24*sin(t*2*pi);p.armL=-p.armR;p.bag=5*sin(t*2*pi-.5);
  }
  if(scene==='feedback'){
   if(variant==='energetic'){const u=Math.min(1,t/.82);p.y-=27*Math.abs(sin(u*pi*3));p.armR=-65-65*sin(u*pi*3);p.armL=65+65*sin(u*pi*3);p.stars=t<.85?sin(Math.min(1,t/.2)*pi/2):0}
   else{const u=Math.max(0,Math.min(1,(t-.15)/.65));p.x+=7*sin(u*pi);p.head=10*sin(u*pi);p.armR=-12-42*sin(u*pi);p.foreR=-12*sin(u*pi)}
  }
  return p;
 }

 function tileAt(scene,variant,t){
  if(scene==='walk'||scene==='stop'&&t<.4)return 6+Math.floor((scene==='walk'?t:t/.4*2)%1*6);
  if(scene==='jump')return variant==='translated'?12:t<.08?12:t<.25?13:t<.4?14:t<.6?15:t<.68?14:t<.82?16:17;
  if(scene==='stop')return variant==='locked'||t<.42||t>.86?18:t<.57?19:t<.7?20:t<.8?19:18;
  if(scene==='feedback')return variant==='gentle'?(t<.15||t>.85?0:t<.45?4:5):21+Math.floor(t*6)%3;
  if(scene==='review'&&variant==='lively')return 21+Math.floor(t*6)%3;
  return 1;
 }
 function tile(ctx,image,index,columns,rows,x,y,w,h){
  if(!image?.complete||!image.naturalWidth)return;
  const sw=image.naturalWidth/columns,sh=image.naturalHeight/rows;
  ctx.drawImage(image,index%columns*sw,Math.floor(index/columns)*sh,sw,sh,x,y,w,h);
 }
 function guides(ctx,kind,variant,p,t){
  ctx.save();ctx.lineWidth=3;ctx.strokeStyle='#f2d775';ctx.fillStyle='#fff6bd';ctx.shadowColor='#254c59';ctx.shadowBlur=2;
  const line=(points)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();points.forEach(([x,y])=>{ctx.fillRect(x-3,y-3,6,6)})};
  if(kind==='weight'){
   line(variant==='grounded'?[[173,133],[172,192],[194,232],[148,292]]:[[170,128],[172,197],[173,247],[173,292]]);
   ctx.strokeStyle='#ba5357';ctx.setLineDash([5,5]);line([[215,120],[215,302]]);ctx.setLineDash([]);ctx.strokeStyle='#376a60';line(variant==='grounded'?[[130,307],[258,307]]:[[161,307],[185,307]]);
  }else if(kind==='wave'||kind==='review'){
   ctx.translate(p.x,p.y);const angle=Math.sin(t*Math.PI*2)*.32,pivot=variant==='center'?[-47,-20]:[-22,10];
   line([[0,55],[0,5],[0,-52]]);ctx.translate(...pivot);ctx.rotate(angle);line([[0,0],[-20,-15],[-32,-43]]);ctx.fillStyle=variant==='center'?'#ed827b':'#fff6bd';ctx.fillRect(-4,-4,8,8);
  }else{ctx.translate(p.x,p.y);line([[0,-105],[0,-60],[0,0],[-16,40],[-25,82]]);line([[0,0],[15,40],[25,82]])}
  ctx.restore();
 }
 function draw(scene,t){
  const canvas=scene.querySelector('.character-canvas'),ctx=canvas?.getContext('2d');if(!ctx)return;
  // Render at half resolution, then display with nearest-neighbour scaling for crisp pixels.
  const kind=scene.dataset.characterScene,variant=scene.dataset.characterVariant,p=sample(kind,variant,t);
  ctx.clearRect(0,0,200,170);ctx.imageSmoothingEnabled=false;ctx.save();ctx.scale(.5,.5);ctx.save();
  const silhouette=scene.classList.contains('character-silhouette');if(silhouette)ctx.filter='brightness(0) saturate(0)';
  if(kind==='silhouette')tile(ctx,images.study,variant==='busy'?1:0,4,2,52,25,296,296);
  else if(kind==='turnaround'){
   [2,3,variant==='drifting'?5:4].forEach((index,i)=>tile(ctx,images.study,index,4,2,8+i*128,92,128,128));
  }else if(kind==='weight')tile(ctx,images.study,variant==='grounded'?6:7,4,2,37,10,326,300);
  else if(kind==='ball'){
   ctx.fillStyle='#b4bd9f';ctx.fillRect(65,282,270,2);
   ctx.translate(200,p.ballY);ctx.scale(p.ballX,p.ballScaleY);tile(ctx,images.ball,0,1,1,-32,-32,64,64);
  }else{
   ctx.translate(p.x,p.y);ctx.rotate(p.body*Math.PI/180);
   const index=tileAt(kind,variant,t),base=index===15?195:235;
   if(kind==='wave'&&variant!=='center'||kind==='review'&&variant!=='lively'){
    tile(ctx,images.motion,[1,2,3,2][Math.floor(t*4)%4],6,4,-128,-145,256,256);
   }else if(kind==='wave'&&variant==='center'){
    // Rig the same bitmap arm around either the shoulder or the deliberately incorrect centre pivot.
    const a=Math.sin(t*Math.PI*2)*.32;
    const armPath=()=>{ctx.moveTo(-73,-45);[[-45,-49],[-31,-19],[-15,-9],[-15,19],[-43,8],[-65,-8]].forEach(([x,y])=>ctx.lineTo(x,y));ctx.closePath()};
    ctx.save();ctx.beginPath();ctx.rect(-128,-145,256,256);armPath();ctx.clip('evenodd');tile(ctx,images.motion,1,6,4,-128,-145,256,256);ctx.restore();
    const pivot=variant==='center'?[-47,-20]:[-22,10];ctx.translate(...pivot);ctx.rotate(a);ctx.translate(-pivot[0],-pivot[1]);
    ctx.beginPath();armPath();ctx.clip();tile(ctx,images.motion,1,6,4,-128,-145,256,256);
   }else tile(ctx,images.motion,index,6,4,-128,90-base,256,256);
  }
  ctx.restore();
  if(scene.classList.contains('character-structure')&&!silhouette){guides(ctx,kind,variant,p,t);ctx.font='10px system-ui';ctx.fillStyle='#53695b';ctx.fillText('辅助线为定性示意',14,330)}
  if(kind==='turnaround'){ctx.font='12px system-ui';ctx.fillStyle='#53695b';ctx.textAlign='center';['正面','侧转','侧面'].forEach((s,i)=>ctx.fillText(s,72+i*128,288))}
  if(kind!=='ball'){ctx.fillStyle='#bdc5ac';ctx.fillRect(40,310,320,1)}
  ctx.restore();
  const small=scene.querySelector('.character-small canvas');if(small){const sc=small.getContext('2d');sc.imageSmoothingEnabled=false;sc.clearRect(0,0,64,55);sc.drawImage(canvas,0,0,64,55)}
 }
 function paint(){scenes.forEach(scene=>draw(scene,(elapsed%3200)/3200))}
 function tick(now){raf=0;if(!playing)return;if(last!==null)elapsed+=(now-last)*(slow?.5:1);last=now;paint();raf=requestAnimationFrame(tick)}
 function refresh(){const button=host?.querySelector('[data-character-play]');if(button){button.textContent=playing?'暂停':'播放';button.setAttribute('aria-pressed',String(playing))}}
 function pause(){if(raf)cancelAnimationFrame(raf);raf=0;last=null;playing=false;refresh()}
 function play(){if(!scenes.some(scene=>moving.has(scene.dataset.characterScene)))return;playing=true;last=null;if(!raf)raf=requestAnimationFrame(tick);refresh()}
 function dispose(){pause();scenes=[];host=null;slow=false;elapsed=0}
 function mount(root){
  dispose();if(!root?.querySelector('.character-study'))return;host=root;scenes=Array.from(root.querySelectorAll('[data-character-scene]'));
  for(const [key,path]of Object.entries(assetPaths))if(!images[key]){const image=images[key]=new Image();image.onload=()=>{if(host)paint()};image.onerror=()=>{if(host){pause();scenes.forEach(scene=>{const canvas=scene.querySelector('.character-canvas');canvas?.setAttribute('aria-label','图片加载失败，请重新进入本题')})}};image.src=path}
  const on=(selector,fn)=>{const button=root.querySelector(selector);if(button)button.onclick=fn};
  on('[data-character-play]',()=>playing?pause():play());
  on('[data-character-replay]',()=>{elapsed=0;last=null;paint();play()});
  on('[data-character-slow]',()=>{slow=!slow;last=null;root.querySelector('[data-character-slow]').setAttribute('aria-pressed',String(slow))});
  for(const [selector,className]of [['[data-character-rig]','character-structure'],['[data-character-silhouette]','character-silhouette']])on(selector,()=>{
   const button=root.querySelector(selector),enabled=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(enabled));scenes.forEach(scene=>scene.classList.toggle(className,enabled));paint();
  });
  if(root.querySelector('.character-structure'))root.querySelector('[data-character-rig]')?.setAttribute('aria-pressed','true');
  paint();if(!reduced.matches)play();else refresh();
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
 reduced.addEventListener('change',()=>{if(reduced.matches){pause();elapsed=0;paint()}});
 window.RefineCharacters={render,controls,mount,dispose,sample,tileAt};
})();
