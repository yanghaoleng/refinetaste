"""Wait for Nginx's new workers; a generic HTML 200 is never a health check."""
import json,subprocess,time
from pathlib import Path
cfg=json.loads((Path(__file__).resolve().parent.parent/'site.json').read_text());base='https://mikeywa.site'+cfg['base']+'/'
def read(path,base=base):
 raw=subprocess.check_output(['curl','-fsS','--max-time','8','--resolve','mikeywa.site:443:127.0.0.1',base+path],stderr=subprocess.DEVNULL)
 return json.loads(raw)
for attempt in range(8):
 try:
  assert read('api/health').get('ok') is True
  course=read('course.json');expected=json.loads((Path(__file__).resolve().parent.parent/'dist/course.json').read_text());assert course==expected
  for alias in [cfg['base'],cfg.get('canonicalBase',cfg['base'])]:
   alias='https://mikeywa.site'+alias+'/'
   assert read('api/health',alias).get('ok') is True
   assert read('course.json',alias)==expected
  print('Public JSON health and complete syllabus verified:',cfg['slug']);break
 except (ValueError,AssertionError,subprocess.CalledProcessError):
  if attempt==7:raise SystemExit('Public route did not return the expected site')
  time.sleep(1)
