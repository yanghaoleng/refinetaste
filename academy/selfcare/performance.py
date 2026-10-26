"""Build-only RURU loading changes, isolated from other subjects and shared drafts."""
import base64,gzip,hashlib,json,re
from pathlib import Path
HERE=Path(__file__).resolve().parent
def digest(raw):return hashlib.sha256(raw).hexdigest()[:12]
def install(dst):
 d=dst/'dist';app=d/'app.js';s=app.read_text();home=d/'index.html';html=home.read_text();server=dst/'server/app.py';py=server.read_text()
 # Keep the old complete endpoint and stable ID array for already open clients.
 old_sprites=re.findall(r'xiaoman-[a-z-]+-[a-f0-9]{12}\.webp',py)
 full=json.loads((d/'course.json').read_text());chapter_dir=d/'chapters';chapter_dir.mkdir(exist_ok=True);files={}
 for id in sorted({q['chapter'] for q in full['questions']}):
  raw=json.dumps(dict(chapterId=id,questions=[q for q in full['questions'] if q['chapter']==id]),ensure_ascii=False,separators=(',',':')).encode();name=f'chapter-{id}-{digest(raw)}.json';(chapter_dir/name).write_bytes(raw);files[id]='chapters/'+name
 meta=dict(full);meta['questions']=[{k:q[k] for k in ('id','chapter','kind','title','principle','feedbackMode','archived') if k in q} for q in full['questions']];meta['chapterFiles']=files
 # Version compressed portraits. The original assets stay available for old tabs.
 for stem in ('emotions','positive-emotions','cool-expressions','gaze'):
  raw=(HERE/'assets'/f'{stem}.webp').read_bytes();new=f'xiaoman-{stem}-{digest(raw)}.webp';(d/'assets'/new).write_bytes(raw)
  pattern=rf'xiaoman-{stem}-[a-f0-9]{{12}}\.webp'
  s=re.sub(pattern,new,s)
  for css in d.glob('*.css'):css.write_text(re.sub(pattern,new,css.read_text()))
  py=re.sub(pattern,new,py)
 raw=(HERE/'assets/mascot-640.webp').read_bytes();mascot=f'mascot-{digest(raw)}.webp';(d/'assets'/mascot).write_bytes(raw);html=re.sub(r'assets/mascot\.png(?:\?v=[a-f0-9]+)?','assets/'+mascot,html)
 # A static small portrait remains visible until any expression sprite is ready.
 css=d/'academy.css';text=css.read_text();portrait=re.search(r'src="(assets/chick-starry-96\.webp[^\"]*)"',html).group(1)
 for cls,stem,size in [('coach-emotion','emotions','600% 300%'),('positive-emotion','positive-emotions','600% 200%'),('cool-emotion','cool-expressions','300% 200%'),('gaze-emotion','gaze','200% 200%')]:
  sprite=next((d/'assets').glob(f'xiaoman-{stem}-{digest((HERE/"assets"/(stem+".webp")).read_bytes())}.webp')).name
  text+=f"\n.{cls}{{background-image:url('assets/{sprite}'),url('{portrait}');background-size:{size},100% 100%;background-position:var(--face-x) var(--face-y),center}}"
 css.write_text(text)
 # Keep the shared send button's exact theme/disabled styles for the same RURU composer.
 shared_css=d/'course.css';shared_css.write_text(shared_css.read_text().replace('#chat-send',':is(#chat-send,.ruru-chat-form button[type=submit])'))
 # Full questions and decorative libraries no longer start downloading in the shell.
 s=re.sub(r"const coachAssetImages=.*?\nconst coachAssetsReady=.*?;\n",'const coachAssetImages=[];\nconst coachAssetsReady=Promise.resolve();\n',s,count=1)
 s=s.replace('navigationGeneration++;loadCourse().then(warmCourse).catch(()=>{});','navigationGeneration++;')
 s=s.replace('loadCourse().then(warmCourse).catch(()=>{});','')
 s=s.replace('await loadCourse();await preloadChapter(index,true);','await loadCourse(window.RefinePractice.menu.chapters[index].id);await window.RuruLoad.tools();await preloadChapter(index,true);')
 # Avoid an unhandled rejection when the selected legacy chapter fails.
 # New RURU conversations need only the embedded light manifest, never full old exercises.
 s=s.replace('const icon=name=>`<svg class="icon" aria-hidden="true" focusable="false"><use href="icons.svg#${name}"></use></svg>`;', 'const icon=name=>`<svg class="icon" aria-hidden="true" focusable="false"><use href="#ruru-i-${name}"></use></svg>`;')
 optional=['text-motion.js','motion-models.js','character-studies.js','marketing-cases.js'];extra='\n;\n'.join((d/n).read_text() for n in optional);extra_name='lesson-tools-'+digest(extra.encode())+'.js';(d/extra_name).write_text(extra);meta['extras']=extra_name
 s+='\nwindow.RuruManifest='+json.dumps(meta,ensure_ascii=False,separators=(',',':'))+';\n'+(HERE/'loading.js').read_text()
 # Keep the initially painted icon until the random portrait has decoded.
 icon=(d/'site-icon.js').read_text();icon=icon.replace("if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();", "const ready=()=>{const image=new Image();image.src=asset('96.webp');image.decode().then(apply,()=>{})};if(document.readyState==='complete')setTimeout(ready,0);else addEventListener('load',ready,{once:true});")
 (d/'site-icon.js').write_text(icon)
 guide=d/'coach-guide.js';guide_text=guide.read_text();anchor='window.RefineGuide={hold:lift,raise,home,latest,map,brand:brandHome};';assert anchor in guide_text;guide.write_text(guide_text.replace(anchor,'window.RefineGuide={hold:lift,raise,home,latest,map,brand:brandHome,follow:move};'))
 # One deferred core script, one stylesheet. Decorative case tools load on demand/idle.
 script_names=re.findall(r'<script src="([^"?]+)(?:\?[^\"]*)?"[^>]*></script>',html)
 bundle=[]
 for name in script_names:
  if name=='theme.js' or name in optional:continue
  bundle.append(s if name=='app.js' else (d/name).read_text())
 app.write_text('\n;\n'.join(bundle))
 styles=re.findall(r'<link rel="stylesheet" href="([^"?]+)(?:\?[^\"]*)?">',html)
 shell='\n'.join((d/name).read_text() for name in styles);shell_name='ruru-shell-'+digest(shell.encode())+'.css';(d/shell_name).write_text(shell)
 html=re.sub(r'<script src="(?!theme\.js)[^\"]+"[^>]*></script>','',html)
 html=re.sub(r'<link rel="stylesheet" href="[^\"]+">','',html)
 html=re.sub(r'<link rel="preload"[^>]*>','',html)
 html=html.replace('</head>',f'<link rel="stylesheet" href="{shell_name}"><link rel="preload" as="image" href="{portrait}" fetchpriority="high"></head>')
 html=html.replace('</body>',f'<script src="app.js?v={digest(app.read_bytes())}" defer></script></body>')
 # Small interface glyphs have no external SVG request on the paint path.
 symbols=(d/'icons.svg').read_text();inner=re.sub(r'id="([^"]+)"',r'id="ruru-i-\1"',symbols[symbols.index('>')+1:symbols.rindex('</svg>')]);html=html.replace('<body class="hero-only">','<body class="hero-only"><svg aria-hidden="true" width="0" height="0">'+inner+'</svg>');html=html.replace('icons.svg#','#ruru-i-')
 # Hidden course badges must not compete with the visible portrait/hero.
 html=html.replace('class="course-favicon"','loading="lazy" decoding="async" class="course-favicon"')
 icons={'https://mikeywa.site/refinetaste/assets/favicon-starry-32.png':HERE.parents[1]/'dist/assets/favicon-starry-32.png','https://m.mikeywa.site/pianoclass/assets/favicon-teacher-32.png':HERE/'assets/music-favicon-32.png'}
 for slug in ('philosophy','mediaclass'):icons['https://mikeywa.site/'+slug+'/assets/favicon-starry-32.png']=HERE.parent/'identity/compiled'/slug/'favicon-starry-32.png'
 for url,path in icons.items():html=html.replace('src="'+url+'"','src="data:image/png;base64,'+base64.b64encode(path.read_bytes()).decode()+'"')
 html=html.replace('class="hero-piece academy-mascot"','decoding="async" fetchpriority="high" class="hero-piece academy-mascot"')
 home.write_text(html)
 # Only known generated files are routable; no path traversal/dynamic file access.
 extra_routes=[extra_name,shell_name,'assets/'+mascot,*files.values(),*['assets/'+n for n in old_sprites]]
 route="        for asset in "+repr(tuple(extra_routes))+":files[BASE+'/'+asset]=asset\n"
 py=py.replace("        if path not in files:return self.reply(404,{'error':'not found'})",route+"        if path not in files:return self.reply(404,{'error':'not found'})")
 py=py.replace('        self.send_response(200)\n        mime=mimetypes.guess_type(file)[0]', '''        versioned=bool(re.search(r'[a-f0-9]{12}',file.name) or re.search(r'(?:^|&)v=[a-f0-9]{12}(?:&|$)',parsed.query))
        cache='public, max-age=31536000, immutable' if versioned else 'no-cache'
        etag='"'+hashlib.sha256(raw).hexdigest()+'"'
        if self.headers.get('If-None-Match')==etag:
            self.send_response(304);self.send_header('ETag',etag);self.send_header('Cache-Control',cache);self.send_header('Vary','Accept-Encoding');self.end_headers();return
        compressed=file.with_name(file.name+'.gz')
        encoded=compressed.exists() and any(part.strip().split(';')[0]=='gzip' and not re.search(r';\\s*q=0(?:\\.0*)?(?:\\s*;|\\s*$)',part) for part in self.headers.get('Accept-Encoding','').split(','))
        if encoded:raw=compressed.read_bytes()
        self.send_response(200)
        if encoded:self.send_header('Content-Encoding','gzip')
        self.send_header('Vary','Accept-Encoding');self.send_header('ETag',etag)
        mime=mimetypes.guess_type(file)[0]''')
 py=py.replace("        self.send_header('Cache-Control','no-cache')", "        self.send_header('Cache-Control',cache)")
 server.write_text(py)
 privacy=d/'privacy.html';privacy.write_text(privacy.read_text().replace('设计判断','学习判断').replace('设计练习','学习练习'))
 for p in d.rglob('*'):
  if p.suffix in ('.js','.css','.json','.svg','.html'):p.with_name(p.name+'.gz').write_bytes(gzip.compress(p.read_bytes(),compresslevel=7,mtime=0))
 (d/'performance-manifest.json').write_text(json.dumps(dict(chapterFiles=files,coreBytes=app.stat().st_size,coreGzip=app.with_name('app.js.gz').stat().st_size,heroBytes=(d/'assets'/mascot).stat().st_size,extras=extra_name),indent=2))
