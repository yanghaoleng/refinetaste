import unittest, tempfile, uuid, time, threading, http.client, json, hashlib
from pathlib import Path
from datetime import datetime
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import app

def uid(): return str(uuid.uuid4())

class AnalyticsTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        app.DB=str(Path(self.temp.name)/'test.sqlite3')
        app.SECRET='test-only-secret-for-unit-tests-32-chars'
        app.PIN_HASH=hashlib.sha256(b'123456').hexdigest()
        app.init_db()
        app.sessions.clear();app.attempts.clear();app.collect_rates.clear()
        self.now=time.time()
        self.visitor,self.session,self.run=uid(),uid(),uid()
    def tearDown(self): self.temp.cleanup()
    def event(self,kind,at=None,**extra):
        e=dict(id=uid(),visitor=self.visitor,session=self.session,kind=kind,run=self.run,**extra)
        app.collect(e,self.now if at is None else at)
        return e
    def test_full_and_partial_runs_and_first_answer(self):
        self.event('view');self.event('view');self.event('start',start=0)
        for q in range(8):
            self.event('answer',q=q,choice=app.CORRECT[q])
            self.event('answer',q=q,choice=1-app.CORRECT[q])
        self.event('complete');self.event('complete');self.event('note_saved',text='must never be stored')
        self.run=uid();self.event('start',start=6);self.event('answer',q=6,choice=0)
        result=app.summary(7,self.now+1)
        self.assertEqual(result['metrics'],dict(views=2,visitors=1,sessions=1,starts=2,completed=1,answers=9,notes=1))
        self.assertEqual(result['questions'][6]['answers'],2)
        self.assertEqual(result['questions'][6]['correct'],1)
        self.assertEqual(result['chapters'][2]['completed'],0)
        with app.connect() as db:
            rows=[dict(r) for r in db.execute('SELECT * FROM events')]
        payload=json.dumps(rows)
        self.assertNotIn(self.visitor,payload)
        self.assertNotIn('must never be stored',payload)
    def test_completion_requires_all_answers_and_matching_identity(self):
        self.event('start',start=6)
        with self.assertRaises(ValueError):self.event('complete')
        self.event('answer',q=6,choice=1)
        self.visitor=uid()
        with self.assertRaises(ValueError):self.event('answer',q=7,choice=1)
        with self.assertRaises(ValueError):self.event('start',start=True)
    def test_window_excludes_prior_cohort_and_respects_shanghai_midnight(self):
        self.now=datetime(2026,10,16,0,10,tzinfo=app.ZONE).timestamp()
        self.event('view',at=self.now-1200)
        self.event('start',at=self.now-8*86400,start=6)
        self.event('answer',q=6,choice=1);self.event('answer',q=7,choice=1);self.event('complete')
        result=app.summary(7,self.now+1)
        self.assertEqual(result['daily'][-2]['views'],1)
        self.assertEqual(result['daily'][-1]['views'],0)
        self.assertFalse(result['daily'][0]['covered'])
        self.assertTrue(result['daily'][-2]['covered'])
        self.assertEqual(result['metrics']['starts'],0)
        self.assertEqual(result['metrics']['completed'],0)
        self.assertEqual(result['metrics']['answers'],0)
    def test_empty_database(self):
        result=app.summary(30,self.now)
        self.assertIsNone(result['collectedSince'])
        self.assertEqual(len(result['daily']),30)
        self.assertTrue(all(v==0 for v in result['metrics'].values()))
    def test_http_auth_origin_throttle_and_static_boundaries(self):
        server=app.ThreadingHTTPServer(('127.0.0.1',0),app.Handler)
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        def request(method,path,body=None,headers=None):
            c=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=3)
            c.request(method,path,json.dumps(body) if body is not None else None,headers or {})
            r=c.getresponse();raw=r.read();result=(r.status,dict(r.getheaders()),json.loads(raw) if raw and r.getheader('Content-Type','').startswith('application/json') else raw);c.close();return result
        try:
            self.assertEqual(request('GET',app.BASE+'/api/summary')[0],401)
            self.assertEqual(request('GET',app.BASE+'/../../.env')[0],404)
            self.assertEqual(request('POST',app.BASE+'/api/login',{'code':'123456'},{'Origin':'https://evil.example'})[0],403)
            headers={'Origin':'https://mikeywa.site'}
            status,response,_=request('POST',app.BASE+'/api/login',{'code':'123456'},headers)
            self.assertEqual(status,200)
            self.assertIn('HttpOnly',response['Set-Cookie']);self.assertIn('Secure',response['Set-Cookie'])
            cookie=response['Set-Cookie'].split(';')[0]
            auth={'Cookie':cookie}
            self.assertEqual(request('GET',app.BASE+'/api/summary?days=7',headers=auth)[0],200)
            self.assertEqual(request('GET',app.BASE+'/api/summary?days=1000',headers=auth)[0],400)
            self.assertEqual(request('POST',app.BASE+'/api/logout',{},dict(headers,**auth))[0],200)
            self.assertEqual(request('GET',app.BASE+'/api/summary',headers=auth)[0],401)
            for _ in range(5):self.assertEqual(request('POST',app.BASE+'/api/login',{'code':'000000'},headers)[0],401)
            self.assertEqual(request('POST',app.BASE+'/api/login',{'code':'123456'},headers)[0],429)
        finally:server.shutdown();server.server_close();thread.join()

if __name__=='__main__': unittest.main()
