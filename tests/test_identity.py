import unittest,tempfile,threading,http.client,json,uuid,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import app
class IdentityTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();app.DB=str(Path(self.temp.name)/'db.sqlite3');app.SECRET='identity-test-secret';app.init_db()
  self.server=app.ThreadingHTTPServer(('127.0.0.1',0),app.Handler);self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
 def tearDown(self):self.server.shutdown();self.server.server_close();self.thread.join();self.temp.cleanup()
 def request(self,visitor,origin='https://mikeywa.site'):
  connection=http.client.HTTPConnection('127.0.0.1',self.server.server_port,timeout=3)
  connection.request('POST',app.BASE+'/api/identity',json.dumps({'visitor':visitor}),{'Origin':origin})
  response=connection.getresponse();data=json.loads(response.read());connection.close();return response.status,data
 def test_identity_matches_the_dashboard_and_does_not_record_a_view(self):
  visitor=str(uuid.uuid4());status,data=self.request(visitor);self.assertEqual(status,200);self.assertRegex(data['id'],r'^[A-Z0-9]{3}$');self.assertEqual(data['id'],app.public_ids([app.digest(visitor)])[app.digest(visitor)])
  with app.connect() as db:self.assertEqual(db.execute('SELECT COUNT(*) FROM events').fetchone()[0],0)
  app.collect({'id':str(uuid.uuid4()),'visitor':visitor,'session':str(uuid.uuid4()),'kind':'view','course':2})
  report=app.learning_report(7,search=data['id']);self.assertEqual(report['users'][0]['publicId'],data['id']);self.assertEqual(report['users'][0]['id'],app.digest(visitor));self.assertEqual(app.learner_detail(data['id'],7)['publicId'],data['id'])
 def test_invalid_and_cross_origin_identity_requests_are_rejected(self):
  self.assertEqual(self.request('not-an-id')[0],400)
  self.assertEqual(self.request(str(uuid.uuid4()),'https://evil.example')[0],403)

 def test_privacy_document_and_styles_are_public_without_authentication(self):
  for asset in ('privacy.html','privacy.css','feedback.js','privacy-id.js','privacy-modal.js'):
   connection=http.client.HTTPConnection('127.0.0.1',self.server.server_port,timeout=3);connection.request('GET',app.BASE+'/'+asset);response=connection.getresponse();self.assertEqual(response.status,200);self.assertTrue(response.read());connection.close()

 def test_short_codes_are_stable_unique_and_expand_only_after_three_characters_are_exhausted(self):
  visitors=[app.digest(str(uuid.uuid4())) for _ in range(40)]
  first=app.public_ids(visitors);self.assertEqual(first,app.public_ids(reversed(visitors)));self.assertEqual(len(set(first.values())),40)
  codes={app.support_code(i) for i in range(1,36**3+1)};self.assertEqual(len(codes),36**3);self.assertTrue(all(len(code)==3 for code in codes));self.assertEqual(len(app.support_code(36**3+1)),4)
 def test_parallel_identity_requests_never_assign_different_codes_to_one_visitor(self):
  from concurrent.futures import ThreadPoolExecutor
  visitor=app.digest(str(uuid.uuid4()))
  with ThreadPoolExecutor(max_workers=8) as pool:codes=list(pool.map(lambda _:app.public_ids([visitor])[visitor],range(24)))
  self.assertEqual(len(set(codes)),1)
