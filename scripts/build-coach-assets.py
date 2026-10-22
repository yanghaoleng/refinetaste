"""Derive display-sized WebP sprites and starry-eye app icons from source art."""
from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parents[1]
assets=root/'dist/assets'
for name,rows in [('chick-emotions',3),('chick-positive-emotions',2)]:
    with Image.open(assets/(name+'.png')) as source:
        source.convert('RGB').resize((576,96*rows),Image.Resampling.LANCZOS).save(assets/(name+'.webp'),'WEBP',quality=82,method=6)
with Image.open(assets/'chick-positive-emotions.png') as source:
    # Inspired / starry eyes: fifth cell in the first row, first of its two frames.
    cell=source.width//6
    face=source.crop((4*cell,0,5*cell,cell)).convert('RGB')
    for size,name in [(96,'chick-starry-96.webp'),(192,'chick-starry-192.webp')]:
        face.resize((size,size),Image.Resampling.LANCZOS).save(assets/name,'WEBP',quality=85,method=6)
    for size,name in [(32,'favicon-starry-32.png'),(180,'apple-touch-starry.png')]:
        face.resize((size,size),Image.Resampling.LANCZOS).save(assets/name,optimize=True)
    face.resize((64,64),Image.Resampling.LANCZOS).save(assets/'favicon-starry.ico',sizes=[(16,16),(32,32),(48,48),(64,64)])
# A matched logo/favicon pair for every coach emotion, using one frame per mood.
moods=['neutral','happy','thinking','curious','surprised','encouraging','empathetic','confused','playful','delighted','approving','inspired','relieved','grateful','amused']
icons=assets/'icons';icons.mkdir(exist_ok=True)
for index,mood in enumerate(moods):
    atlas='chick-emotions.png' if index<9 else 'chick-positive-emotions.png'
    offset=index if index<9 else index-9
    with Image.open(assets/atlas) as source:
        cell=source.width//6;x=offset%3*2*cell;y=offset//3*cell
        face=source.crop((x,y,x+cell,y+cell)).convert('RGB')
        face.resize((96,96),Image.Resampling.LANCZOS).save(icons/(mood+'-96.webp'),'WEBP',quality=82,method=6)
        face.resize((32,32),Image.Resampling.LANCZOS).save(icons/(mood+'-32.png'),optimize=True)
        face.resize((180,180),Image.Resampling.LANCZOS).save(icons/(mood+'-180.png'),optimize=True)
