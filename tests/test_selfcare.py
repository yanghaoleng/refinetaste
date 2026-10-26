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
            if q['kind']=='open' and q['chapter']!=11:self.assertTrue(q['followUps'])
        archive=json.loads((ROOT/'academy/selfcare/legacy-mattering-v1.json').read_text())
        self.assertEqual([{k:v for k,v in q.items() if k!='archived'} for q in course['questions'][80:88]],archive['questions'])
        for i,q in enumerate(course['questions']):self.assertEqual(q['id'],i)
        self.assertNotIn('重要性感受',course['chapters'][-1]['title'])
        for q in course['questions'][88:96]:
            self.assertEqual(q['brief'],'')
            self.assertLessEqual(len(q['prompt']),26)
            self.assertEqual(q['prompt'].count('？'),1)
            self.assertEqual(q['visuals'],[])
            self.assertEqual(q['followUps'],[])
            self.assertFalse(q.get('before'))
            self.assertEqual(q['coachOpening'],[])
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
        self.assertIn('每轮只说一两句',captured[0])
        self.assertIn('最多一个问号',captured[0])
        self.assertNotIn('rubric',captured[0])
        self.assertNotIn('xiaoyuzhoufm.com',captured[0])
        self.assertNotIn('参考原则',captured[0])
    def test_short_chat_rejects_question_barrage_or_textbook_dump(self):
        for reply in ['你看什么？为什么？', '长'*121]:
            def completion(payload,validate):return validate(dict(reply=reply,emotion='curious'))
            with patch.dict(os.environ,SELFCARE_AI_KEY='test',SELFCARE_AI_MODEL='test'),patch.object(self.reviewer,'complete',side_effect=completion):
                with self.assertRaises(ValueError):self.reviewer.chat(self.app.QUESTIONS[88],[dict(role='user',content='刷剧')])
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

    def session_request(self,messages,mode='exploration_session',**extra):
        return dict(q=88,mode=mode,revision=len(messages),messages=messages,**extra)

    def report_fixture(self,mid=None,quote=None):
        result={'sections':{key:[dict(text='还没有探讨这一点。',status='not_explored',evidence=[])] for key,_ in self.app.exploration.SECTIONS},'courses':[]}
        if mid:result['sections']['clues']=[dict(text='想给自己留一些时间。',status='tentative',evidence=[dict(messageId=mid,quote=quote)])]
        return result

    def test_continuous_context_keeps_old_words_and_corrections_beyond_twelve_messages(self):
        messages=[dict(id='u0',role='user',content='我想聊的是照顾家人后如何给自己留时间。')]
        for i in range(30):messages.append(dict(id='m'+str(i),role='assistant' if i%2==0 else 'user',content='这次的具体经历'+str(i)))
        messages.append(dict(id='fix',role='user',kind='correction',content='更正：我不是不在意家人，只是也想保留自己的时间。'))
        request=self.app.exploration.validate_request(self.session_request(messages));captured=[]
        def completion(payload,validate):captured.append(payload);return validate(dict(reply='这两件事可以一起谈。眼下最想先说哪一点？',emotion='curious',choices=[],checkIn=None))
        with patch.dict(os.environ,SELFCARE_AI_MODEL='test'),patch.object(self.reviewer,'complete',side_effect=completion):self.app.exploration.respond(request,self.reviewer)
        data=json.loads(captured[0]['messages'][1]['content'].split('\n',1)[1])
        self.assertEqual(len(data['messages']),32);self.assertIn('照顾家人',data['messages'][0]['content']);self.assertEqual(data['messages'][-1]['kind'],'correction')

    def test_report_evidence_cannot_quote_assistant_or_invent_user_words(self):
        exp=self.app.exploration;messages=[dict(id='u1',role='user',content='想留一点时间'),dict(id='a1',role='assistant',content='你是否想转行？')]
        exp.clean_report(self.report_fixture('u1','留一点时间'),messages)
        for report in [self.report_fixture('a1','想转行'),self.report_fixture('u1','想转行')]:
            with self.assertRaises(ValueError):exp.clean_report(report,messages)
        altered=self.report_fixture('u1','留一点时间');altered['sections']['clues'][0]['status']='user_edited'
        with self.assertRaises(ValueError):exp.clean_report(altered,messages)

    def test_empty_session_can_generate_initial_report_without_a_score(self):
        exp=self.app.exploration;session=exp.validate_request(self.session_request([],mode='exploration_report'))
        def completion(payload,validate):return validate(dict(report=self.report_fixture(),correct=True,score=100))
        with patch.dict(os.environ,SELFCARE_AI_MODEL='test'),patch.object(self.reviewer,'complete',side_effect=completion):result=exp.respond(session,self.reviewer)
        self.assertNotIn('correct',result);self.assertNotIn('score',result);self.assertEqual(result['basedOnRevision'],0)
        self.assertTrue(all(row['status']=='not_explored' for rows in result['report']['sections'].values() for row in rows))

    def test_empty_sections_are_honestly_unexplored_and_edits_require_user_correction(self):
        exp=self.app.exploration
        result=exp.clean_report(dict(sections={key:[] for key,_ in exp.SECTIONS}),[])
        self.assertTrue(all(rows[0]['status']=='not_explored' and not rows[0]['evidence'] for rows in result['sections'].values()))
        messages=[dict(id='fix',role='user',kind='correction',content='我想改成：我需要休息。')]
        report=self.report_fixture('fix','我需要休息。');report['sections']['clues'][0]['status']='user_edited'
        request=exp.validate_request(self.session_request(messages,mode='exploration_report',report=report))
        self.assertEqual(request['report']['sections']['clues'][0]['status'],'user_edited')
        messages[0].pop('kind')
        with self.assertRaises(ValueError):exp.validate_request(self.session_request(messages,mode='exploration_report',report=report))

    def test_check_in_stays_tentative_and_cannot_use_assistant_as_evidence(self):
        exp=self.app.exploration
        messages=[dict(id='u',role='user',content='想休息'),dict(id='a',role='assistant',content='可能想有自己的空间。',checkIn=dict(text='可能想有自己的空间。',evidence=[dict(messageId='u',quote='想休息')])),dict(id='u2',role='user',content='先不确定')]
        clean=exp.validate_request(self.session_request(messages))
        self.assertEqual(clean['messages'][1]['tentativeObservation']['status'],'tentative')
        messages[1]['checkIn']['evidence'][0]=dict(messageId='a',quote='自己的空间')
        with self.assertRaises(ValueError):exp.validate_request(self.session_request(messages))

    def test_session_allows_no_question_but_rejects_tracking_and_oversize(self):
        exp=self.app.exploration;messages=[dict(id='u',role='user',content='不想聊了，先休息。')];session=exp.validate_request(self.session_request(messages))
        def completion(payload,validate):return validate(dict(reply='好，我们先停在这里。',emotion='relieved',choices=[],checkIn=None))
        with patch.dict(os.environ,SELFCARE_AI_MODEL='test'),patch.object(self.reviewer,'complete',side_effect=completion):self.assertEqual(exp.respond(session,self.reviewer)['choices'],[])
        with self.assertRaises(ValueError):exp.validate_request(self.session_request(messages,tracking={'visitor':'must-not-record'}))
        with self.assertRaises(ValueError):exp.validate_request(self.session_request([dict(id=str(i),role='user',content='字'*1000) for i in range(25)]))

    def test_continuous_http_mode_preserves_origin_and_does_not_record_conversation(self):
        server=self.app.ThreadingHTTPServer(('127.0.0.1',0),self.app.Handler);worker=threading.Thread(target=server.serve_forever,daemon=True);worker.start()
        try:
            body=self.session_request([dict(id='u1',role='user',content='刷剧')]);body.update(id=str(uuid.uuid4()),answer='刷剧')
            def completion(payload,validate):return validate(dict(reply='从最近看的聊起就好。最近在看哪部剧？',emotion='curious',choices=[],checkIn=None))
            with patch.dict(os.environ,SELFCARE_AI_KEY='test',SELFCARE_AI_MODEL='test'),patch.object(self.reviewer,'complete',side_effect=completion),patch.object(self.app,'save_conversation') as record:
                con=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=5);con.request('POST','/lifecoach/api/review',json.dumps(body),{'Origin':'https://mikeywa.site','Content-Type':'application/json'});response=con.getresponse();data=json.loads(response.read());con.close()
                self.assertEqual(response.status,200);self.assertNotIn('correct',data);record.assert_not_called()
        finally:server.shutdown();server.server_close();worker.join()

    def test_selections_are_labelled_and_replaced_choices_cannot_be_new_report_evidence(self):
        exp=self.app.exploration
        messages=[dict(id='s1',role='user',kind='selection',content='我点选：挑战过关。'),dict(id='s2',role='user',kind='selection',content='改选：熟悉省心。',supersedes=['s1'])]
        clean=exp.validate_request(self.session_request(messages))
        self.assertEqual(clean['messages'][0]['supersededBy'],'s2')
        report=self.report_fixture('s1','挑战过关')
        with self.assertRaises(ValueError):exp.clean_report(report,clean['messages'])
        exp.clean_report(report,clean['messages'],allow_edits=True)
        report=self.report_fixture('s2','熟悉省心')
        self.assertEqual(exp.clean_report(report,clean['messages'])['sections']['clues'][0]['evidence'][0]['source'],'selection')
        messages[1]['supersedes']=['nonexistent']
        with self.assertRaises(ValueError):exp.validate_request(self.session_request(messages))

    def test_health_session_has_topic_scope_and_no_automatic_diagnosis_or_recording(self):
        exp=self.app.exploration;messages=[dict(id='h',role='user',kind='habit',content='盘点：我喝含糖饮料。'),dict(id='u',role='user',content='我想先了解整体搭配，不想减肥。')]
        request=dict(q=16,mode='health_session',topic='diet',revision=2,messages=messages)
        session=exp.validate_request(request);captured=[]
        def completion(payload,validate):
            captured.append(payload);return validate(dict(reply='不能由这一条习惯判断疾病，还要看整体饮食和其他条件。',choices=[],checkIn=None))
        with patch.dict(os.environ,SELFCARE_AI_MODEL='test'),patch.object(self.reviewer,'complete',side_effect=completion):result=exp.respond(session,self.reviewer)
        self.assertNotIn('score',result);self.assertNotIn('correct',result);self.assertIn('不是疾病诊断',captured[0]['messages'][0]['content']);self.assertIn('在床窗口',captured[0]['messages'][0]['content'])
        with self.assertRaises(ValueError):exp.validate_request({**request,'q':88})
        with self.assertRaises(ValueError):exp.validate_request({**request,'topic':'other'})

    def test_health_references_correct_misconceptions_and_do_not_call_model_for_diagnosis(self):
        exp=self.app.exploration
        cases=[('sleep',8,'实际上睡了7小时，所以白天睡就是不健康吗？','不等于实际睡眠'),('diet',16,'所以我已经糖尿病了吗？','不能诊断'),('activity',16,'现在胸痛，还能坚持打卡吗？','当地急救')]
        for topic,q,content,expected in cases:
            session=exp.validate_request(dict(q=q,topic=topic,mode='health_session',revision=1,messages=[dict(id='u',role='user',content=content)]))
            with patch.object(self.reviewer,'complete') as model:result=exp.respond(session,self.reviewer)
            model.assert_not_called();self.assertIn(expected,result['reply']);self.assertEqual(result['source'],'reference')

    def test_all_practice_topics_keep_independent_scopes_and_do_not_grade(self):
        exp=self.app.exploration;topics={'selfcare':0,'stress':24,'connections':32,'curiosity':40,'invite':48,'listen':56,'boundaries':64,'followup':72}
        for topic,q in topics.items():
            request=dict(q=q,topic=topic,mode='practice_session',revision=1,messages=[dict(id='u',role='user',content='还不知道，先不行动。')]);session=exp.validate_request(request)
            def completion(payload,validate):return validate(dict(reply='好，可以先留在这里。',choices=[],checkIn=None))
            with patch.dict(os.environ,SELFCARE_AI_MODEL='test'),patch.object(self.reviewer,'complete',side_effect=completion):result=exp.respond(session,self.reviewer)
            self.assertNotIn('score',result);self.assertNotIn('correct',result)
            with self.assertRaises(ValueError):exp.validate_request({**request,'q':88})

    def test_report_cannot_erase_existing_user_material_with_an_empty_template(self):
        exp=self.app.exploration;messages=[dict(id='u1',role='user',content='我想给照顾家人的自己留点时间读小说，但先不行动。')]
        session=exp.validate_request(self.session_request(messages,mode='exploration_report'))
        def empty(payload,validate):return validate(dict(report=self.report_fixture()))
        with patch.dict(os.environ,SELFCARE_AI_MODEL='test'),patch.object(self.reviewer,'complete',side_effect=empty):
            result=exp.respond(session,self.reviewer)
        self.assertEqual(result['report']['origin'],'source_notes')
        self.assertEqual(result['report']['sections']['clues'][0]['evidence'][0]['quote'],messages[0]['content'])
        captured=[]
        def grounded(payload,validate):
            record=json.loads(payload['messages'][1]['content'].split('\n',1)[1]);captured.append(record)
            return validate(dict(report=record['reportShape']))
        with patch.dict(os.environ,SELFCARE_AI_MODEL='test'),patch.object(self.reviewer,'complete',side_effect=grounded):result=exp.respond(session,self.reviewer)
        self.assertEqual(result['report']['sections']['clues'][0]['evidence'][0]['quote'],messages[0]['content'])
        self.assertIn('reportShape',captured[0])
        invitation=self.report_fixture('u1','我想给照顾家人的自己留点时间读小说，但先不行动。')
        invitation['sections']['directions']=[dict(text='是否愿意继续聊读小说？',status='explicit',evidence=[dict(messageId='u1',quote=messages[0]['content'])])]
        self.assertEqual(exp.clean_report(invitation,messages)['sections']['directions'][0]['status'],'tentative')

    def test_invalid_model_report_has_labelled_source_only_fallback(self):
        exp=self.app.exploration
        messages=[dict(id='u',role='user',content='想休息，先不行动。'),dict(id='a',role='assistant',content='你肯定想转行。')]
        session=exp.validate_request(self.session_request(messages,mode='exploration_report'))
        with patch.dict(os.environ,SELFCARE_AI_MODEL='test'),patch.object(self.reviewer,'complete',side_effect=self.reviewer.ReviewUnavailable(kind='invalid_response')):result=exp.respond(session,self.reviewer)
        self.assertEqual(result['report']['origin'],'source_notes');self.assertIn('暂未完成',result['reply'])
        self.assertNotIn('转行',json.dumps(result['report'],ensure_ascii=False));self.assertEqual(result['report']['courses'],[])
        with patch.dict(os.environ,SELFCARE_AI_MODEL='test'),patch.object(self.reviewer,'complete',side_effect=self.reviewer.ReviewUnavailable(kind='auth')):
            with self.assertRaises(self.reviewer.ReviewUnavailable):exp.respond(session,self.reviewer)

if __name__=='__main__':unittest.main()
