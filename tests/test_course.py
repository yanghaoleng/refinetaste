import unittest, tempfile, uuid, threading, http.client, json, hashlib, os
from unittest.mock import patch
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import app, reviewer

FEEDBACK={'strengths':['你把用户的第一眼任务作为分层依据。'],'gaps':['还可以说清具体字号和间距怎么调整。'],'suggestion':'先确定主标题，时间地点成组，再邀请用户复述活动信息。','question':'如果路人只有三秒，你希望留下哪条信息？','dimensions':[{'name':n,'evidence':'结合任务说明了判断，但可补充验证。'} for n in ('观察依据','用户视角','取舍意识','验证方法')]}
class CourseTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();app.DB=str(Path(self.temp.name)/'test.sqlite3');app.SECRET='test-secret-with-at-least-thirty-two-chars';app.PIN_HASH=hashlib.sha256(b'123456').hexdigest();app.init_db();app.review_rates.clear()
 def tearDown(self):self.temp.cleanup()
 def test_catalog_and_versioned_completion(self):
  self.assertEqual(len(app.QUESTIONS),24);self.assertEqual(sum(q['kind']=='open' for q in app.QUESTIONS),12)
  visitor,session,run=(str(uuid.uuid4()) for _ in range(3))
  def event(kind,**extra):app.collect(dict(id=str(uuid.uuid4()),visitor=visitor,session=session,run=run,course=2,kind=kind,**extra))
  event('start',start=8)
  with self.assertRaises(ValueError):event('answer',q=16,choice=1)
  with self.assertRaises(ValueError):event('answer',q=12,choice=0)
  for q in range(8,16):
   item=app.QUESTIONS[q];event('answer',q=q,choice=-1 if item['kind']=='open' else item['correct'])
  event('complete')
  result=app.summary(7)
  self.assertEqual(result['metrics']['completed'],1)
  self.assertIsNone(next(q for q in result['questions'] if q['course']==2 and q['index']==12)['correct'])
  self.assertEqual(next(c for c in result['chapters'] if c['course']==2 and c['start']==8)['completed'],1)
 def test_legacy_database_migration_preserves_rows(self):
  with app.connect() as db:
   db.execute('ALTER TABLE events DROP COLUMN course')
   db.execute('INSERT INTO events VALUES(?,?,?,?,?,?,?,?,?,?)',(str(uuid.uuid4()),'2026-10-17',1,'v','s','view',None,None,None,None))
  app.init_db()
  with app.connect() as db:self.assertEqual(db.execute('SELECT course FROM events').fetchone()[0],1)
 def test_model_schema_rejects_missing_or_unbounded_content(self):
  self.assertEqual(reviewer.validate_feedback(FEEDBACK),FEEDBACK)
  with self.assertRaises(reviewer.ReviewUnavailable):reviewer.validate_feedback({'suggestion':'pretend this is feedback'})
  with self.assertRaises(reviewer.ReviewUnavailable):reviewer.validate_feedback(dict(FEEDBACK,strengths=['x'*601]))
 def test_review_origin_validation_quota_failure_and_no_text_storage(self):
  server=app.ThreadingHTTPServer(('127.0.0.1',0),app.Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  text='先明确用户需要知道活动是什么，把主标题放大，时间和地点放在同一信息组，最后找真实用户复述活动信息。'
  def request(q=6,answer=text,origin='https://mikeywa.site',request_id=None):
   c=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=3);c.request('POST',app.BASE+'/api/review',json.dumps({'id':request_id or str(uuid.uuid4()),'q':q,'answer':answer}),{'Origin':origin});r=c.getresponse();data=json.loads(r.read());c.close();return r.status,data
  try:
   self.assertEqual(request(origin='https://evil.example')[0],403)
   self.assertEqual(request(q=0)[0],400);self.assertEqual(request(answer='太短')[0],400)
   with patch.object(reviewer,'configured',return_value=False):self.assertEqual(request()[0],503)
   with patch.object(reviewer,'configured',return_value=True),patch.object(reviewer,'review',return_value=FEEDBACK) as model:
    request_id=str(uuid.uuid4());status,data=request(request_id=request_id);self.assertEqual(status,200);self.assertEqual(data['feedback'],FEEDBACK);model.assert_called_once()
    self.assertEqual(request(request_id=request_id)[0],409)
    with app.connect() as db:
     raw=json.dumps([dict(r) for r in db.execute('SELECT * FROM review_usage')],ensure_ascii=False)
     self.assertNotIn(text,raw)
     self.assertEqual(db.execute('SELECT COUNT(*) FROM review_usage').fetchone()[0],1)
   app.review_rates.clear()
   with patch.object(reviewer,'configured',return_value=True),patch.object(reviewer,'review',side_effect=reviewer.ReviewUnavailable()):
    self.assertEqual(request()[0],502)
    with app.connect() as db:self.assertEqual(db.execute('SELECT COUNT(*) FROM review_usage').fetchone()[0],1)
   app.review_rates.clear()
   with app.connect() as db:
    client=app.digest('127.0.0.1');day=app.datetime.now(app.ZONE).date().isoformat()
    db.executemany('INSERT INTO review_usage VALUES(?,?,?,?)',[(str(uuid.uuid4()),day,client,6) for _ in range(31)])
   with patch.object(reviewer,'configured',return_value=True),patch.object(reviewer,'review') as model:
    self.assertEqual(request()[0],429);model.assert_not_called()
  finally:server.shutdown();server.server_close();thread.join()
if __name__=='__main__':unittest.main()
