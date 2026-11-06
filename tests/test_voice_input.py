import http.client, json, threading, unittest, uuid
from pathlib import Path
from unittest.mock import patch
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'server'))
import app

class VoiceInputTests(unittest.TestCase):
 def setUp(self):
  self.origin=app.ORIGINS;self.secret=app.SECRET;app.ORIGINS={'https://test.example'};app.SECRET='test-only';app.voice_uploads.clear();app.voice_rates.clear();app.voice_daily.clear()
  self.server=app.ThreadingHTTPServer(('127.0.0.1',0),app.Handler);self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
 def tearDown(self):
  self.server.shutdown();self.server.server_close();self.thread.join();app.ORIGINS=self.origin;app.SECRET=self.secret
 def send(self,body,uid=None,seq=0,final=True,origin='https://test.example',content='audio/pcm'):
  conn=http.client.HTTPConnection('127.0.0.1',self.server.server_port,timeout=3)
  conn.request('POST','/refinetaste/api/voice',body,{'Origin':origin,'Content-Type':content,'X-Voice-Id':uid or str(uuid.uuid4()),'X-Voice-Sequence':str(seq),'X-Voice-Final':'1' if final else '0'})
  response=conn.getresponse();result=(response.status,json.loads(response.read()));conn.close();return result
 def test_chunks_are_assembled_transcribed_and_discarded(self):
  with patch.object(app.volc_asr,'transcribe_pcm',return_value='测试文字') as transcribe:
   uid=str(uuid.uuid4());self.assertEqual(self.send(b'\0'*96000,uid,final=False),(200,{'ok':True}));self.assertEqual(self.send(b'\1'*3200,uid,seq=1),(200,{'text':'测试文字'}));self.assertEqual(len(transcribe.call_args.args[0]),99200);self.assertFalse(app.voice_uploads)
 def test_rejects_invalid_origin_format_length_and_order(self):
  with patch.object(app.volc_asr,'transcribe_pcm') as transcribe:
   self.assertEqual(self.send(b'\0'*3200,origin='https://bad.example')[0],403);self.assertEqual(self.send(b'\0'*3200,content='application/json')[0],415);self.assertEqual(self.send(b'\0'*3198)[0],400);self.assertEqual(self.send(b'\0'*3200,seq=1)[0],400);transcribe.assert_not_called()
