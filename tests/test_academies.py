"""Exercise the built sites as separate backends, including namespacing and full chapters."""
import importlib.util,json,os,re,subprocess,sys,tempfile,threading,http.client,unittest,uuid
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
def module(name,file):
 spec=importlib.util.spec_from_file_location(name,file);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
class AcademyTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.build=tempfile.TemporaryDirectory();cls.out=Path(cls.build.name)
  subprocess.run([sys.executable,str(ROOT/'scripts/build-academies.py'),'--output',str(cls.out)],check=True,capture_output=True)
  cls.apps={};previous=sys.modules.get('reviewer')
  try:
   for slug in ('selfcare','philosophy','mediaclass'):
    server=cls.out/slug/'server';sys.modules['reviewer']=module(slug+'_reviewer',server/'reviewer.py');cls.apps[slug]=module(slug+'_app',server/'app.py')
  finally:
   if previous:sys.modules['reviewer']=previous
   else:sys.modules.pop('reviewer',None)
 @classmethod
 def tearDownClass(cls):cls.build.cleanup()
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory()
  for slug,a in self.apps.items():a.DB=str(Path(self.temp.name)/(slug+'.sqlite3'));a.SECRET=slug+'-test-secret-with-at-least-32-characters';a.init_db()
 def tearDown(self):self.temp.cleanup()
 def event(self,a,run,kind,**extra):return a.collect(dict(id=str(uuid.uuid4()),visitor=run['visitor'],session=run['session'],run=run['run'],course=2,kind=kind,**extra))
 def test_all_subject_chapters_complete_only_their_own_syllabus_and_do_not_mix_sites(self):
  for slug,a in self.apps.items():
   self.assertEqual(len(a.QUESTIONS),{'selfcare':80,'philosophy':64,'mediaclass':96}[slug])
   self.assertEqual(a.BASE,'/'+slug)
   for start in a.CHAPTER_STARTS:
    run={k:str(uuid.uuid4()) for k in ('visitor','session','run')};ids=list(a.CHAPTER_QUESTIONS[start])
    self.event(a,run,'start',start=start,questions=ids)
    with self.assertRaises(ValueError):self.event(a,run,'answer',q=(start+8)%len(a.QUESTIONS),choice=0)
    for qid in ids[:-1]:q=a.QUESTIONS[qid];self.event(a,run,'answer',q=qid,choice=q['correct'] if q['kind']=='choice' else 1)
    with self.assertRaises(ValueError):self.event(a,run,'complete')
    q=a.QUESTIONS[ids[-1]];self.event(a,run,'answer',q=q['id'],choice=q['correct'] if q['kind']=='choice' else 1);self.event(a,run,'complete')
   self.assertEqual(a.summary(7)['metrics']['completed'],len(a.CHAPTER_STARTS))
  self.assertNotEqual(self.apps['philosophy'].DB,self.apps['mediaclass'].DB)
  self.assertEqual(self.apps['philosophy'].summary(7)['metrics']['completed'],8)
  self.assertEqual(self.apps['mediaclass'].summary(7)['metrics']['completed'],12)
  self.assertEqual(self.apps['selfcare'].summary(7)['metrics']['completed'],10)
  self.assertEqual(len({a.DB for a in self.apps.values()}),3)
 def test_builtin_assets_references_and_private_dashboard_use_correct_routes(self):
  for slug,a in self.apps.items():
   server=a.ThreadingHTTPServer(('127.0.0.1',0),a.Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
   try:
    sprites=re.findall(r"assets/((?:wenwen|aying|xiaoman)-[a-z-]+-[a-f0-9]{12}\.webp)",(a.ROOT/'dist/course.css').read_text());self.assertEqual(len(sprites),4)
    for sprite in sprites:
     con=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=3);con.request('GET',a.BASE+'/assets/'+sprite);response=con.getresponse();body=response.read();con.close();self.assertEqual(response.status,200);self.assertEqual(body,(a.ROOT/'dist/assets'/sprite).read_bytes())
    for path,status in [('/',404),(a.BASE+'/',200),(a.BASE+'/academy.css',200),(a.BASE+'/other-fields.css',200),(a.BASE+'/other-fields.js',200),(a.BASE+'/assets/mascot.png',200),(a.BASE+'/assets/icons/thinking-96.webp',200),(a.BASE+'/course.json',200),(a.BASE+'/api/health',200),(a.BASE+'/api/summary',401),('/refinetaste/course.json',404)]:
     con=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=3);con.request('GET',path);response=con.getresponse();body=response.read();con.close();self.assertEqual(response.status,status,(slug,path))
     if path.endswith('course.json') and status==200:self.assertEqual(len(json.loads(body)['questions']),len(a.QUESTIONS))
   finally:server.shutdown();server.server_close();thread.join()
 def test_subject_coach_and_all_choice_permutations_preserve_evidence(self):
  for slug,a in self.apps.items():
   for q in a.QUESTIONS:
    for variant in ('base','alternate'):
     for order in ([0,1],[1,0]):
      resolved=a.resolve_question(q['id'],variant,order)
      if q['kind']=='choice':self.assertEqual(resolved['visuals'][resolved['correct']],q['visuals'][q['correct']])
   env=json.loads((a.ROOT/'site.json').read_text())['env'];q=next(q for q in a.QUESTIONS if q['kind']=='open')
   with patch.dict(os.environ,{env+'_AI_KEY':'test',env+'_AI_MODEL':'test'}),patch.object(a.reviewer,'complete',return_value={'reply':'依据具体材料讨论。','emotion':'thinking','correct':True}) as completion:
    a.reviewer.chat(q,[dict(role='user',content='我给出一个有条件的方案和理由。')],assess=True)
    instruction=completion.call_args.args[0]['messages'][0]['content'];self.assertIn({'philosophy':'哲学','mediaclass':'口播','selfcare':'coffee chat'}[slug],instruction)
    if slug=='philosophy':self.assertIn('不因结论',instruction);self.assertNotIn('只讨论当前题目相关的设计',instruction)
    if slug=='selfcare':
     for boundary in ['不根据聊天诊断疾病','不要求披露真实个人经历','不以健康结果','合理选择独处','尊重双方同意']:self.assertIn(boundary,instruction)
     self.assertNotIn('只讨论当前题目相关的设计',instruction)
