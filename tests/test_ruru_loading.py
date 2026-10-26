"""RURU's versioned assets, gzip negotiation and stable chapter compatibility."""
import gzip
import http.client
import json
import re
import threading
import unittest
import test_selfcare as selfcare_tests


class LoadingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        selfcare_tests.SelfcareTests.setUpClass.__func__(cls)
        cls.server=cls.app.ThreadingHTTPServer(('127.0.0.1',0),cls.app.Handler)
        cls.worker=threading.Thread(target=cls.server.serve_forever,daemon=True)
        cls.worker.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown();cls.server.server_close()
        selfcare_tests.SelfcareTests.tearDownClass.__func__(cls)

    def get(self,path,headers=None):
        con=http.client.HTTPConnection('127.0.0.1',self.server.server_port,timeout=3)
        con.request('GET',path,headers=headers or {})
        r=con.getresponse();data=r.read();con.close()
        return r.status,dict(r.getheaders()),data

    def test_compressed_sidecars_match_final_files(self):
        for p in (self.root/'dist').rglob('*.gz'):
            self.assertEqual(gzip.decompress(p.read_bytes()),p.with_suffix('').read_bytes(),str(p))

    def test_gzip_negotiation_and_conditional_cache(self):
        status,headers,data=self.get('/lifecoach/app.js',{'Accept-Encoding':'gzip'})
        self.assertEqual(status,200);self.assertEqual(headers.get('Content-Encoding'),'gzip')
        self.assertEqual(gzip.decompress(data),(self.root/'dist/app.js').read_bytes())
        for encoding in ('identity','gzip;q=0','br, gzip;q=0.000'):
            _,h,raw=self.get('/selfcare/app.js',{'Accept-Encoding':encoding})
            self.assertNotIn('Content-Encoding',h);self.assertEqual(raw,gzip.decompress(data))
        _,h,_=self.get('/selfcare/app.js',{'Accept-Encoding':'gzip;q=0.5'})
        self.assertEqual(h.get('Content-Encoding'),'gzip')
        status,h,raw=self.get('/lifecoach/app.js',{'If-None-Match':headers['ETag']})
        self.assertEqual(status,304);self.assertEqual(raw,b'')
        self.assertEqual(h['Vary'],'Accept-Encoding')

    def test_fingerprinted_chapters_are_complete_and_identical_on_both_paths(self):
        full=json.loads((self.root/'dist/course.json').read_text())
        manifest=json.loads((self.root/'dist/performance-manifest.json').read_text())
        recovered=[]
        for chapter,path in manifest['chapterFiles'].items():
            status,h,data=self.get('/lifecoach/'+path)
            self.assertEqual(status,200);self.assertIn('immutable',h['Cache-Control'])
            self.assertEqual(self.get('/selfcare/'+path)[2],data)
            shard=json.loads(data);self.assertEqual(shard['chapterId'],int(chapter))
            recovered.extend(shard['questions'])
        self.assertEqual(sorted(recovered,key=lambda q:q['id']),full['questions'])
        for base in ('/selfcare/','/lifecoach/'):
            self.assertEqual(self.get(base+'course.json')[2],(self.root/'dist/course.json').read_bytes())
            self.assertEqual(self.get(base)[1]['Cache-Control'],'no-cache')

    def test_preexisting_portrait_urls_stay_routable(self):
        for p in (self.root/'dist/assets').glob('xiaoman-*.webp'):
            self.assertEqual(self.get('/selfcare/assets/'+p.name)[0],200,p.name)

    def test_inline_symbols_cannot_shadow_interactive_ids(self):
        html=(self.root/'dist/index.html').read_text()
        ids=re.findall(r'<symbol id="([^"]+)"',html)
        self.assertTrue(ids);self.assertTrue(all(x.startswith('ruru-i-') for x in ids))
        self.assertNotIn('<symbol id="bookmark"',html)
        self.assertIn('href="#ruru-i-${name}"',(self.root/'dist/app.js').read_text())


if __name__=='__main__':unittest.main()
