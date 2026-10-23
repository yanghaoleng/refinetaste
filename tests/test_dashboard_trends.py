import unittest,tempfile,time,uuid,sys
from pathlib import Path
from datetime import datetime,timedelta
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import app

def uid():return str(uuid.uuid4())
class DashboardTrendTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();app.DB=str(Path(self.tmp.name)/'trends.sqlite3');app.SECRET='trends-unit-test-secret-more-than-thirty-two-characters';app.init_db();self.now=datetime(2026,10,23,12,tzinfo=app.ZONE).timestamp()
 def tearDown(self):self.tmp.cleanup()
 def at(self,days,hour=12):return datetime(2026,10,23,hour,tzinfo=app.ZONE).timestamp()+days*86400
 def event(self,visitor,day,kind='view',run=None,**extra):
  app.collect(dict(id=uid(),visitor=visitor,session=visitor,run=run,kind=kind,course=2,**extra),self.at(day))
 def test_daily_retention_uses_first_seen_cohort_and_waits_for_full_next_day(self):
  a,b,c,d=uid(),uid(),uid(),uid()
  self.event(a,-5);self.event(a,-4);self.event(a,-4);self.event(b,-4);self.event(b,-3);self.event(c,-3);self.event(d,-1);self.event(d,0)
  rows={r['day']:r for r in app.daily_trends(7,self.now)['days']}
  first=rows['2026-10-18'];self.assertEqual((first['retention'],first['cohort'],first['returned']),(100,1,1))
  second=rows['2026-10-19'];self.assertEqual((second['views'],second['users'],second['retention'],second['cohort']),(3,2,100,1))
  self.assertEqual(rows['2026-10-20']['retention'],0)
  self.assertIsNone(rows['2026-10-22']['retention']);self.assertFalse(rows['2026-10-22']['retentionMature'])
  self.assertIsNone(rows['2026-10-23']['retention'])
 def test_depth_deduplicates_same_question_and_includes_non_answering_visitors(self):
  a,b=uid(),uid();self.event(a,-3);self.event(b,-3)
  for _ in range(2):
   run=uid();self.event(a,-3,'start',run=run,start=0);self.event(a,-3,'answer',run=run,q=0,choice=1)
  run=uid();self.event(a,-3,'start',run=run,start=0);self.event(a,-3,'answer',run=run,q=6,choice=-1)
  row=next(r for r in app.daily_trends(7,self.now)['days'] if r['day']=='2026-10-20')
  self.assertEqual((row['uniqueAnswers'],row['users'],row['depth']),(2,2,1))
  self.assertEqual((row['correct'],row['graded'],row['accuracy']),(2,2,100))
 def test_first_seen_precedes_selected_range_and_missing_days_are_not_fabricated(self):
  visitor=uid();self.event(visitor,-10);self.event(visitor,-3)
  trend=app.daily_trends(7,self.now);day=next(r for r in trend['days'] if r['day']=='2026-10-20')
  self.assertEqual(day['cohort'],0)
  self.assertIsNone(day['retention'])
  all_data=app.learning_report('all',now=self.now)
  self.assertEqual(all_data['trend']['from'],'2026-10-13');self.assertEqual(len(all_data['trend']['days']),11)
  self.assertEqual(len(app.daily_trends(30,self.now)['days']),30)
  absent=app.daily_trends(30,self.now)['days'][0];self.assertFalse(absent['covered']);self.assertIsNone(absent['views']);self.assertIsNone(absent['users'])
 def test_message_only_submission_counts_activity_and_depth_without_inventing_a_grade(self):
  visitor,session,thread=uid(),uid(),uid()
  app.save_conversation(dict(visitor=visitor,session=session,thread=thread,q=6,messages=[dict(id=uid(),position=0,role='user',content='我会先突出活动名称。')]),self.at(-2))
  row=next(r for r in app.daily_trends(7,self.now)['days'] if r['day']=='2026-10-21')
  self.assertEqual((row['users'],row['views'],row['depth']),(1,0,1));self.assertIsNone(row['accuracy'])
 def test_empty_all_range_has_one_unobserved_day_and_no_fake_ratios(self):
  trend=app.daily_trends('all',self.now);self.assertEqual(len(trend['days']),1);self.assertIsNone(trend['availableFrom'])
  row=trend['days'][0];self.assertFalse(row['covered']);self.assertIsNone(row['accuracy']);self.assertIsNone(row['depth']);self.assertIsNone(row['retention'])
if __name__=='__main__':unittest.main()
