import unittest, tempfile, uuid, threading, http.client
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import app

class MarketingCourseTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.old_db,self.old_secret=app.DB,app.SECRET
  app.DB=str(Path(self.temp.name)/'marketing.sqlite3');app.SECRET='marketing-test-secret';app.init_db()
 def tearDown(self):app.DB,app.SECRET=self.old_db,self.old_secret;self.temp.cleanup()
 def test_each_new_chapter_requires_its_complete_syllabus_and_preserves_original_eligibility(self):
  self.assertEqual(app.CHAPTER_STARTS[8:],(74,82,90,98,106,114,122))
  for start in app.CHAPTER_STARTS[8:]:
   visitor,session,run=(str(uuid.uuid4()) for _ in range(3))
   def event(kind,**extra):return app.collect(dict(id=str(uuid.uuid4()),visitor=visitor,session=session,run=run,course=2,kind=kind,**extra))
   event('start',start=start,questions=list(range(start,start+8)))
   with self.assertRaises(ValueError):event('answer',q=60,choice=0)
   for q in app.QUESTIONS[start:start+7]:event('answer',q=q['id'],choice=q['correct'] if q['kind']=='choice' else 1)
   with self.assertRaises(ValueError):event('complete')
   event('answer',q=start+7,choice=1);event('complete')
  summary=app.summary(7);self.assertEqual(summary['metrics']['completed'],7)
  for q in summary['questions']:
   if q['course']==2:self.assertEqual(q['eligible'],int(q['index']>=74))
  rows=app.learning_report(7)['questions']
  self.assertEqual(len([q for q in rows if q['id']>=74]),56)
  self.assertEqual(next(q for q in rows if q['id']==82)['chapterName'],'私域服务、留存与产品迭代')
 def test_case_assets_are_served_by_the_production_handler(self):
  server=app.ThreadingHTTPServer(('127.0.0.1',0),app.Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  try:
   for asset in ('marketing-cases.js','marketing-cases.css'):
    connection=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=3);connection.request('GET',app.BASE+'/'+asset);response=connection.getresponse();body=response.read();connection.close()
    self.assertEqual(response.status,200);self.assertEqual(body,(app.ROOT/'dist'/asset).read_bytes())
  finally:server.shutdown();server.server_close();thread.join()
