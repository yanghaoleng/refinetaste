import unittest,tempfile,uuid,time,json,threading,http.client
from pathlib import Path
from unittest.mock import patch
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import app

def uid():return str(uuid.uuid4())
class LearningDashboardTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();app.DB=str(Path(self.tmp.name)/'data.sqlite3');app.SECRET='dashboard-test-secret-with-thirty-two-characters';app.init_db();app.sessions.clear();app.review_rates.clear();app.collect_rates.clear();self.now=time.time();self.visitor=uid();self.session=uid();self.thread=uid();self.run=uid()
 def tearDown(self):self.tmp.cleanup()
 def event(self,kind,**values):
  app.collect(dict(id=uid(),visitor=self.visitor,session=self.session,run=self.run,kind=kind,course=2,**values),self.now)
 def message(self,role='user',content='我的原始回答\n保留换行 <script>不会执行</script>',position=0,**extra):return dict(id=uid(),role=role,content=content,position=position,**extra)
 def payload(self,messages,q=6):return dict(visitor=self.visitor,session=self.session,thread=self.thread,q=q,variant='base',optionOrder=[0,1],messages=messages)
 def test_accuracy_excludes_ungraded_and_depth_deduplicates_retries(self):
  self.event('start',start=0)
  for q,choice in [(0,0),(1,1),(6,1),(7,-1)]:self.event('answer',q=q,choice=choice)
  self.event('answer',q=0,choice=1) # same round is immutable
  self.run=uid();self.event('start',start=0);self.event('answer',q=0,choice=1)
  r=app.learning_report(7,now=self.now);u=r['users'][0]
  self.assertEqual((u['answers'],u['graded'],u['correct'],u['depth'],u['chapters']),(5,4,3,4,1))
  self.assertEqual((r['questions'][0]['answers'],r['questions'][0]['correct']),(2,1))
  self.assertEqual((r['questions'][7]['answers'],r['questions'][7]['graded']),(1,0))
 def test_current_period_answers_include_runs_started_before_window(self):
  app.collect(dict(id=uid(),visitor=self.visitor,session=self.session,run=self.run,kind='start',course=2,start=0),self.now-10*86400)
  self.event('answer',q=0,choice=1)
  self.assertEqual(app.learning_report(7,now=self.now)['questions'][0]['answers'],1)
 def test_full_conversations_are_deduplicated_paginated_and_isolated(self):
  raw=self.message();app.save_conversation(self.payload([raw]),self.now)
  app.save_conversation(self.payload([raw]),self.now)
  for i in range(1,62):app.save_conversation(self.payload([self.message('assistant' if i%2 else 'user',content='消息 '+str(i),position=i)]),self.now+i/1000)
  ident=app.digest(self.visitor);a=app.learner_detail(ident,7,now=self.now+1);b=app.learner_detail(ident,7,1,now=self.now+1)
  self.assertEqual(a['messages'],62);self.assertEqual(len(a['records']),50);self.assertTrue(a['hasMore']);self.assertEqual(len(b['records']),12);self.assertFalse(b['hasMore']);self.assertEqual(a['records'][0]['content'],raw['content'])
  self.assertEqual(app.learner_detail(app.digest(uid()),7,now=self.now+1)['records'],[])
  self.assertNotIn(self.visitor,json.dumps(app.learning_report(7,now=self.now+1)))
 def test_invalid_records_are_atomic_and_expired_text_is_removed(self):
  app.save_conversation(self.payload([self.message()]),self.now-91*86400)
  with self.assertRaises(ValueError):app.save_conversation(self.payload([self.message(),self.message(position=-1)]),self.now)
  app.save_conversation(self.payload([self.message(content='新的答案')]),self.now)
  with app.connect() as db:self.assertEqual(db.execute('SELECT COUNT(*) FROM conversation_messages').fetchone()[0],1)
 def test_user_list_paginates_and_searches_without_changing_total_metrics(self):
  for _ in range(32):
   self.visitor=uid();self.session=uid();self.event('view')
  a=app.learning_report(7,now=self.now);b=app.learning_report(7,1,now=self.now)
  self.assertEqual((len(a['users']),len(b['users']),a['total']),(30,2,32))
  s=app.learning_report(7,search=a['users'][0]['id'][:10],now=self.now)
  self.assertEqual(s['total'],1);self.assertEqual(s['totals']['users'],32)
 def test_http_auth_and_failed_ai_preserve_user_answer_and_success_preserves_reply(self):
  server=app.ThreadingHTTPServer(('127.0.0.1',0),app.Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  def request(path,body=None,cookie=None,origin='https://mikeywa.site'):
   c=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=3);headers={'Origin':origin}
   if cookie:headers['Cookie']=cookie
   if body is not None:headers['Content-Type']='application/json'
   c.request('POST' if body is not None else 'GET',app.BASE+'/api/'+path,json.dumps(body) if body is not None else None,headers);r=c.getresponse();raw=r.read();status=r.status;c.close();return status,json.loads(raw) if raw else None
  try:
   for path in ('learners','learner?id='+app.digest(self.visitor)):
    status,body=request(path);self.assertEqual(status,401);self.assertNotIn('records',body)
   m=self.message();p=self.payload([m]);tracking={k:p[k] for k in ('visitor','session','thread')}
   body=dict(id=uid(),q=6,variant='base',optionOrder=[0,1],mode='assessment',answer=m['content'],messages=[m],tracking=tracking)
   with patch.object(app.reviewer,'configured',return_value=False):self.assertEqual(request('review',body)[0],503)
   self.assertEqual(app.learner_detail(app.digest(self.visitor),7)['records'][0]['content'],m['content'])
   with patch.object(app.reviewer,'configured',return_value=True),patch.object(app.reviewer,'chat',return_value={'reply':'先确定信息重点。','correct':True,'emotion':'happy'}):
    body['id']=uid();status,result=request('review',body);self.assertEqual(status,200);self.assertTrue(result['messageId'])
   app.save_conversation(self.payload([dict(id=result['messageId'],role='assistant',content=result['reply'],position=1)]))
   detail=app.learner_detail(app.digest(self.visitor),7);self.assertEqual(len(detail['records']),2);self.assertTrue(detail['records'][1]['correct']);self.assertEqual(detail['records'][1]['source'],'model')
   token='dashboard-unit-test';app.sessions[app.digest(token)]=time.time()+60
   self.assertEqual(request('learners',cookie='refinetaste_admin='+token)[0],200)
   self.assertEqual(request('learners?days=all',cookie='refinetaste_admin='+token)[0],200)
   self.assertEqual(request('learner?id='+app.digest(self.visitor)+'&days=all',cookie='refinetaste_admin='+token)[0],200)
   self.assertEqual(request('learners?days=999',cookie='refinetaste_admin='+token)[0],400)
   self.assertEqual(request('learner?id='+app.digest(self.visitor),cookie='refinetaste_admin='+token)[1]['records'][0]['content'],m['content'])
   self.assertEqual(request('conversation',p,origin='https://evil.invalid')[0],403)
  finally:server.shutdown();server.server_close();thread.join()
if __name__=='__main__':unittest.main()
