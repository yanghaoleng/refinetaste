"""Install the shared footer course panel; its destinations remain native links."""
from pathlib import Path
import re,json
ROOT=Path(__file__).resolve().parents[1]
CONFIG=json.loads((ROOT/'academy/sites.json').read_text())
SITES=[('design','JOJO 设计班','https://mikeywa.site/refinetaste/'),('philosophy',CONFIG['philosophy']['name'],'https://mikeywa.site/philosophy/'),('mediaclass',CONFIG['mediaclass']['name'],'https://mikeywa.site/mediaclass/'),('music','李老师的音乐班','https://m.mikeywa.site/pianoclass/')]
def links(current):
 return '<span id="other-fields" class="courses-entry"><button id="more-courses" class="courses-trigger" type="button" aria-expanded="false" aria-controls="more-courses-panel">更多课程</button><section id="more-courses-panel" class="courses-panel" aria-label="更多课程" hidden><nav aria-label="其他领域的学习">'+''.join(f'<a href="{url}">{name}<span aria-hidden="true">↗</span></a>' for key,name,url in SITES if key!=current)+'</nav></section></span>'
def install(folder,current):
 p=folder/'index.html';s=p.read_text();s=re.sub(r'<section id="other-fields".*?</section>','',s,flags=re.S)
 s=re.sub(r'<span id="other-fields".*?</section></span>','',s,flags=re.S)
 s=s.replace('<a href="privacy.html" id="privacy-open">',links(current)+'<a href="privacy.html" id="privacy-open">',1)
 if 'href="other-fields.css"' not in s:s=s.replace('</head>','<link rel="stylesheet" href="other-fields.css"></head>')
 if 'src="other-fields.js"' not in s:s=s.replace('</body>','<script src="other-fields.js"></script></body>')
 p.write_text(s)
 for name in ('other-fields.css','other-fields.js'):(folder/name).write_bytes((ROOT/'dist'/name).read_bytes())
if __name__=='__main__':
 install(ROOT/'dist','design')
 music=ROOT.parent/'音乐班/lilaoshi'
 install(music/'web','music')
 for folder in (ROOT,music):
  p=folder/'server/app.py';s=p.read_text()
  marker="        files[BASE+'/icons.svg']='icons.svg'"
  for name in ('other-fields.css','other-fields.js'):
   line=f"        files[BASE+'/{name}']='{name}'"
   if line not in s:s=s.replace(marker,marker+'\n'+line)
  p.write_text(s)
