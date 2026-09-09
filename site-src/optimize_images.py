"""Encode responsive copies of existing photographs; no crops or invented imagery."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote
from PIL import Image, ImageOps
import hashlib,json
ROOT=Path(__file__).resolve().parent.parent
DATA=Path(__file__).resolve().parent
manifest=json.loads((DATA/'build-manifest.json').read_text())
source=Path(json.loads((DATA/'assets.json').read_text())['source_root'])
paths=set()
class P(HTMLParser):
 def handle_starttag(self,t,a):
  d=dict(a)
  for key in ['src','data-photo']:
   value=d.get(key,'')
   if value.startswith('/wp-content/uploads/') and any(value.lower().endswith(x) for x in ['.jpg','.jpeg','.png']):paths.add(unquote(value.lstrip('/')))
for item in manifest['pages'].values():
 parser=P();parser.feed((ROOT/item['file']).read_text())
out=ROOT/'assets/images';out.mkdir(exist_ok=True)
result={};before=after=0
for rel in sorted(paths):
 if 'logo' in rel.lower():continue
 file=source/rel
 if not file.exists():continue
 with Image.open(file) as src:
  image=ImageOps.exif_transpose(src).convert('RGBA' if 'A' in src.getbands() else 'RGB')
  w,h=image.size;variants=[]
  for target in sorted(set([min(480,w),min(1000,w)])):
   copy=image.copy();copy.thumbnail((target,round(target*h/w)),Image.Resampling.LANCZOS)
   key=hashlib.sha256(rel.encode()).hexdigest()[:10]
   name=f'{file.stem[:36]}-{key}-{copy.width}.webp';dest=out/name
   copy.save(dest,'WEBP',quality=82,method=6)
   variants.append({'path':'assets/images/'+name,'width':copy.width,'height':copy.height,'bytes':dest.stat().st_size})
  result[rel]={'path':variants[-1]['path'],'width':variants[-1]['width'],'height':variants[-1]['height'],'variants':variants,'original_bytes':file.stat().st_size}
  before+=file.stat().st_size;after+=variants[-1]['bytes']
(DATA/'image-map.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps({'optimized_photographs':len(result),'original_bytes':before,'largest_webp_bytes':after,'reduction_percent':round((1-after/before)*100,1)}))
