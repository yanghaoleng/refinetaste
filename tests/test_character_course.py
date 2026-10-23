import unittest, tempfile, uuid, threading, http.client
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import app

class CharacterCourseTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.previous_db=app.DB;self.previous_secret=app.SECRET
  app.DB=str(Path(self.temp.name)/'characters.sqlite3');app.SECRET='character-course-test-secret';app.init_db()
 def tearDown(self):
  app.DB=self.previous_db;app.SECRET=self.previous_secret;self.temp.cleanup()
 def test_raster_assets_and_observer_are_served_by_the_real_application(self):
  server=app.ThreadingHTTPServer(('127.0.0.1',0),app.Handler)
  thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  try:
   for asset in ['motion-models.js','character-studies.js','character-studies.css']+['assets/characters/pixel-'+name+'.webp' for name in ('motion','studies','ball')]:
    connection=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=3)
    connection.request('GET',app.BASE+'/'+asset);response=connection.getresponse();raw=response.read()
    self.assertEqual(response.status,200,asset)
    if asset.endswith('.webp'):
     self.assertEqual(response.getheader('Content-Type'),'image/webp');self.assertEqual(raw[:4],b'RIFF')
    connection.close()
  finally:server.shutdown();server.server_close();thread.join()
 def test_fourteen_question_chapter_requires_all_answers_and_reports_its_own_title(self):
  visitor,session,run=(str(uuid.uuid4()) for _ in range(3))
  def event(kind,**extra):app.collect(dict(id=str(uuid.uuid4()),visitor=visitor,session=session,run=run,course=2,kind=kind,**extra))
  event('start',start=60,questions=list(range(60,74)))
  with self.assertRaises(ValueError):event('answer',q=40,choice=0)
  for q in app.QUESTIONS[60:73]:event('answer',q=q['id'],choice=q['correct'] if q['kind']=='choice' else 1)
  with self.assertRaises(ValueError):event('complete')
  event('answer',q=73,choice=1);event('complete')
  result=app.summary(7);self.assertEqual(result['metrics']['completed'],1)
  for q in result['questions']:
   if q['course']==2 and q['index']>=60:self.assertEqual(q['eligible'],1)
  dashboard=app.learning_report(7)
  rows=[q for q in dashboard['questions'] if q['id']>=60]
  self.assertEqual(len(rows),14);self.assertTrue(all(q['chapterName']=='人物形象与动作设计' for q in rows))
 def test_original_chapter_question_ids_and_names_survive_display_reordering(self):
  self.assertEqual(app.CHAPTER_STARTS,(0,32,8,16,24,60,40,48))
  for start,name in [(40,'分镜与镜头设计'),(48,'长视频结构与叙事')]:
   q=app.QUESTIONS[start];self.assertEqual(app.CHAPTERS_BY_ID[q['chapter']]['title'],name)
   self.assertEqual(app.CHAPTER_QUESTIONS[start],tuple(range(start,start+8)))
 def test_previous_ten_question_tabs_keep_their_recorded_syllabus(self):
  visitor,session,run=(str(uuid.uuid4()) for _ in range(3))
  def event(kind,**extra):app.collect(dict(id=str(uuid.uuid4()),visitor=visitor,session=session,run=run,course=2,kind=kind,**extra))
  event('start',start=60,questions=list(range(60,70)))
  with self.assertRaises(ValueError):event('answer',q=70,choice=0)
  for q in app.QUESTIONS[60:70]:event('answer',q=q['id'],choice=q['correct'] if q['kind']=='choice' else 1)
  event('complete')
  result=app.summary(7);self.assertEqual(result['metrics']['completed'],1)
  for q in result['questions']:
   if q['course']==2 and q['index']>=70:self.assertEqual(q['eligible'],0)
