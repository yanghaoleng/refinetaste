import unittest, tempfile, uuid, time
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import app

class ProductExpansionTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.previous_db=app.DB;self.previous_secret=app.SECRET
  app.DB=str(Path(self.temp.name)/'expansion.sqlite3');app.SECRET='product-expansion-test-secret';app.init_db()
 def tearDown(self):
  app.DB=self.previous_db;app.SECRET=self.previous_secret;self.temp.cleanup()
 def test_old_runs_keep_eight_questions_and_new_runs_require_all_twelve(self):
  intro=time.time();visitor,session=(str(uuid.uuid4()) for _ in range(2))
  def event(run,kind,at,**extra):
   app.collect(dict(id=str(uuid.uuid4()),visitor=visitor,session=session,run=run,course=2,kind=kind,**extra),now=at)
  old,new=(str(uuid.uuid4()) for _ in range(2))
  event(old,'start',intro-10,start=16)
  with app.connect() as db:db.execute('DELETE FROM run_syllabi WHERE run=?',(old,))
  with self.assertRaises(ValueError):event(old,'answer',intro+1,q=56,choice=0)
  for q in range(16,24):event(old,'answer',intro+1,q=q,choice=1 if app.QUESTIONS[q]['kind']=='open' else app.QUESTIONS[q]['correct'])
  event(old,'complete',intro+2)
  event(new,'start',intro+3,start=16,questions=list(app.CHAPTER_QUESTIONS[16]))
  with self.assertRaises(ValueError):event(new,'answer',intro+4,q=24,choice=0)
  for q in range(16,24):event(new,'answer',intro+4,q=q,choice=1 if app.QUESTIONS[q]['kind']=='open' else app.QUESTIONS[q]['correct'])
  with self.assertRaises(ValueError):event(new,'complete',intro+5)
  for q in range(56,60):event(new,'answer',intro+6,q=q,choice=app.QUESTIONS[q]['correct'])
  event(new,'complete',intro+7)
  result=app.summary(7,now=intro+10)
  self.assertEqual(result['metrics']['completed'],2)
  for q in result['questions']:
   if q['course']==2 and q['index']>=56:
    self.assertEqual(q['eligible'],1);self.assertEqual(q['answers'],1);self.assertEqual(q['correct'],1)
  self.assertEqual(next(q for q in result['questions'] if q['course']==2 and q['index']==16)['eligible'],2)
 def test_sources_variants_and_stable_identity_for_new_questions(self):
  for index in range(56,60):
   q=app.QUESTIONS[index];self.assertEqual(q['id'],index);self.assertEqual(q['chapter'],3)
   self.assertEqual(q['kind'],'choice');self.assertEqual(len(q['visuals']),2)
   self.assertIn('原创',q['sources'][0]['title'])
   for variant in ('base','alternate'):
    for order in ([0,1],[1,0]):
     resolved=app.resolve_question(index,variant,order)
     self.assertEqual(order[resolved['correct']],q['correct'])
     self.assertEqual(resolved['visuals'][resolved['correct']],q['visuals'][q['correct']])

 def test_cached_clients_keep_their_old_syllabus_and_partial_lists_are_rejected(self):
  visitor,session=(str(uuid.uuid4()) for _ in range(2))
  def start(**extra):app.collect(dict(id=str(uuid.uuid4()),visitor=visitor,session=session,run=str(uuid.uuid4()),course=2,kind='start',start=16,**extra))
  start()
  for invalid in ([16,17],list(range(16,24))+[24],list(range(16,24))+[56,57,58,True],list(reversed(app.CHAPTER_QUESTIONS[16]))):
   with self.assertRaises(ValueError):start(questions=invalid)
  with app.connect() as db:
   stored=db.execute('SELECT questions FROM run_syllabi').fetchall()
  self.assertEqual(len(stored),1)
