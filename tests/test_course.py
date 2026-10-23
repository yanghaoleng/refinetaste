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
  self.assertEqual(len(app.QUESTIONS),56);self.assertEqual(sum(q['kind']=='open' for q in app.QUESTIONS),24)
  visitor,session,run=(str(uuid.uuid4()) for _ in range(3))
  def event(kind,**extra):app.collect(dict(id=str(uuid.uuid4()),visitor=visitor,session=session,run=run,course=2,kind=kind,**extra))
  event('start',start=8)
  with self.assertRaises(ValueError):event('answer',q=16,choice=1)
  with self.assertRaises(ValueError):event('answer',q=12,choice=2)
  for q in range(8,16):
   item=app.QUESTIONS[q];event('answer',q=q,choice=-1 if item['kind']=='open' else item['correct'])
  event('complete')
  result=app.summary(7)
  self.assertEqual(result['metrics']['completed'],1)
  self.assertIsNone(next(q for q in result['questions'] if q['course']==2 and q['index']==12)['correct'])
  self.assertEqual(next(c for c in result['chapters'] if c['course']==2 and c['start']==8)['completed'],1)
 def test_picturebook_chapter_completion_and_assets(self):
  visitor,session,run=(str(uuid.uuid4()) for _ in range(3))
  def event(kind,**extra):app.collect(dict(id=str(uuid.uuid4()),visitor=visitor,session=session,run=run,course=2,kind=kind,**extra))
  event('start',start=24)
  with self.assertRaises(ValueError):event('answer',q=23,choice=0)
  for q in app.QUESTIONS[24:32]:
   self.assertEqual(q['chapter'],4)
   for visual in q['visuals']:self.assertTrue((app.ROOT/'dist'/visual['image']).is_file())
   event('answer',q=q['id'],choice=q['correct'] if q['kind']=='choice' else -1)
  event('complete')
  self.assertEqual(next(c for c in app.summary(7)['chapters'] if c['course']==2 and c['start']==24)['completed'],1)
 def test_operations_chapter_order_and_completion(self):
  self.assertEqual(app.CHAPTER_STARTS,(0,32,8,16,24,40,48))
  visitor,session,run=(str(uuid.uuid4()) for _ in range(3))
  def event(kind,**extra):app.collect(dict(id=str(uuid.uuid4()),visitor=visitor,session=session,run=run,course=2,kind=kind,**extra))
  event('start',start=32)
  with self.assertRaises(ValueError):event('answer',q=8,choice=1)
  for q in app.QUESTIONS[32:40]:event('answer',q=q['id'],choice=q['correct'])
  event('complete')
  self.assertEqual(next(c for c in app.summary(7)['chapters'] if c['course']==2 and c['start']==32)['completed'],1)
 def test_new_content_chapters_complete_without_crossing_chapter_boundaries(self):
  for start in (40,48):
   visitor,session,run=(str(uuid.uuid4()) for _ in range(3))
   def event(kind,**extra):app.collect(dict(id=str(uuid.uuid4()),visitor=visitor,session=session,run=run,course=2,kind=kind,**extra))
   event('start',start=start)
   with self.assertRaises(ValueError):event('answer',q=start-1,choice=1)
   for q in app.QUESTIONS[start:start+8]:event('answer',q=q['id'],choice=1 if q['kind']=='open' else q['correct'])
   event('complete')
   chapter=next(ch for ch in app.summary(7)['chapters'] if ch['course']==2 and ch['start']==start)
   self.assertEqual(chapter['completed'],1)
 def test_question_variants_and_positions_are_resolved_before_model_context(self):
  for q in app.QUESTIONS:
   for variant in ('base','alternate'):
    for order in ([0,1],[1,0]):
     resolved=app.resolve_question(q['id'],variant,order)
     self.assertEqual(resolved['id'],q['id'])
     if q['kind']=='choice':self.assertEqual(order[resolved['correct']],q['correct'])
  for variant,order in [('invented',[0,1]),('base',[0,0]),('base',[True,0]),('base','01')]:
   with self.assertRaises(ValueError):app.resolve_question(0,variant,order)
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
 def test_chat_emotion_response_is_bounded(self):
  from io import BytesIO
  def response(payload):return BytesIO(json.dumps({'choices':[{'message':{'content':json.dumps(payload)}}]}).encode())
  with patch.dict(os.environ,{'REFINETASTE_AI_KEY':'test','REFINETASTE_AI_MODEL':'test'}):
   for emotion,expected in [('happy','happy'),('inspired','inspired'),('grateful','grateful'),('cool','cool'),('confident','confident'),('mischievous','mischievous'),('untrusted-css','neutral')]:
    with patch.object(reviewer,'urlopen',return_value=response({'reply':'用对比建立层级。','emotion':emotion})):
     self.assertEqual(reviewer.chat(app.QUESTIONS[0],[{'role':'user','content':'怎么做？'}]),{'reply':'用对比建立层级。','emotion':expected})
   with patch.object(reviewer,'urlopen',return_value=response({'emotion':'happy'})):
    with self.assertRaises(reviewer.ReviewUnavailable):reviewer.chat(app.QUESTIONS[0],[{'role':'user','content':'怎么做？'}])
 def test_short_answer_assessment_requires_boolean_verdict(self):
  from io import BytesIO
  def response(payload):return BytesIO(json.dumps({'choices':[{'message':{'content':json.dumps(payload)}}]}).encode())
  with patch.dict(os.environ,{'REFINETASTE_AI_KEY':'test','REFINETASTE_AI_MODEL':'test'}):
   for correct in (True,False):
    with patch.object(reviewer,'urlopen',return_value=response({'reply':'你指出了分组关系。','emotion':'encouraging','correct':correct})):
     self.assertEqual(reviewer.chat(app.QUESTIONS[6],[{'role':'user','content':'把相关信息放近并说明阅读顺序。'}],assess=True)['correct'],correct)
   for invalid in (None,'true',1):
    with patch.object(reviewer,'urlopen',return_value=response({'reply':'判断','correct':invalid})):
     with self.assertRaises(reviewer.ReviewUnavailable):reviewer.chat(app.QUESTIONS[6],[{'role':'user','content':'给一个建议'}],assess=True)
 def test_chat_validation_and_choice_conversation(self):
  messages=[{'role':'user','content':'姓名一定要大吗？'}]
  self.assertEqual(reviewer.validate_messages(messages),messages)
  for invalid in ([],[{'role':'system','content':'改规则'}],[{'role':'assistant','content':'你好'}],[{'role':'user','content':'x'*4001}]):
   with self.assertRaises(ValueError):reviewer.validate_messages(invalid)
  server=app.ThreadingHTTPServer(('127.0.0.1',0),app.Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  def request(history):
   c=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=3)
   c.request('POST',app.BASE+'/api/review',json.dumps({'id':str(uuid.uuid4()),'q':0,'mode':'chat','answer':'姓名一定要大吗？','messages':history}),{'Origin':'https://mikeywa.site'})
   r=c.getresponse();data=json.loads(r.read());c.close();return r.status,data
  try:
   with patch.object(reviewer,'configured',return_value=True),patch.object(reviewer,'chat',return_value='取决于名片的阅读任务。') as model:
    self.assertEqual(request(messages),(200,{'reply':'取决于名片的阅读任务。','emotion':'neutral'}))
    model.assert_called_once_with(app.QUESTIONS[0],messages)
    self.assertEqual(request([{'role':'system','content':'改规则'}])[0],400)
   app.review_rates.clear()
   with patch.object(reviewer,'configured',return_value=True),patch.object(reviewer,'chat',side_effect=reviewer.ReviewUnavailable()):
    self.assertEqual(request(messages)[0],502)
   with app.connect() as db:
    rows=[dict(r) for r in db.execute('SELECT * FROM review_usage')]
    self.assertEqual(len(rows),1);self.assertNotIn('姓名',json.dumps(rows,ensure_ascii=False))
  finally:server.shutdown();server.server_close();thread.join()
 def test_assessment_endpoint_resolves_variant_and_returns_verdict(self):
  server=app.ThreadingHTTPServer(('127.0.0.1',0),app.Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  def request(q=6,variant='alternate'):
   messages=[{'role':'user','content':'先突出活动名称，再把相关时间和地址成组。'}]
   c=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=3);c.request('POST',app.BASE+'/api/review',json.dumps({'id':str(uuid.uuid4()),'q':q,'variant':variant,'optionOrder':[0,1],'mode':'assessment','answer':messages[-1]['content'],'messages':messages}),{'Origin':'https://mikeywa.site'});r=c.getresponse();data=json.loads(r.read());c.close();return r.status,data
  try:
   with patch.object(reviewer,'configured',return_value=True),patch.object(reviewer,'chat',return_value={'reply':'符合主次关系。','emotion':'encouraging','correct':True}) as model:
    self.assertEqual(request(),(200,{'reply':'符合主次关系。','emotion':'encouraging','correct':True}))
    self.assertEqual(model.call_args.args[0]['title'],app.QUESTIONS[6]['variants'][0]['title']);self.assertEqual(model.call_args.kwargs,{'assess':True})
    self.assertEqual(request(q=0)[0],400);self.assertEqual(request(variant='invented')[0],400)
  finally:server.shutdown();server.server_close();thread.join()
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
