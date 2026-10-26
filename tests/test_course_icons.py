"""Course recommendations must display without trusting another image origin."""
import base64,importlib.util,re,struct,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('course_links',ROOT/'scripts/link-academies.py');links=importlib.util.module_from_spec(spec);spec.loader.exec_module(links)
class CourseIconTests(unittest.TestCase):
 def test_every_course_panel_preserves_destinations_and_embeds_valid_pngs(self):
  for current,_,_ in links.SITES:
   panel=links.links(current)
   destinations=re.findall(r'<a href="([^"]+)"',panel)
   self.assertEqual(destinations,[url for key,_,url in links.SITES if key!=current])
   images=re.findall(r'<img[^>]+src="([^"]+)"',panel)
   self.assertEqual(len(images),len(destinations))
   for image in images:
    self.assertTrue(image.startswith('data:image/png;base64,'))
    raw=base64.b64decode(image.split(',',1)[1],validate=True)
    self.assertEqual(raw[:8],b'\x89PNG\r\n\x1a\n')
    self.assertEqual(struct.unpack('>II',raw[16:24]),(32,32))
