/* Anamorphic line sculptures: their front projection is the chapter's drawing. */
(()=>{
 const CONFIG={dpr:2,fps:30},reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover: hover) and (pointer: fine)');
 let fields=[],frame=0,last=0,intersection=null,resize=null,theme=null;
 function drawing(kind){
  const paths=[],line=(...p)=>paths.push(p),curve=(cx,cy,rx,ry,start=0,end=Math.PI*2)=>{const p=[];for(let i=0;i<=40;i++){const a=start+(end-start)*i/40;p.push([cx+rx*Math.cos(a),cy+ry*Math.sin(a)])}paths.push(p)};
  if(kind===0){ // A set square and pencil: arranging and drawing.
   line([-.8,.65],[-.8,-.68],[.56,.65],[-.8,.65]);line([-.57,.4],[-.57,-.12],[-.05,.4],[-.57,.4]);
   line([-.13,-.57],[.02,-.72],[.76,.02],[.81,.33],[.5,.28],[-.13,-.57]);line([.5,.28],[.76,.02]);
  }else if(kind===1){ // A megaphone: a resource communicates a promise.
   line([-.74,-.24],[-.25,-.24],[.55,-.64],[.55,.42],[-.25,.04],[-.74,.04],[-.74,-.24]);
   line([-.48,.04],[-.35,.63],[-.07,.63],[-.18,.08]);line([-.25,-.24],[-.25,.04]);
   line([.76,-.51],[.94,-.63]);line([.8,-.13],[1,-.13]);line([.76,.27],[.94,.4]);
  }else if(kind===2){ // A cup and rising steam: design in an everyday setting.
   curve(-.12,-.3,.59,.16);curve(-.12,.47,.48,.15,0,Math.PI);
   line([-.71,-.3],[-.6,.48]);line([.47,-.3],[.36,.48]);
   curve(.49,.06,.31,.29,-Math.PI/2,Math.PI/2);line([-.86,.73],[.77,.73]);
   for(const x of [-.37,.06]){const p=[];for(let i=0;i<=24;i++){const t=i/24;p.push([x+Math.sin(t*Math.PI*2)*.08,-.56-t*.39])}paths.push(p)}
  }else if(kind===3){ // A balance: comparing decisions.
   line([0,-.73],[0,.7]);line([-.46,.73],[.46,.73]);line([-.75,-.42],[.75,-.62]);curve(0,-.52,.09,.09);
   line([-.61,-.44],[-.88,.19],[-.36,.19],[-.61,-.44]);curve(-.62,.19,.26,.2,0,Math.PI);
   line([.61,-.6],[.35,.03],[.87,.03],[.61,-.6]);curve(.61,.03,.26,.2,0,Math.PI);
  }else if(kind===4){ // An open book and a small star: reading pictures and stories.
   line([0,-.37],[-.37,-.57],[-.83,-.45],[-.83,.63],[-.39,.51],[0,.72],[.39,.51],[.83,.63],[.83,-.45],[.37,-.57],[0,-.37],[0,.72]);
   line([-.64,-.17],[-.42,-.22],[-.2,-.11]);line([-.64,.09],[-.42,.04],[-.2,.15]);line([.21,-.1],[.43,-.22],[.64,-.17]);
   line([.25,-.91],[.31,-.77],[.45,-.71],[.31,-.65],[.25,-.51],[.19,-.65],[.05,-.71],[.19,-.77],[.25,-.91]);
  }else if(kind===7){ // A jointed figure: character, structure and gesture.
   curve(0,-.58,.22,.22);line([0,-.36],[0,.22]);line([-.42,-.17],[0,-.27],[.4,-.15],[.63,-.51]);
   line([0,.22],[-.27,.62],[-.5,.76]);line([0,.22],[.3,.59],[.5,.76]);
   for(const [x,y]of [[0,-.27],[0,.22],[-.27,.62],[.3,.59],[.4,-.15]])curve(x,y,.05,.05);
  }else if(kind===5){ // A clapperboard: planning individual shots.
   line([-.78,-.2],[.78,-.2],[.78,.71],[-.78,.71],[-.78,-.2]);line([-.78,-.25],[-.85,-.54],[.65,-.88],[.72,-.59],[-.78,-.25]);
   for(let i=0;i<4;i++){const x=-.64+i*.36;line([x,-.59-(x+.64)*.23],[x+.21,-.36-(x+.64)*.23])}
   line([-.5,.08],[.42,.08]);line([-.5,.36],[.04,.36]);
  }else{ // A film strip: organizing a longer timeline.
   line([-.88,-.64],[.88,-.64],[.88,.64],[-.88,.64],[-.88,-.64]);line([-.88,-.4],[.88,-.4]);line([-.88,.4],[.88,.4]);
   for(let i=0;i<5;i++){const x=-.7+i*.35;line([x,-.61],[x,-.43]);line([x,.43],[x,.61])}
   line([-.16,-.25],[.28,0],[-.16,.25],[-.16,-.25]);
  }
  return paths.map((path,index)=>{
   const points=[],lengths=[0];let total=0;
   for(let i=1;i<path.length;i++){total+=Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]);lengths.push(total)}
   for(let i=1;i<path.length;i++){
    const [a,b]=[path[i-1],path[i]],n=Math.max(1,Math.ceil((lengths[i]-lengths[i-1])*22));
    for(let j=i===1?0:1;j<=n;j++){const t=j/n,u=(lengths[i-1]+(lengths[i]-lengths[i-1])*t)/total;
     points.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,.7*Math.sin(u*Math.PI*1.7+index*1.91)+.25*Math.cos(u*Math.PI*3+index*.8)]);
    }
   }return points;
  });
 }
 function prepare(f){const r=f.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,CONFIG.dpr);f.w=Math.max(1,r.width);f.h=Math.max(1,r.height);f.canvas.width=Math.round(f.w*dpr);f.canvas.height=Math.round(f.h*dpr);f.ctx.setTransform(dpr,0,0,dpr,0,0);f.color=getComputedStyle(f.canvas).color}
 function draw(f,now,dt){
  if(!f.target)f.phase+=dt*.18;
  f.reveal=reduced.matches?1:f.reveal+(f.target-f.reveal)*(1-Math.exp(-dt*9));
  const blend=1-f.reveal,rx=(.65+Math.sin(f.phase*.63)*.24)*blend,ry=(1.5+Math.sin(f.phase)*.54)*blend,rz=(Math.sin(f.phase*.7)*.3-.2)*blend;
  const cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz),scale=Math.min(f.w,f.h)*.38;
  const project=([x,y,z])=>{const yy=y*cx-z*sx,zz=y*sx+z*cx,xx=x*cy+zz*sy,depth=-x*sy+zz*cy;return [(xx*cz-yy*sz)*scale+f.w/2,(xx*sz+yy*cz)*scale+f.h/2,depth]};
  const segments=[];
  for(const path of f.paths){let a=project(path[0]);for(let i=1;i<path.length;i++){const b=project(path[i]);segments.push({a,b,z:(a[2]+b[2])/2});a=b}}
  segments.sort((a,b)=>a.z-b.z);const c=f.ctx;c.clearRect(0,0,f.w,f.h);c.strokeStyle=f.color;c.lineCap='round';c.lineJoin='round';
  for(const {a,b,z} of segments){c.globalAlpha=.38+Math.min(1,Math.max(0,(z+1.4)/2.8))*.5+f.reveal*.1;c.lineWidth=Math.max(1.25,Math.min(f.w,f.h)*.018)*(1+z*.13*blend);c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke()}
  c.globalAlpha=1;
 }
 function running(){return !document.hidden&&!reduced.matches&&fields.some(f=>f.visible&&f.canvas.isConnected&&f.canvas.closest('dialog')?.open)}
 function tick(now){frame=0;if(!running())return;if(!last||now-last>=1000/CONFIG.fps){const dt=last?Math.min((now-last)/1000,.06):0;last=now;for(const f of fields)if(f.visible&&f.canvas.isConnected)draw(f,now,dt)}frame=requestAnimationFrame(tick)}
 function resume(){if(running()&&!frame){last=0;frame=requestAnimationFrame(tick)}}
 function pause(){cancelAnimationFrame(frame);frame=0;last=0}
 function dispose(){pause();intersection?.disconnect();resize?.disconnect();theme?.disconnect();for(const f of fields)for(const [event,fn] of Object.entries(f.events))f.row.removeEventListener(event,fn);fields=[]}
 function mount(root){
  dispose();fields=[...root.querySelectorAll('[data-particle-chapter]')].map(canvas=>{
   const kind=+canvas.dataset.particleChapter,row=canvas.closest('.course-chapter'),f={canvas,row,ctx:canvas.getContext('2d'),paths:drawing(kind),phase:kind*1.27+.8,reveal:reduced.matches?1:0,target:0,visible:true,hover:false,focus:false};
   const update=()=>{f.target=f.hover||f.focus?1:0;resume()};
   f.events={pointerenter:event=>{if(event.pointerType==='touch'||!fine.matches)return;f.hover=true;update()},pointerleave:()=>{f.hover=false;update()},focusin:()=>{f.focus=true;update()},focusout:event=>{if(!row.contains(event.relatedTarget)){f.focus=false;update()}}};
   for(const [event,fn]of Object.entries(f.events))row.addEventListener(event,fn);prepare(f);draw(f,performance.now(),0);return f;
  });
  intersection=new IntersectionObserver(entries=>{for(const e of entries){const f=fields.find(f=>f.canvas===e.target);if(f)f.visible=e.isIntersecting}if(running())resume();else pause()},{root:document.querySelector('#training')});
  resize=new ResizeObserver(entries=>{for(const e of entries){const f=fields.find(f=>f.canvas===e.target);if(f){prepare(f);draw(f,performance.now(),0)}}resume()});
  for(const f of fields){intersection.observe(f.canvas);resize.observe(f.canvas)}
  theme=new MutationObserver(()=>{for(const f of fields){prepare(f);draw(f,performance.now(),0)}});theme.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});resume();
 }
 reduced.addEventListener('change',()=>{pause();for(const f of fields){f.reveal=reduced.matches?1:0;draw(f,performance.now(),0)}resume()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else resume()});
 window.RefineParticles={mount,dispose};
})();
