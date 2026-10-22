"""Resize the generated 3×2 face sheet into two-frame WebP and circular site icons."""
from pathlib import Path
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'dist/assets/chick-cool-expressions.png'
im=Image.open(source).convert('RGB')
# The generated sheet's row divider is at y=489; exclude its white bottom margin.
rows=[(0,489),(489,1006)]
frames=[]
for top,bottom in rows:
 frames.append([im.crop((round(x*im.width/3),top,round((x+1)*im.width/3),bottom)).resize((96,96),Image.Resampling.LANCZOS) for x in range(3)])
sprite=Image.new('RGB',(288,192))
for row in range(2):
 for col in range(3):sprite.paste(frames[row][col],(col*96,row*96))
sprite.save(ROOT/'dist/assets/chick-cool-expressions.webp',quality=84,method=6)
for col,mood in enumerate(['cool','confident','mischievous']):
 tile=im.crop((round(col*im.width/3),0,round((col+1)*im.width/3),489))
 for size,suffix in [(96,'96.webp'),(32,'32.png'),(180,'180.png')]:
  scale=4;image=tile.resize((size*scale,size*scale),Image.Resampling.LANCZOS).convert('RGBA');mask=Image.new('L',image.size,0);ImageDraw.Draw(mask).ellipse((1,1,image.width-2,image.height-2),fill=255);image.putalpha(mask);image=image.resize((size,size),Image.Resampling.LANCZOS)
  target=ROOT/'dist/assets/icons'/f'{mood}-{suffix}'
  if suffix.endswith('webp'):image.save(target,quality=86,method=6)
  else:image.save(target,optimize=True)
print('cool sprite bytes', (ROOT/'dist/assets/chick-cool-expressions.webp').stat().st_size)
