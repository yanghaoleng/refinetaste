import unittest,tempfile,time,uuid,sys,json,http.client,threading
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import app

def uid():return str(uuid.uuid4())
class ActivityTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();app.DB=str(Path(self.tmp.name)/'activity.sqlite3');app.SECRET='activity-test-secret-with-more-than-thirty-two-characters';app.init_db();self.now=time.time();self.visitor=uid();self.session=uid();self.visit=uid();self.run=uid()
 def tearDown(self):self.tmp.cleanup()
 def step(self,index,page='home',action='start',duration=3000,**extra):return dict(id=uid(),visitor=self.visitor,session=self.session,visit=self.visit,step=index,page=page,nextPage='chapters',action=action,durationMs=duration,**extra)
 def event(self,kind,**extra):app.collect(dict(id=uid(),visitor=self.visitor,session=self.session,run=self.run,kind=kind,course=2,**extra),self.now)
 def test_paths_merge_foreground_checkpoints_and_keep_step_order_after_out_of_order_delivery(self):
  final=self.step(2,page='chapters',action='choose_mistakes',duration=6000,nextChapter=0,nextMode='mistakes')
  app.save_journey(final,self.now+2);app.save_journey(self.step(1,action='start',duration=3000),self.now+1);app.save_journey(self.step(0,action='stay',duration=15000),self.now)
  app.save_journey(final,self.now+3)
  paths=app.usage_paths(app.digest(self.visitor),'all',0,self.now+4)['journeys']
  self.assertEqual(len(paths),1);self.assertEqual(paths[0]['steps'],3);self.assertIn('首页停留18s，点击开始答题 → 章节目录停留6s',paths[0]['text']);self.assertIn('消灭错题',paths[0]['text'])
  with self.assertRaises(ValueError):app.save_journey(self.step(3,duration=-1),self.now)
 def test_old_session_before_tracking_remains_available_without_inventing_duration(self):
  self.event('view');app.save_journey(self.step(0),self.now+10)
  paths=app.usage_paths(app.digest(self.visitor),'all',0,self.now+11)['journeys']
  old=next(p for p in paths if not p['precise']);self.assertEqual(old['text'],'访问首页');self.assertNotIn('停留',old['text'])
 def test_journey_visit_pagination_isolated_by_user(self):
  for i in range(12):self.visit=uid();app.save_journey(self.step(0),self.now+i)
  a=app.usage_paths(app.digest(self.visitor),'all',0,self.now+20);b=app.usage_paths(app.digest(self.visitor),'all',1,self.now+20)
  self.assertEqual(len(a['journeys']),10);self.assertTrue(a['journeysHasMore']);self.assertEqual(len(b['journeys']),2);self.assertFalse(b['journeysHasMore']);self.assertEqual(app.usage_paths(app.digest(uid()),'all',0,self.now+20)['journeys'],[])
 def test_activity_pairs_real_messages_and_uses_actual_completed_score(self):
  self.event('start',start=0)
  for q in app.QUESTIONS[:8]:self.event('answer',q=q['id'],choice=q['correct'] if q['kind']=='choice' else 1)
  self.event('complete')
  context=dict(visitor=self.visitor,session=self.session,thread=uid(),q=6)
  app.save_conversation(dict(**context,messages=[dict(id=uid(),role='assistant',position=0,content='自动教学开场'),dict(id=uid(),role='user',position=1,content='原始回答 <文字>')]),self.now)
  app.save_conversation(dict(**context,messages=[dict(id=uid(),role='assistant',position=2,content='AI 的真实回复')]),self.now+1,source='model')
  cards=app.recent_activity('all',self.now+2);chat=next(c for c in cards if c['type']=='conversation');score=next(c for c in cards if c['type']=='score')
  self.assertEqual(chat['userText'],'原始回答 <文字>');self.assertEqual(chat['aiText'],'AI 的真实回复');self.assertEqual(score['score'],100);self.assertNotIn('自动教学开场',json.dumps(cards,ensure_ascii=False))
 def test_activity_excludes_choice_verdicts_bookmarks_and_unanswered_choice_prompts(self):
  self.event('start',start=0);self.event('answer',q=0,choice=app.QUESTIONS[0]['correct'])
  app.save_bookmarks(dict(visitor=self.visitor,session=self.session,questions=[0]),self.now)
  for q,text in [(0,'还没有模型回复的选择题追问'),(6,'我的简答原文')]:
   app.save_conversation(dict(visitor=self.visitor,session=self.session,thread=uid(),q=q,messages=[dict(id=uid(),role='user',position=0,content=text)]),self.now)
  cards=app.recent_activity('all',self.now+1)
  self.assertEqual(len(cards),1);self.assertEqual(cards[0]['type'],'answer');self.assertEqual(cards[0]['userText'],'我的简答原文')
 def test_activity_retains_choice_ai_dialogue_and_reports_partial_grading_honestly(self):
  self.event('start',start=0)
  for q in app.QUESTIONS[:8]:self.event('answer',q=q['id'],choice=q['correct'] if q['kind']=='choice' else -1)
  self.event('complete')
  context=dict(visitor=self.visitor,session=self.session,thread=uid(),q=0)
  app.save_conversation(dict(**context,messages=[dict(id=uid(),role='user',position=0,content='为什么信息需要有层级？')]),self.now)
  app.save_conversation(dict(**context,messages=[dict(id=uid(),role='assistant',position=1,content='帮助用户找到首要信息。')]),self.now+1,source='model')
  cards=app.recent_activity('all',self.now+2)
  self.assertEqual({c['type'] for c in cards},{'conversation','score'})
  summary=next(c for c in cards if c['type']=='score');self.assertEqual((summary['total'],summary['graded'],summary['correct'],summary['accuracy']),(8,6,6,100));self.assertIsNone(summary['score'])
 def test_user_sort_is_global_before_pagination_and_missing_accuracy_stays_last(self):
  for i in range(35):
   self.visitor=uid();self.session=uid();self.run=uid();self.event('start',start=0)
   for q in range(i%5):self.event('answer',q=q,choice=app.QUESTIONS[q]['correct'])
  report=app.learning_report(7,sort='depth',direction='desc',now=self.now)
  values=[u['depth'] for u in report['users']];self.assertEqual(values,sorted(values,reverse=True));self.assertEqual(values[0],4)
  other=app.learning_report(7,sort='accuracy',direction='asc',now=self.now);self.assertTrue(all(u['graded']>0 for u in other['users'][:28]));self.assertEqual(other['users'][-1]['graded'],0)
  with self.assertRaises(ValueError):app.learning_report(7,sort='unknown',direction='asc')
 def test_question_detail_and_http_auth_journey_ingestion(self):
  self.event('start',start=0);self.event('answer',q=0,choice=app.QUESTIONS[0]['correct']);result=app.question_detail(0,7,self.now)
  self.assertEqual((result['answers'],result['graded'],result['correct']),(1,1,1));self.assertEqual(result['recentAnswers'][0]['visitor'],app.digest(self.visitor))
  server=app.ThreadingHTTPServer(('127.0.0.1',0),app.Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  def request(path,body=None,cookie=None,origin='https://mikeywa.site'):
   c=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=3);headers={'Origin':origin,'Content-Type':'application/json'}
   if cookie:headers['Cookie']=cookie
   c.request('POST' if body else 'GET',app.BASE+'/api/'+path,json.dumps(body) if body else None,headers);r=c.getresponse();data=r.read();c.close();return r.status,json.loads(data) if data else None
  try:
   self.assertEqual(request('question?id=0')[0],401);self.assertEqual(request('journey',self.step(0))[0],204);self.assertEqual(request('bookmarks',dict(visitor=self.visitor,session=self.session,questions=[0]))[0],204);self.assertEqual(request('journey',self.step(1),origin='https://evil.invalid')[0],403)
   token=uid();app.sessions[app.digest(token)]=time.time()+60
   self.assertEqual(request('question?id=0',cookie='refinetaste_admin='+token)[0],200)
   self.assertEqual(request('learner?id='+app.digest(self.visitor),cookie='refinetaste_admin='+token)[1]['journeys'][0]['precise'],True)
  finally:server.shutdown();server.server_close();thread.join()
if __name__=='__main__':unittest.main()
