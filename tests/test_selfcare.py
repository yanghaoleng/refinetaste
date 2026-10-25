"""RURU's exploration, stable archive, and same-origin path compatibility."""
import http.client
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import unittest
import uuid
from unittest.mock import patch
from test_academies import module, ROOT

class SelfcareTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.build=tempfile.TemporaryDirectory()
        subprocess.run([sys.executable,str(ROOT/'scripts/build-academies.py'),'--site','selfcare','--output',cls.build.name],check=True,capture_output=True)
        cls.root=Path(cls.build.name)/'selfcare'
        previous=sys.modules.get('reviewer')
        cls.reviewer=module('ruru_reviewer',cls.root/'server/reviewer.py')
        try:
            sys.modules['reviewer']=cls.reviewer
            cls.app=module('ruru_app',cls.root/'server/app.py')
        finally:
            if previous:sys.modules['reviewer']=previous
            else:sys.modules.pop('reviewer',None)
    @classmethod
    def tearDownClass(cls):cls.build.cleanup()
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.app.DB=str(Path(self.temp.name)/'old-selfcare.sqlite3')
        self.app.SECRET='test-only-existing-selfcare-secret-unchanged';self.app.init_db()
    def tearDown(self):self.temp.cleanup()
    def test_ordered_eight_step_opening_and_retired_ids_are_distinct(self):
        course=self.app.COURSE;active=[q for q in course['questions'] if not q.get('archived')]
        self.assertEqual([ch['id'] for ch in course['chapters']],[11,*range(10)])
        self.assertEqual(len(active),88)
        self.assertEqual([q['id'] for q in active if q['chapter']==11],list(range(88,96)))
        self.assertTrue(all(q['feedbackMode']=='exploration' and q['variants']==[] for q in active if q['chapter']==11))
        for q in active:
            if q['chapter']==11:self.assertTrue(all('xiaoyuzhoufm.com' in s['url'] for s in q['sources']))
            if q['kind']=='open':self.assertTrue(q['followUps'])
        archive=json.loads((ROOT/'academy/selfcare/legacy-mattering-v1.json').read_text())
        self.assertEqual([{k:v for k,v in q.items() if k!='archived'} for q in course['questions'][80:88]],archive['questions'])
        for i,q in enumerate(course['questions']):self.assertEqual(q['id'],i)
        self.assertNotIn('重要性感受',course['chapters'][-1]['title'])
        self.assertIn('先认识', (ROOT/'academy/selfcare/runtime.js').read_text())
    def test_exploration_cannot_receive_model_verdict_even_if_requested(self):
        q=self.app.QUESTIONS[88]
        captured=[]
        def completion(payload,validate):
            captured.append(payload['messages'][0]['content'])
            return validate(dict(reply='可以先记下“不知道”。如果愿意，也可以留意最近让你停一下的时刻。',emotion='curious',correct=False))
        with patch.dict(os.environ,SELFCARE_AI_KEY='test',SELFCARE_AI_MODEL='test'),patch.object(self.reviewer,'complete',side_effect=completion):
            answer=self.reviewer.chat(q,[dict(role='user',content='不知道，暂不做')],assess=True)
        self.assertNotIn('correct',answer)
        self.assertIn('无评分',captured[0]);self.assertNotIn('首次作答判定',captured[0])
        self.assertIn('不擅断隐藏动机',captured[0])
    def test_ungraded_completion_and_legacy_runs_share_existing_database(self):
        run={k:str(uuid.uuid4()) for k in ('visitor','session','run')}
        def event(kind,**extra):return self.app.collect(dict(id=str(uuid.uuid4()),course=2,kind=kind,**run,**extra))
        event('start',start=88,questions=list(range(88,96)))
        for q in range(88,96):event('answer',q=q,choice=-1)
        event('complete')
        stats=self.app.summary(7)
        for q in stats['questions']:
            if q['course']==2 and q['index']>=88:self.assertIsNone(q['correct']);self.assertEqual(q['gradedAnswers'],0)
        self.assertIsNone(self.app.graded_value(dict(course=2,q=88,choice=1)))
        run['run']=str(uuid.uuid4());event('start',start=80,questions=list(range(80,88)))
        for qid in range(80,88):
            q=self.app.QUESTIONS[qid];event('answer',q=qid,choice=q['correct'] if q['kind']=='choice' else 1)
        event('complete');self.app.init_db()
        self.assertEqual(self.app.summary(7)['metrics']['completed'],2)
        self.assertEqual(self.app.BASE,'/selfcare')
    def test_new_and_old_path_serve_identical_assets_and_identity(self):
        server=self.app.ThreadingHTTPServer(('127.0.0.1',0),self.app.Handler)
        worker=threading.Thread(target=server.serve_forever,daemon=True);worker.start()
        def request(method,path,body=None):
            con=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=3)
            con.request(method,path,json.dumps(body) if body else None,{'Origin':'https://mikeywa.site','Content-Type':'application/json'})
            result=con.getresponse();payload=result.read();con.close();return result.status,payload
        try:
            for asset in ('','course.json','app.js','analytics.js','academy.css','privacy.html','api/health'):
                old=request('GET','/selfcare/'+asset);new=request('GET','/lifecoach/'+asset)
                self.assertEqual(old,new,asset);self.assertEqual(new[0],200)
            visitor=dict(visitor=str(uuid.uuid4()))
            self.assertEqual(request('POST','/selfcare/api/identity',visitor),request('POST','/lifecoach/api/identity',visitor))
            self.assertEqual(request('GET','/lifecoach/api/summary')[0],401)
            self.assertEqual(request('GET','/lifecoach/api/learners')[0],401)
        finally:server.shutdown();server.server_close();worker.join()

if __name__=='__main__':unittest.main()
