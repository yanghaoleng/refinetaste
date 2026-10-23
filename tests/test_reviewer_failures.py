"""Upstream failures remain diagnosable without logging learner content or secrets."""
import unittest,os,json,sys,socket
from pathlib import Path
from io import BytesIO
from urllib.error import HTTPError
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import reviewer

class FailureTests(unittest.TestCase):
 def setUp(self):
  self.env=patch.dict(os.environ,{'REFINETASTE_AI_KEY':'secret-test-key','REFINETASTE_AI_MODEL':'test'});self.env.start()
 def tearDown(self):self.env.stop()
 def response(self,payload,finish='stop'):
  return BytesIO(json.dumps({'choices':[{'message':{'content':json.dumps(payload)},'finish_reason':finish}]}).encode())
 def error(self,status,code):
  return HTTPError('https://example.invalid',status,'upstream',{'X-Request-Id':'test-reference'},BytesIO(json.dumps({'error':{'code':code,'message':'SECRET secret-test-key learner-private-text'}}).encode()))
 def run_chat(self):return reviewer.chat({'brief':'测试问题'},[{'role':'user','content':'learner-private-text'}],assess=True)
 def test_transient_error_retries_once_and_returns_the_actual_grade(self):
  response=self.response({'reply':'有依据的实际回答','correct':True})
  with patch.object(reviewer,'urlopen',side_effect=[self.error(503,'ServiceUnavailable'),response]) as call,patch.object(reviewer.time,'sleep'),self.assertLogs('refinetaste.ai') as logs:
   self.assertTrue(self.run_chat()['correct']);self.assertEqual(call.call_count,2)
  text=' '.join(logs.output);self.assertIn('status=503',text);self.assertNotIn('learner-private-text',text);self.assertNotIn('secret-test-key',text)
 def test_access_and_content_rejections_do_not_retry(self):
  for status,code,kind in [(401,'InvalidApiKey','auth'),(400,'SensitiveContentDetected','content'),(429,'InsufficientBalance','quota')]:
   with self.subTest(kind=kind),patch.object(reviewer,'urlopen',side_effect=self.error(status,code)) as call,self.assertLogs('refinetaste.ai'):
    with self.assertRaises(reviewer.ReviewUnavailable) as caught:self.run_chat()
    self.assertEqual(caught.exception.kind,kind);self.assertEqual(call.call_count,1);self.assertNotIn('SECRET',caught.exception.public_message)
 def test_incomplete_json_retries_but_never_invents_a_grade(self):
  with patch.object(reviewer,'urlopen',side_effect=[self.response({'reply':'partial'},'length'),self.response({'reply':'still missing grade'})]) as call,patch.object(reviewer.time,'sleep'),self.assertLogs('refinetaste.ai'):
   with self.assertRaises(reviewer.ReviewUnavailable) as caught:self.run_chat()
   self.assertEqual(caught.exception.kind,'invalid_response');self.assertEqual(call.call_count,2)
 def test_timeout_has_a_bounded_retry_and_specific_message(self):
  with patch.object(reviewer,'urlopen',side_effect=socket.timeout()) as call,patch.object(reviewer.time,'sleep'),self.assertLogs('refinetaste.ai'):
   with self.assertRaises(reviewer.ReviewUnavailable) as caught:self.run_chat()
   self.assertEqual(call.call_count,2);self.assertEqual(caught.exception.kind,'timeout');self.assertTrue(all(item.kwargs['timeout']==18 for item in call.call_args_list))
