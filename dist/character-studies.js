/* Shared lesson clock: bitmap character sheets and orthographic 3D motion studies. */
(()=>{
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const moving=new Set(['wave','weight','ball','jump','stop','walk','feedback','review','spacing','walk-contact','breakdown']);
 const bitmap=kind=>kind==='silhouette'||kind==='turnaround',reduced=matchMedia('(prefers-reduced-motion: reduce)'),duration=3200,frameMs=1000/30;
 let sheet=null,host=null,playing=false,slow=false,elapsed=0,last=null,raf=0,scenes=[],paintedFrame=-1;
 function render(v){const pixels=bitmap(v.scene);return `<figure class="specimen character-study ${v.rig?'character-structure':''}" data-character-scene="${escape(v.scene)}" data-character-variant="${escape(v.variant)}"><div class="character-study-tag">${pixels?'像素角色':'动作'} · 观察练习</div><figcaption>${escape(v.title)}</figcaption><canvas class="character-canvas ${pixels?'':'character-model'}" width="${pixels?200:640}" height="${pixels?170:544}" role="img" aria-label="${escape(v.description)}">${escape(v.description)}</canvas>${v.scene==='silhouette'?'<div class="character-small"><canvas width="64" height="55" aria-hidden="true"></canvas><span>64 px 预览</span></div>':''}<div class="character-study-notes">${(v.notes||[]).map(line=>`<p>${escape(line)}</p>`).join('')}</div></figure>`}
 function controls(visuals){
  if(!visuals?.some(v=>v.kind==='character-study'))return '';
  const motion=visuals.some(v=>moving.has(v.scene)),body=visuals.some(v=>!['ball','spacing'].includes(v.scene)),rig=visuals.some(v=>['wave','weight','jump','stop','walk','walk-contact','breakdown','review'].includes(v.scene));
  return `<div class="character-toolbar" role="group" aria-label="角色案例观察工具">${motion?'<button type="button" data-character-play aria-pressed="false">播放</button><button type="button" data-character-replay>重播</button><button type="button" data-character-slow aria-pressed="false">慢放 0.5×</button><button type="button" data-character-back aria-label="后退一帧">上一帧</button><button type="button" data-character-step aria-label="前进一帧">下一帧</button><button type="button" data-character-trace aria-pressed="false">轨迹</button>':''}${rig?'<button type="button" data-character-rig aria-pressed="false">结构辅助</button>':''}${body?'<button type="button" data-character-silhouette aria-pressed="false">剪影</button>':''}${motion?'<div class="character-frame-control"><input type="range" min="0" max="96" step="1" value="0" aria-label="动画帧" data-character-seek><output data-character-frame>0 / 96 帧</output></div>':''}<span>${motion?'两版同步 · 可拖动或逐帧观察（30 帧/秒刻度）':'切换剪影，观察关键姿态'}</span></div>`;
 }
 function tile(ctx,index,x,y,w,h){if(!sheet?.complete||!sheet.naturalWidth)return;const sw=sheet.naturalWidth/4,sh=sheet.naturalHeight/2;ctx.drawImage(sheet,index%4*sw,Math.floor(index/4)*sh,sw,sh,x,y,w,h)}
 function draw(scene,t){
  const canvas=scene.querySelector('.character-canvas'),ctx=canvas?.getContext('2d');if(!ctx)return;
  const kind=scene.dataset.characterScene,variant=scene.dataset.characterVariant,pixels=bitmap(kind),silhouette=scene.classList.contains('character-silhouette');
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.scale(canvas.width/400,canvas.height/340);ctx.imageSmoothingEnabled=!pixels;
  if(pixels){if(silhouette)ctx.filter='brightness(0) saturate(0)';
   if(kind==='silhouette')tile(ctx,variant==='busy'?1:0,52,25,296,296);
   else{[2,3,variant==='drifting'?5:4].forEach((index,i)=>tile(ctx,index,8+i*128,92,128,128));ctx.filter='none';ctx.textAlign='center';ctx.font='12px system-ui';ctx.fillStyle='#53695b';['正面','侧转','侧面'].forEach((s,i)=>ctx.fillText(s,72+i*128,288))}
  }else window.RefineMotionModels?.draw(ctx,kind,variant,t,{rig:scene.classList.contains('character-structure'),silhouette,trace:scene.classList.contains('character-trace')});
  ctx.restore();
  const small=scene.querySelector('.character-small canvas');if(small){const sc=small.getContext('2d');sc.imageSmoothingEnabled=false;sc.clearRect(0,0,64,55);sc.drawImage(canvas,0,0,64,55)}
 }
 function paint(){scenes.forEach(scene=>draw(scene,Math.min(1,elapsed/duration)));const frame=Math.round(elapsed/frameMs),slider=host?.querySelector('[data-character-seek]'),label=host?.querySelector('[data-character-frame]');if(slider)slider.value=frame;if(label)label.textContent=`${frame} / 96 帧`}
 function tick(now){raf=0;if(!playing)return;if(last!==null)elapsed=(elapsed+(now-last)*(slow?.5:1))%duration;last=now;const frame=Math.floor(elapsed/frameMs);if(frame!==paintedFrame){paint();paintedFrame=frame}raf=requestAnimationFrame(tick)}
 function refresh(){const button=host?.querySelector('[data-character-play]');if(button){button.textContent=playing?'暂停':'播放';button.setAttribute('aria-pressed',String(playing))}}
 function pause(){if(raf)cancelAnimationFrame(raf);raf=0;last=null;playing=false;refresh()}
 function play(){if(!scenes.some(scene=>moving.has(scene.dataset.characterScene)))return;playing=true;last=null;if(elapsed>=duration)elapsed=0;if(!raf)raf=requestAnimationFrame(tick);refresh()}
 function dispose(){pause();scenes=[];host=null;slow=false;elapsed=0;paintedFrame=-1}
 function mount(root){
  dispose();if(!root?.querySelector('.character-study'))return;host=root;scenes=Array.from(root.querySelectorAll('[data-character-scene]'));
  if(scenes.some(scene=>bitmap(scene.dataset.characterScene))&&!sheet){sheet=new Image();sheet.onload=()=>{if(host)paint()};sheet.onerror=()=>{if(host)scenes.filter(scene=>bitmap(scene.dataset.characterScene)).forEach(scene=>scene.querySelector('.character-canvas')?.setAttribute('aria-label','图片加载失败，请重新进入本题'))};sheet.src='assets/characters/pixel-studies.webp'}
  const on=(selector,fn)=>{const button=root.querySelector(selector);if(button)button.onclick=fn};
  on('[data-character-play]',()=>playing?pause():play());on('[data-character-replay]',()=>{elapsed=0;last=null;paint();play()});
  on('[data-character-slow]',()=>{slow=!slow;last=null;root.querySelector('[data-character-slow]').setAttribute('aria-pressed',String(slow))});
  const step=direction=>{pause();elapsed=Math.max(0,Math.min(duration,(Math.round(elapsed/frameMs)+direction)*frameMs));paint()};
  on('[data-character-back]',()=>step(-1));on('[data-character-step]',()=>step(1));
  const seek=root.querySelector('[data-character-seek]');if(seek)seek.oninput=()=>{pause();elapsed=Math.max(0,Math.min(duration,Number(seek.value)*frameMs||0));paint()};
  for(const [selector,className]of [['[data-character-rig]','character-structure'],['[data-character-silhouette]','character-silhouette'],['[data-character-trace]','character-trace']])on(selector,()=>{const button=root.querySelector(selector),enabled=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(enabled));scenes.forEach(scene=>scene.classList.toggle(className,enabled));paint()});
  if(root.querySelector('.character-structure'))root.querySelector('[data-character-rig]')?.setAttribute('aria-pressed','true');paint();if(!reduced.matches)play();else refresh();
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});reduced.addEventListener('change',()=>{if(reduced.matches){pause();elapsed=0;paint()}});
 window.RefineCharacters={render,controls,mount,dispose};
})();
