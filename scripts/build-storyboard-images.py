"""Crop original generated contact sheets and encode small production WebP frames."""
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
sheets=[('coffee-concepts.png',3,2,['cafe-wide','cafe-medium','coffee-cup','coffee-prepare','coffee-pour','cafe-door']),('lighthouse-concepts.png',3,1,['lighthouse-day','lighthouse-night','lighthouse-lit'])]
for source,columns,rows,names in sheets:
 im=Image.open(ROOT/'design/storyboard'/source).convert('RGB')
 for index,name in enumerate(names):
  x=index%columns;y=index//columns
  tile=im.crop((round(x*im.width/columns),round(y*im.height/rows),round((x+1)*im.width/columns),round((y+1)*im.height/rows)))
  tile.thumbnail((512,512),Image.Resampling.LANCZOS)
  target=ROOT/'dist/assets/storyboard'/f'{name}.webp';tile.save(target,quality=79,method=6)
  print(name,target.stat().st_size)
