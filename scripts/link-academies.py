"""Build native anchor links; no tracking, overlay or script required."""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
SITES=[('design','JOJO 设计班','https://mikeywa.site/refinetaste/'),('philosophy','JOJO 哲学班','https://mikeywa.site/philosophy/'),('mediaclass','JOJO 自媒体班','https://mikeywa.site/mediaclass/'),('music','李老师的音乐班','https://m.mikeywa.site/pianoclass/')]
def links(current):
 return '<section id="other-fields" class="other-fields" aria-labelledby="other-fields-title"><h2 id="other-fields-title">也学一点别的</h2><nav aria-label="其他领域的学习">'+''.join(f'<a href="{url}">{name}<span aria-hidden="true">↗</span></a>' for key,name,url in SITES if key!=current)+'</nav></section>'
def install(folder,current):
 p=folder/'index.html';s=p.read_text();s=re.sub(r'<section id="other-fields".*?</section>','',s,flags=re.S)
 s=s.replace('</main>',links(current)+'</main>',1)
 if 'href="other-fields.css"' not in s:s=s.replace('</head>','<link rel="stylesheet" href="other-fields.css"></head>')
 p.write_text(s);(folder/'other-fields.css').write_text((ROOT/'dist/other-fields.css').read_text())
if __name__=='__main__':
 install(ROOT/'dist','design')
 music=ROOT.parent/'音乐班/lilaoshi'
 install(music/'web','music')
 for folder in (ROOT,music):
  p=folder/'server/app.py';s=p.read_text()
  marker="        files[BASE+'/icons.svg']='icons.svg'"
  if "files[BASE+'/other-fields.css']" not in s:s=s.replace(marker,marker+"\n        files[BASE+'/other-fields.css']='other-fields.css'")
  p.write_text(s)
