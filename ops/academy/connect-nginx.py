"""Add exactly one namespaced proxy route, retain and restore the previous config on failure."""
from datetime import datetime
from pathlib import Path
import json,shutil,subprocess
cfg=json.loads((Path(__file__).resolve().parent.parent/'site.json').read_text());base=cfg['base'];port=cfg['port']
file=Path('/etc/nginx/sites-enabled/mikeywa.site');text=file.read_text();mark='location ^~ '+base+'/'
if mark in text:print('Route already connected');raise SystemExit(0)
# Match the known design-class sibling route in the same server, without editing other hosts.
anchor='    include /etc/nginx/snippets/refinetaste.conf;'
pos=text.find(anchor)
if pos<0 or text.count(anchor)!=1:raise SystemExit('Unexpected nginx config; left unchanged')
backup=Path('/etc/nginx')/('mikeywa.site.before-'+cfg['slug']+'-'+datetime.now().strftime('%Y%m%d-%H%M%S')+'.bak');shutil.copy2(file,backup)
route=f'''location = {base} {{ return 308 {base}/; }}
location ^~ {base}/ {{
 proxy_pass http://127.0.0.1:{port};
 proxy_set_header Host $host;
 proxy_set_header X-Real-IP $remote_addr;
 proxy_set_header X-Forwarded-Proto $scheme;
 proxy_connect_timeout 3s;
 proxy_read_timeout 55s;
 client_max_body_size 128k;
 access_log off;
}}
'''
try:
 file.write_text(text[:pos]+route+'\n'+text[pos:]);subprocess.run(['nginx','-t'],check=True);subprocess.run(['systemctl','reload','nginx'],check=True)
except Exception:
 shutil.copy2(backup,file);subprocess.run(['nginx','-t'],check=True);subprocess.run(['systemctl','reload','nginx'],check=True);raise
print('Route connected with recoverable config backup')
