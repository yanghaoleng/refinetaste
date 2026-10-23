"""Create independent credentials and storage; reuse only the authorized AI provider."""
import hashlib,json,os,secrets,shlex
from pathlib import Path
root=Path(__file__).resolve().parent.parent;cfg=json.loads((root/'site.json').read_text());slug=cfg['slug'];prefix=cfg['env'];target=Path('/etc/'+slug+'.env')
if target.exists():print('Existing private environment preserved');raise SystemExit(0)
provider={}
for line in Path('/etc/refinetaste.env').read_text().splitlines():
 if '=' not in line or line.lstrip().startswith('#'):continue
 k,v=line.strip().split('=',1)
 if k in ('REFINETASTE_AI_KEY','REFINETASTE_AI_BASE','REFINETASTE_AI_MODEL'):
  parsed=shlex.split(v)
  if parsed:provider[k.removeprefix('REFINETASTE_')]=parsed[0]
if not provider.get('AI_KEY') or not provider.get('AI_MODEL'):raise SystemExit('AI provider incomplete; no new environment created')
pin=f'{secrets.randbelow(1000000):06d}'
settings={prefix+'_SECRET':secrets.token_urlsafe(48),prefix+'_PIN_SHA256':hashlib.sha256(pin.encode()).hexdigest(),prefix+'_DB':'/var/lib/'+slug+'/analytics.sqlite3',prefix+'_ORIGINS':'https://mikeywa.site,https://www.mikeywa.site',prefix+'_AI_LABEL':cfg['coach'],'PORT':str(cfg['port']),**{prefix+'_'+k:v for k,v in provider.items()}}
def private_write(path,text):
 fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
 with os.fdopen(fd,'w') as f:f.write(text)
private_write('/etc/'+slug+'-access.json',json.dumps(dict(url='https://mikeywa.site'+cfg['base']+'/',dashboard='https://mikeywa.site'+cfg['base']+'/data/',pin=pin),ensure_ascii=False)+'\n')
private_write(target,'\n'.join(k+'='+json.dumps(v,ensure_ascii=False) for k,v in settings.items())+'\n')
print('Independent environment created; private values remain on the server')
