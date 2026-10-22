/* Pick one expression per page opening, shared by the brand and browser icons. */
(()=>{
 const moods=['neutral','happy','thinking','curious','surprised','encouraging','empathetic','confused','playful','delighted','approving','inspired','relieved','grateful','amused'];
 const base=new URL('assets/icons/',document.currentScript.src);let previous='';try{previous=sessionStorage.getItem('refinetaste-site-expression')||''}catch{}
 const pool=moods.filter(mood=>mood!==previous),mood=pool[Math.floor(Math.random()*pool.length)];try{sessionStorage.setItem('refinetaste-site-expression',mood)}catch{}
 const asset=size=>new URL(mood+'-'+size,base).href;
 function apply(){document.querySelectorAll('.brand-icon').forEach(image=>image.src=asset('96.webp'));document.querySelectorAll('link[rel="icon"]').forEach(link=>{link.type='image/png';link.sizes='32x32';link.href=asset('32.png')});document.querySelectorAll('link[rel="apple-touch-icon"]').forEach(link=>link.href=asset('180.png'))}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();
