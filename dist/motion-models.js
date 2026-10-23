/* Small orthographic 3D teaching renderer. Geometry, depth and lighting; no sprite motion. */
(()=>{
 const PI=Math.PI,clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),mix=(a,b,t)=>a+(b-a)*t,smooth=t=>t*t*(3-2*t);
 const palette={coat:'#689a8c',skin:'#edc6a3',hair:'#3f343d',pants:'#384f60',shoe:'#384047',gold:'#deb052',paper:'#f4ebd5',ink:'#273b42',floor:'#e3e5d3'};
 const sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{const d=Math.hypot(...a)||1;return a.map(v=>v/d)};
 const rotate=(p,angle=0)=>{const c=Math.cos(angle),s=Math.sin(angle);return [p[0]*c-p[1]*s,p[0]*s+p[1]*c,p[2]]};
 const geometry={};
 function sphere(rows=6,cols=10){
  const key=rows+':'+cols;if(geometry[key])return geometry[key];const vertices=[],faces=[];
  for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++){const a=r/rows*PI,b=c/cols*PI*2;vertices.push([Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b)])}
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const i=r*(cols+1)+c;faces.push([i,i+1,i+cols+1],[i+1,i+cols+2,i+cols+1])}
  return geometry[key]={vertices,faces};
 }
 const cube={vertices:[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],faces:[[0,3,2],[0,2,1],[4,5,6],[4,6,7],[0,4,7],[0,7,3],[1,2,6],[1,6,5],[3,7,6],[3,6,2],[0,1,5],[0,5,4]]};
 function project(p,zoom=48,baseline=288){const yaw=.28,pitch=.12,x=p[0]*Math.cos(yaw)-p[2]*Math.sin(yaw),z=p[0]*Math.sin(yaw)+p[2]*Math.cos(yaw);return [200+x*zoom,baseline-(p[1]*Math.cos(pitch)-z*Math.sin(pitch))*zoom,z*Math.cos(pitch)+p[1]*Math.sin(pitch)]}
 const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
 function renderer(ctx,options={}){
  const triangles=[],bones=[],silhouette=options.silhouette,view=p=>project(p,options.zoom||48,options.baseline||288);
  function mesh(geo,position,scale,color,angle=0,alpha=1){
   const vertices=geo.vertices.map(p=>{const q=rotate(p.map((v,i)=>v*scale[i]),angle);return q.map((v,i)=>v+position[i])}),screen=vertices.map(view),base=rgb(color);
   for(const face of geo.faces){const a=vertices[face[0]],b=vertices[face[1]],c=vertices[face[2]],n=norm(cross(sub(b,a),sub(c,a))),light=.72+.28*Math.max(0,n[0]*-.45+n[1]*.74+n[2]*.5),points=face.map(i=>screen[i]);triangles.push({points,depth:points.reduce((s,p)=>s+p[2],0)/3,color:silhouette?'#293e38':`rgb(${base.map(v=>Math.round(v*light)).join(',')})`,alpha})}
  }
  const orb=(p,s,c,angle=0,alpha=1)=>mesh(sphere(),p,s,c,angle,alpha),box=(p,s,c,angle=0,alpha=1)=>mesh(cube,p,s,c,angle,alpha);
  function link(a,b,width,color){const d=sub(b,a),length=Math.hypot(d[0],d[1]);orb(a.map((v,i)=>(v+b[i])/2),[width,length/2+width,width],color,-Math.atan2(d[0],d[1]));bones.push([a,b])}
  function finish(){triangles.sort((a,b)=>a.depth-b.depth);for(const f of triangles){ctx.globalAlpha=f.alpha;ctx.fillStyle=f.color;ctx.beginPath();f.points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill()}ctx.globalAlpha=1;
   if(options.rig&&!silhouette){ctx.lineWidth=2;ctx.strokeStyle='#f4d267';ctx.fillStyle='#fff4bc';for(const pair of bones){const points=pair.map(view);ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);ctx.lineTo(points[1][0],points[1][1]);ctx.stroke();for(const p of points)ctx.fillRect(p[0]-2,p[1]-2,4,4)}}
  }
  return {orb,box,link,finish};
 }
 function knee(a,b,length=.73,bend=1){const d=sub(b,a),distance=Math.min(length*2-.001,Math.hypot(d[0],d[1])),h=Math.sqrt(Math.max(0,length*length-distance*distance/4)),l=Math.hypot(d[0],d[1])||1;return [(a[0]+b[0])/2-d[1]/l*h*bend,(a[1]+b[1])/2+d[0]/l*h*bend,(a[2]+b[2])/2]}
 function state(kind,variant,t){
  t=clamp(t);const p={x:0,y:0,crouch:0,lean:0,armL:.12,armR:-.12,foreL:0,foreR:0,bag:0,scarf:0,head:0,feet:null,ballY:3.3,sx:1,sy:1,sz:1,phase:0};
  if(kind==='ball'){
   const radius=.5;if(t<.28)p.ballY=3.3-(3.3-radius)*(t/.28)**2;
   else if(t<.34){const squeeze=Math.sin((t-.28)/.06*PI)*(variant==='elastic'?.32:.025);p.sx=p.sz=1+squeeze;p.sy=1/(p.sx*p.sz);p.ballY=radius*p.sy}
   else{p.ballY=radius;const bounces=variant==='elastic'?[[.34,.62,1.8],[.62,.82,.75],[.82,.96,.25]]:[[.34,.53,.3],[.53,.65,.08]];for(const [a,b,h]of bounces)if(t>=a&&t<b){const u=(t-a)/(b-a);p.ballY=radius+4*h*u*(1-u)}}
  }
  if(kind==='spacing'){const u=clamp((t-.12)/.3125);p.x=mix(-2,2,variant==='eased'?smooth(u):u)}
  if(kind==='wave'||kind==='review'){p.armL=-2.3+.28*Math.sin(t*2*PI);p.foreL=-.5+.3*Math.sin(t*2*PI);if(variant==='lively'){p.y=.12*Math.abs(Math.sin(t*4*PI));p.armL=-2.1+.7*Math.sin(t*4*PI);p.bag=.15*Math.sin(t*4*PI)}}
  if(kind==='weight'){
   const lift=smooth(clamp((t-.25)/.4));p.lift=lift;p.crouch=(1-lift)*.9;p.boxY=.54+1.26*lift;
   if(variant==='grounded'){p.lean=-.22*lift;p.feet=[[-.48,.10,.1],[.4,.10,-.1]]}else{p.crouch=0;p.feet=[[-.10,.10,.1],[.1,.10,-.1]]}
  }
  if(kind==='jump'){
   const prepared=variant==='prepared',a=prepared?.24:.08,b=prepared?.7:.54,u=clamp((t-a)/(b-a));p.x=mix(-1.5,1.5,u);p.y=1.05*Math.sin(u*PI);p.phase=u;
   const prep=prepared?.45:.12,land=prepared?.32:.08;
   p.crouch=t<a?prep*Math.sin(PI*t/a):t>b&&t<b+.18?land*Math.sin(PI*(t-b)/.18):0;p.armL=-2*Math.sin(u*PI);p.armR=2*Math.sin(u*PI);
  }
  if(kind==='walk'||kind==='walk-contact'||kind==='stop'){
   const moving=kind!=='stop'||t<.4,walkT=kind==='stop'?Math.min(t/.4,1):t,phase=walkT*2;
   p.x=kind==='stop'?mix(-1.5,1,walkT):mix(-1.5,1.5,t);p.armL=.38*Math.sin(phase*2*PI);p.armR=-p.armL;
   p.feet=[0,1].map(side=>{const phaseSide=(phase+side*.5)%1,stance=phaseSide<.5,x=stance?.375-1.5*phaseSide:-.375+1.5*(phaseSide-.5);return [p.x+(moving?x:side?-.2:.2)+(variant==='sliding'&&stance?.28*Math.sin(t*4*PI):0),.10+(moving&&!stance?.28*Math.sin((phaseSide-.5)*2*PI):0),side?.16:-.16]});
   if(kind==='stop'&&!moving){p.armL=.12;p.armR=-.12;if(variant==='follow'){const u=(t-.4)/.6;p.bag=.8*Math.sin(u*3*PI)*Math.exp(-4*u);p.scarf=1.05*Math.sin(u*4*PI)*Math.exp(-3*u)}}
  }
  if(kind==='feedback'){
   const u=clamp((t-.12)/.70);if(variant==='energetic'){p.y=.5*Math.abs(Math.sin(u*PI*3));p.armL=-1.5-1.1*Math.sin(u*PI*3);p.armR=-p.armL}else{p.head=.12*Math.sin(u*PI);p.armR=-.12-.5*Math.sin(u*PI)}
  }
  if(kind==='breakdown'){const u=smooth(clamp((t-.15)/.6));p.wrist=[mix(.55,1.35,u)+(variant==='clear'?.35:-.55)*Math.sin(u*PI),mix(1.4,1.85,u)+.35*Math.sin(u*PI),.38];p.reach=u}
  return p;
 }
 function person(r,p,options={}){
  const {orb,box,link}=r,s=options.scale||1,ox=options.x||0,oy=options.y||0,facing=options.facing||0;
  const point=(x,y,z=0)=>[ox+(p.x+x)*s,oy+(p.y+y)*s,z*s],c=palette,hipY=1.43-p.crouch,lean=p.lean||0;
  const feet=p.feet||[[-.25,.1,.14],[.25,.1,-.14]].map(f=>[p.x+f[0],...f.slice(1)]);
  feet.forEach((foot,i)=>{const a=point(i?.16:-.16,hipY,i?.14:-.14),b=point(foot[0]-p.x,foot[1],foot[2]),k=knee(a,b,.73*s);link(a,k,.13*s,c.pants);link(k,b,.11*s,c.pants);orb(b,[facing?.25*s:.18*s,.11*s,facing?.16*s:.25*s],c.shoe)});
  const torso=point(lean/2,hipY+.5),shoulderY=hipY+.97;
  orb(torso,[facing?.33*s:.43*s,.61*s,facing?.4*s:.31*s],c.coat,-Math.atan2(lean,1));
  const head=point(lean,shoulderY+.69),headTilt=p.head||0;
  orb(head,[.55*s,.56*s,.47*s],c.skin,headTilt);
  const facePoint=(x,y,z)=>[head[0]+(x*Math.cos(facing)+z*Math.sin(facing))*s,head[1]+y*s,head[2]+(-x*Math.sin(facing)+z*Math.cos(facing))*s];
  // Hair, eyes and mouth remain attached to the same 3D head in every pose.
  orb([head[0],head[1]+.30*s,head[2]-.03*s],[.57*s,.30*s,.48*s],c.hair);
  [-.32,0,.30].forEach((x,i)=>orb(facePoint(x,.28-(i===1?.06:0),.34),[.25*s,.19*s,.20*s],c.hair));
  [-.18,.18].forEach(x=>orb(facePoint(x,-.015,.446),[.045*s,.065*s,.035*s],c.ink));
  orb(facePoint(0,-.15,.46),[.06*s,.025*s,.025*s],c.hair);
  orb(point(lean,shoulderY+.15,.02),[.33*s,.12*s,.34*s],c.gold);
  const scarfAngle=p.scarf||0,scarfStart=point(lean-.20,shoulderY+.10,.34),scarfEnd=[scarfStart[0]-.15*s+Math.sin(scarfAngle)*.50*s,scarfStart[1]-.54*s*Math.cos(scarfAngle),scarfStart[2]+.03*s];link(scarfStart,scarfEnd,.08*s,c.gold);
  const bag=point(-.40+Math.sin(p.bag||0)*.45,hipY+.57,-.30);box(bag,[.26*s,.35*s,.18*s],c.gold,p.bag||0);
  for(const side of [-1,1]){
   let angle=side===-1?p.armL:p.armR,fore=side===-1?p.foreL:p.foreR;
   const shoulder=point(lean+side*(facing?.1:.44),shoulderY,facing?side*.32:.06),a=[Math.sin(angle)*.54,-Math.cos(angle)*.54,0],elbow=shoulder.map((v,i)=>v+a[i]*s);let wrist=elbow.map((v,i)=>v+[Math.sin(angle+fore)*.48,-Math.cos(angle+fore)*.48,.05][i]*s);
   if(p.wrist&&side===1){wrist=point(...p.wrist);const bend=knee(shoulder,wrist,.6*s,1);elbow.splice(0,3,...bend)}
   if(p.lift!==undefined){const target=point(side===-1?.40:1.30,p.boxY-.28,.40);wrist=target;elbow.splice(0,3,...knee(shoulder,wrist,.78*s,side===-1?1:-1))}
   if(options.wrong&&side===-1){const drift=Math.sin(options.t*PI*2)*.28*s;shoulder[0]+=drift;elbow[0]+=drift;wrist[0]+=drift;shoulder[1]+=drift*.6;elbow[1]+=drift*.6;wrist[1]+=drift*.6}
   link(shoulder,elbow,.14*s,c.coat);link(elbow,wrist,.11*s,c.coat);orb(wrist,[.13*s,.13*s,.13*s],c.skin);
  }
  if(options.busy){[-1,1].forEach(side=>{box(point(side*.4,hipY+.32,.4),[.12*s,.16*s,.09*s],c.gold,side*.2);orb(point(side*.26,hipY+.80,.32),[.08*s,.08*s,.04*s],side===1?'#b38cb5':c.paper)})}
  if(p.lift!==undefined){box(point(.90,p.boxY,.37),[.50*s,.45*s,.40*s],'#c79b62');box(point(.90,p.boxY,.78),[.065*s,.45*s,.015*s],'#ead7a5')}
 }
 function draw(ctx,kind,variant,t,options={}){
  const p=state(kind,variant,t),viewOptions={...options,zoom:kind==='ball'?64:kind==='spacing'?62:48,baseline:kind==='spacing'?215:288},r=renderer(ctx,viewOptions),{orb,box}=r,traces=[],view=p=>project(p,viewOptions.zoom,viewOptions.baseline);
  box([0,-.08,0],[3.5,.05,1.25],palette.floor);
  // Ground marks stay fixed in world space, so foot contact can be inspected against them.
  for(let x=-3;x<=3;x+=.5)box([x,-.02,.7],[.014,.01,.17],'#bbc4ae');
  if(kind==='ball'){
   orb([0,.008,0],[.5,.007,.34],'#bec4ad');orb([0,p.ballY,0],[.5*p.sx,.5*p.sy,.5*p.sz],palette.gold);
   // A small contrasting patch makes the volume and orientation legible.
   orb([-.18*p.sx,p.ballY+.23*p.sy,.36*p.sz],[.11*p.sx,.11*p.sy,.025*p.sz],palette.paper);
  }else if(kind==='spacing'){
   box([2,.07,0],[.30,.05,.38],palette.gold);box([p.x,.44,0],[.43,.43,.43],palette.coat);orb([p.x,.44,.44],[.07,.07,.025],palette.paper);
  }else if(kind==='keys'){
   const poses=[{...p,armR:-.3,lean:.06},{...p,wrist:[1.1,1.85,.35],lean:.14},{...p,armR:-.5,foreR:-.8,lean:-.10}];
   poses.forEach((pose,i)=>{person(r,pose,{x:(i-1)*2.45,scale:.55});box([(i-1)*2.45+.78,.91,.18],[.15,.23,.08],palette.gold)});
  }else{
   person(r,p,{wrong:kind==='wave'&&variant==='center',t,facing:['walk','walk-contact','jump','stop','weight'].includes(kind)?1:0,busy:kind==='review'&&variant==='lively'});
   if(kind==='breakdown'){box([1.7,1.35,.0],[.35,.08,.45],palette.paper);orb([1.6,1.65,.1],[.18,.23,.18],palette.gold)}
  }
  if(options.trace&&kind!=='keys'){
   for(let i=0;i<=30;i++){const q=state(kind,variant,kind==='spacing'?.12+i/30*.3125:i/30),point=kind==='ball'?[0,q.ballY,0]:kind==='spacing'?[q.x,.44,0]:kind==='breakdown'?[q.x+q.wrist[0],q.wrist[1],q.wrist[2]]:[q.x,q.y+1.43-q.crouch,0];traces.push(view(point))}
  }
  r.finish();
  if(traces.length){ctx.globalAlpha=.65;ctx.fillStyle='#a7714e';traces.forEach(p=>ctx.fillRect(p[0]-1.5,p[1]-1.5,3,3));ctx.globalAlpha=1}
  if(kind==='keys'){ctx.textAlign='center';ctx.font='12px system-ui';ctx.fillStyle='#586b5e';['姿态 1','姿态 2','姿态 3'].forEach((label,i)=>ctx.fillText(label,84+i*115,318))}
  if(options.rig){ctx.textAlign='left';ctx.font='10px system-ui';ctx.fillStyle='#586b5e';ctx.fillText('结构辅助为定性示意',12,333)}
 }
 window.RefineMotionModels={draw,state,project,geometry:{sphere,cube},duration:3200};
})();
