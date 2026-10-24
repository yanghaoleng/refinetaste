"""Package generated portrait cells as the existing runtime's bitmap assets. No drawn substitutes."""
import argparse,json,shutil
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'academy/identity'
MOODS=['neutral','happy','thinking','curious','surprised','encouraging','empathetic','confused','playful','delighted','approving','inspired','relieved','grateful','amused','cool','confident','mischievous']
def resize(image,size,padding=0):
 if slug=='selfcare' and padding==0:return image.resize((size,size),sampling)
 im=image.copy();im.thumbnail((size-padding*2,size-padding*2),sampling);out=Image.new('RGBA',(size,size));out.alpha_composite(im,((size-im.width)//2,(size-im.height)//2));return out
def circle_face(cell):
 # Fit the face itself to the circular UI, rather than shrinking the whole atlas cell.
 alpha=cell.getchannel('A');bounds=alpha.point(lambda a:255 if a>180 else 0).getbbox()
 if not bounds:raise ValueError('Empty portrait cell')
 x0,y0,x1,y1=bounds;cx=(x0+x1)/2;cy=(y0+y1)/2;side=max(x1-x0,y1-y0)
 circle=[(x,y) for y in range(96) for x in range(96) if (x-47.5)**2+(y-47.5)**2<=47**2]
 for factor in (1,.97,.94,.91,.88,.85,.82,.79,.76,.73,.70,.67,.64):
  extent=side*factor/2;crop=(round(cx-extent),round(cy-extent),round(cx+extent),round(cy+extent))
  portrait=cell.crop(crop).resize((96,96),Image.Resampling.LANCZOS)
  a=portrait.getchannel('A');coverage=sum(a.getpixel(point)>=240 for point in circle)/len(circle)
  if coverage>=.999:return portrait,crop,coverage
 raise ValueError('Portrait does not fill its circular avatar')
parser=argparse.ArgumentParser();parser.add_argument('--site',choices=['selfcare','philosophy','mediaclass']);args=parser.parse_args()
for slug,key in [('philosophy','wenwen'),('mediaclass','aying'),('selfcare','xiaoman')]:
 if args.site and slug!=args.site:continue
 sampling=Image.Resampling.LANCZOS if slug=='selfcare' else Image.Resampling.NEAREST
 version='v2' if slug=='selfcare' else 'v1'
 out=BASE/'compiled'/slug;icons=out/'icons';icons.mkdir(parents=True,exist_ok=True)
 source=Image.open(BASE/(key+'-expressions-'+version+'.png')).convert('RGBA');w,h=source.size;faces=[];cells=[]
 for i,mood in enumerate(MOODS):
  col,row=i%6,i//6;box=(round(col*w/6),round(row*h/3),round((col+1)*w/6),round((row+1)*h/3));cell=source.crop(box)
  if slug=='selfcare':
   face,crop,coverage=circle_face(cell);record=dict(mood=mood,sourceBox=box,faceCrop=crop,circleCoverage=round(coverage,5));icon_source=cell.crop(crop)
  else:face=resize(cell,96,5);record=dict(mood=mood,sourceBox=box);icon_source=cell
  faces.append(face);cells.append(record)
  face.save(icons/(mood+'-96.webp'),'WEBP',lossless=True,method=6)
  for size in (32,180):resize(icon_source,size,0 if slug=='selfcare' else max(2,round(size*.052))).save(icons/(mood+'-'+str(size)+'.png'),optimize=True)
 def atlas(name,cols,rows,items):
  sheet=Image.new('RGBA',(cols*96,rows*96))
  for index,(x,y) in items:sheet.alpha_composite(faces[index],(x*96,y*96))
  sheet.save(out/name,'WEBP',lossless=True,method=6)
 atlas('chick-emotions.webp',6,3,[(i,((i%3)*2+j,i//3)) for i in range(9) for j in (0,1)])
 atlas('chick-positive-emotions.webp',6,2,[(i,(((i-9)%3)*2+j,(i-9)//3)) for i in range(9,15) for j in (0,1)])
 atlas('chick-cool-expressions.webp',3,2,[(i,(i-15,j)) for i in range(15,18) for j in (0,1)])
 atlas('chick-gaze.webp',2,2,[(3,(x,y)) for x in range(2) for y in range(2)])
 hero=Image.open(BASE/(key+'-'+version+'.png'));hero.save(out/'mascot.png',optimize=True)
 inspired=faces[11];neutral=faces[0]
 for size in (96,192):resize(inspired,size).save(out/f'chick-starry-{size}.webp','WEBP',lossless=True,method=6)
 resize(inspired,32).save(out/'favicon-starry-32.png');resize(inspired,180).save(out/'apple-touch-starry.png');resize(inspired,64).save(out/'favicon-starry.ico',sizes=[(16,16),(32,32),(48,48),(64,64)])
 for name,size in [('chick-eyes-original.png',512),('chick-eyes-128.webp',128),('chick-eyes-512.webp',512),('apple-touch-icon.png',180),('favicon-32.png',32),('favicon.ico',64)]:
  icon=resize(neutral,size)
  if name.endswith('.webp'):icon.save(out/name,'WEBP',lossless=True,method=6)
  elif name.endswith('.ico'):icon.save(out/name,sizes=[(16,16),(32,32),(48,48),(64,64)])
  else:icon.save(out/name,optimize=True)
 (BASE/(key+'-asset-map.json')).write_text(json.dumps(dict(version=version,sourceSize=[w,h],grid=[6,3],cells=cells,packaged=str(out.relative_to(ROOT))),ensure_ascii=False,indent=2)+'\n')
 print(slug,'18 portraits, four runtime atlases, favicon set, transparent mascot')
