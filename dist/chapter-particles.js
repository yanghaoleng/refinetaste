/* Small monochrome 3D halftones: one aligned dot grid per chapter, no dependencies. */
(()=>{
  const CONFIG={gap:2.6,dpr:2,fps:30,ambientSpeed:.028,hoverSpeed:.85,buckets:8};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let fields=[],frame=0,last=0,intersection=null,resize=null,theme=null;
  function geometry(kind){
    const points=[];
    const add=(x,y,z)=>points.push(x,y,z);
    if(kind===0){
      for(let layer=-1;layer<=1;layer++)for(let i=-16;i<=16;i++)for(let j=-16;j<=16;j++){
        const x=i/22,y=j/22;if(Math.abs(x)>.62&&Math.abs(y)>.62&&Math.hypot(Math.abs(x)-.62,Math.abs(y)-.62)>.13)continue;
        add(x,y,layer*.36);
      }
    }else if(kind===1){
      for(let ring=0;ring<2;ring++)for(let u=0;u<112;u++)for(let v=0;v<14;v++){
        const a=u/112*Math.PI*2,b=v/14*Math.PI*2,r=.65+.13*Math.cos(b);
        if(ring===0)add(r*Math.cos(a)-.22,r*Math.sin(a),.13*Math.sin(b));
        else add(.13*Math.sin(b)+.22,r*Math.cos(a),r*Math.sin(a));
      }
    }else{
      for(let u=0;u<180;u++)for(let v=-8;v<=8;v++){
        const a=u/180*Math.PI*2,w=v*.042,r=.72+w*Math.cos(a/2);
        add(r*Math.cos(a),r*Math.sin(a),w*Math.sin(a/2)*1.7);
      }
    }
    return new Float32Array(points);
  }
  function prepare(field){
    const rect=field.canvas.getBoundingClientRect();field.w=Math.max(1,rect.width);field.h=Math.max(1,rect.height);
    const dpr=Math.min(devicePixelRatio||1,CONFIG.dpr);
    field.canvas.width=Math.round(field.w*dpr);field.canvas.height=Math.round(field.h*dpr);
    field.ctx.setTransform(dpr,0,0,dpr,0,0);
    field.cols=Math.ceil(field.w/CONFIG.gap);field.rows=Math.ceil(field.h/CONFIG.gap);
    field.depth=new Float32Array(field.cols*field.rows);field.light=new Float32Array(field.cols*field.rows);
    field.color=getComputedStyle(field.canvas).color;
    const base=document.createElement('canvas');base.width=field.canvas.width;base.height=field.canvas.height;
    const ctx=base.getContext('2d');ctx.scale(dpr,dpr);ctx.fillStyle=field.color;ctx.globalAlpha=.045;ctx.beginPath();
    for(let y=1;y<field.rows-1;y++)for(let x=1;x<field.cols-1;x++){
      const px=x*CONFIG.gap,py=y*CONFIG.gap;if(Math.hypot((px-field.w/2)/(field.w*.5),(py-field.h/2)/(field.h*.5))>1)continue;
      ctx.moveTo(px+.42,py);ctx.arc(px,py,.42,0,Math.PI*2);
    }
    ctx.fill();field.base=base;
  }
  function draw(field,now,dt){
    const {ctx,w,h,cols,rows,points,depth,light}=field;
    field.hover+=(field.target-field.hover)*Math.min(1,dt*5);
    field.phase+=dt*(CONFIG.ambientSpeed+field.hover*CONFIG.hoverSpeed);
    const angle=field.phase,rx=.58+Math.sin(angle*.7)*.1,ry=-.5+angle,rz=-.12+Math.sin(angle*.5)*.06;
    const ax=Math.cos(rx),bx=Math.sin(rx),ay=Math.cos(ry),by=Math.sin(ry),az=Math.cos(rz),bz=Math.sin(rz);
    const scale=Math.min(w,h)*.365*(1+field.hover*.055);
    depth.fill(-Infinity);light.fill(0);
    for(let i=0;i<points.length;i+=3){
      const x=points[i],y=points[i+1],z=points[i+2],yy=y*ax-z*bx,zz=y*bx+z*ax,xx=x*ay+zz*by,zz2=-x*by+zz*ay;
      const px=(xx*az-yy*bz)*scale/(1-zz2*.12)+w/2,py=(xx*bz+yy*az)*scale/(1-zz2*.12)+h/2;
      const gx=Math.round(px/CONFIG.gap),gy=Math.round(py/CONFIG.gap);if(gx<0||gx>=cols||gy<0||gy>=rows)continue;
      const cell=gy*cols+gx;if(zz2<depth[cell])continue;depth[cell]=zz2;
      const flow=.94+.06*Math.sin(angle*2+x*3+y*2);
      light[cell]=Math.max(.12,Math.min(1,(.46+zz2*.33)*flow+field.hover*.08));
    }
    ctx.clearRect(0,0,w,h);ctx.drawImage(field.base,0,0,w,h);ctx.fillStyle=field.color;
    const progress=Math.min(1,(now-field.waveAt)/800),wave=(1-Math.pow(1-progress,3))*Math.max(w,h);
    if(progress<1&&!reduced.matches){
      for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++){
        const distance=Math.hypot(gx*CONFIG.gap-field.waveX,gy*CONFIG.gap-field.waveY),band=Math.exp(-Math.pow(Math.abs(distance-wave)/8,2.1));
        const cell=gy*cols+gx;light[cell]=Math.max(light[cell],band*(1-progress)*.45);
      }
    }
    for(let bucket=0;bucket<CONFIG.buckets;bucket++){
      ctx.globalAlpha=.18+bucket*.105;ctx.beginPath();const radius=.45+bucket*.105;
      for(let cell=0;cell<light.length;cell++){
        if(light[cell]<=.01||Math.min(CONFIG.buckets-1,Math.floor(light[cell]*CONFIG.buckets))!==bucket)continue;
        const x=cell%cols*CONFIG.gap,y=Math.floor(cell/cols)*CONFIG.gap;ctx.moveTo(x+radius,y);ctx.arc(x,y,radius,0,Math.PI*2);
      }
      ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  function running(){return !document.hidden&&!reduced.matches&&fields.some(f=>f.visible&&f.canvas.isConnected&&f.canvas.closest('dialog')?.open)}
  function tick(now){
    frame=0;if(!running())return;
    if(!last||now-last>=1000/CONFIG.fps){const dt=last?Math.min((now-last)/1000,.06):0;last=now;for(const f of fields)if(f.visible&&f.canvas.isConnected)draw(f,now,dt)}
    frame=requestAnimationFrame(tick);
  }
  function resume(){if(running()&&!frame){last=0;frame=requestAnimationFrame(tick)}}
  function pause(){cancelAnimationFrame(frame);frame=0;last=0}
  function dispose(){pause();intersection?.disconnect();resize?.disconnect();theme?.disconnect();for(const f of fields){f.row.removeEventListener('pointerenter',f.enter);f.row.removeEventListener('pointerleave',f.leave)}fields=[]}
  function mount(root){
    dispose();
    fields=[...root.querySelectorAll('[data-particle-chapter]')].map(canvas=>{
      const kind=+canvas.dataset.particleChapter,row=canvas.closest('.course-chapter');
      const f={canvas,row,ctx:canvas.getContext('2d'),points:geometry(kind),phase:kind*.7,hover:0,target:0,visible:true,waveAt:-Infinity,waveX:0,waveY:0};
      f.enter=event=>{if(event.pointerType==='touch'||reduced.matches)return;f.target=1;f.waveAt=performance.now();const rect=canvas.getBoundingClientRect();f.waveX=Math.max(0,Math.min(rect.width,event.clientX-rect.left));f.waveY=Math.max(0,Math.min(rect.height,event.clientY-rect.top));resume()};
      f.leave=()=>{f.target=0};row.addEventListener('pointerenter',f.enter);row.addEventListener('pointerleave',f.leave);prepare(f);draw(f,performance.now(),0);return f;
    });
    intersection=new IntersectionObserver(entries=>{for(const e of entries){const f=fields.find(f=>f.canvas===e.target);if(f)f.visible=e.isIntersecting}if(running())resume();else pause()},{root:document.querySelector('#training')});
    resize=new ResizeObserver(entries=>{for(const e of entries){const f=fields.find(f=>f.canvas===e.target);if(f){prepare(f);draw(f,performance.now(),0)}}resume()});
    for(const f of fields){intersection.observe(f.canvas);resize.observe(f.canvas)}
    theme=new MutationObserver(()=>{for(const f of fields){prepare(f);draw(f,performance.now(),0)}});theme.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});resume();
  }
  reduced.addEventListener('change',()=>{pause();for(const f of fields){f.hover=0;f.target=0;draw(f,performance.now(),0)}resume()});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else resume()});
  window.RefineParticles={mount,dispose};
})();
