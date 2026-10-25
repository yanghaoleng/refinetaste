#!/usr/bin/env python3
import argparse,hashlib,json,os,secrets,shlex,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('site',choices=['philosophy','mediaclass','selfcare']);p.add_argument('--port',type=int);p.add_argument('--ai-env',type=Path);a=p.parse_args()
subprocess.run([sys.executable,str(ROOT/'scripts/build-academies.py'),'--site',a.site],check=True)
cfg=json.loads((ROOT/'academy/sites.json').read_text())[a.site];prefix=cfg['env'];port=a.port or cfg['port'];private=ROOT/'.runtime'/('dev-'+a.site+'.json')
if not private.exists():
 pin=f'{secrets.randbelow(1000000):06d}';fd=os.open(private,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
 with os.fdopen(fd,'w') as f:json.dump(dict(secret=secrets.token_urlsafe(48),pin=pin),f)
values=json.loads(private.read_text());env=dict(os.environ,PORT=str(port));env.update({prefix+'_SECRET':values['secret'],prefix+'_PIN_SHA256':hashlib.sha256(values['pin'].encode()).hexdigest(),prefix+'_DB':str(ROOT/'.runtime'/(a.site+'.sqlite3')),prefix+'_ORIGINS':f'http://localhost:{port},http://127.0.0.1:{port}'})
if a.ai_env:
 for line in a.ai_env.read_text().splitlines():
  if '=' not in line or line.lstrip().startswith('#'):continue
  k,v=line.strip().split('=',1)
  if k.endswith(('_AI_KEY','_AI_BASE','_AI_MODEL')):
   part=shlex.split(v)
   if part:env[prefix+'_'+k.split('_',1)[1]]=part[0]
print(f'http://localhost:{port}/{a.site}/ (private development settings remain in .runtime)',flush=True)
subprocess.run([sys.executable,str(ROOT/'.runtime/academies'/a.site/'server/app.py')],env=env,check=True)
