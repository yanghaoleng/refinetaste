"""Downsize the two directional gazes, each with two frames, to a 96 px WebP sprite."""
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
source=Image.open(root/'design/chick-gaze/source.png').convert('RGB')
sprite=Image.new('RGB',(192,192))
for row in range(2):
 for col in range(2):
  tile=source.crop((round(col*source.width/2),round(row*source.height/2),round((col+1)*source.width/2),round((row+1)*source.height/2)))
  sprite.paste(tile.resize((96,96),Image.Resampling.LANCZOS),(col*96,row*96))
target=root/'dist/assets/chick-gaze.webp'
sprite.save(target,quality=84,method=6)
print(target.name,target.stat().st_size,'bytes')
