import unittest,tempfile,time,uuid,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import app

def uid():return str(uuid.uuid4())
class BookmarkTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();app.DB=str(Path(self.tmp.name)/'bookmarks.sqlite3');app.SECRET='bookmarks-test-secret-longer-than-thirty-two-characters';app.init_db();self.visitor=uid();self.session=uid();self.now=time.time();app.collect(dict(id=uid(),visitor=self.visitor,session=self.session,kind='view',course=2),self.now)
 def tearDown(self):self.tmp.cleanup()
 def save(self,questions):app.save_bookmarks(dict(visitor=self.visitor,session=self.session,questions=questions),self.now)
 def test_snapshot_deduplicates_questions_and_cancellation_removes_counts(self):
  self.save([0,0,6]);self.save([0,0,6]);report=app.learning_report(7,now=self.now);self.assertEqual(report['users'][0]['bookmarks'],2);self.assertEqual(report['questions'][0]['bookmarks'],1)
  d=app.learner_detail(app.digest(self.visitor),7,now=self.now);self.assertEqual({q['id'] for q in d['bookmarkedQuestions']},{0,6})
  self.save([6]);self.assertEqual(app.learning_report(7,now=self.now)['questions'][0]['bookmarks'],0)
  self.save([]);self.assertEqual(app.bookmark_detail(app.digest(self.visitor))['bookmarks'],0)
 def test_unsynced_is_distinct_from_empty_and_state_is_isolated(self):
  self.assertIsNone(app.bookmark_detail(app.digest(self.visitor))['bookmarks']);self.save([0]);self.assertIsNone(app.bookmark_detail(app.digest(uid()))['bookmarks'])
  with self.assertRaises(ValueError):self.save([True])
  with self.assertRaises(ValueError):self.save([100000])
 def test_question_detail_includes_current_count_even_in_a_different_period(self):
  self.save([0]);self.assertEqual(app.question_detail(0,7,self.now)['bookmarks'],1)
if __name__=='__main__':unittest.main()
