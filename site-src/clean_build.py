"""Remove unreferenced legacy download files after a validated build. Back up first."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import json,re
ROOT=Path(__file__).resolve().parent.parent
manifest=json.loads((ROOT/'site-src/build-manifest.json').read_text())
keep=set(['robots.txt','sitemap.xml','redirects.json','404.html','README.md'])
keep.update(x['file'] for x in manifest['pages'].values())
keep.update(route.strip('/')+'/index.html' for route in manifest['redirects'])
keep.update(str(p.relative_to(ROOT)) for p in (ROOT/'assets').rglob('*') if p.is_file())
keep.update(str(p.relative_to(ROOT)) for p in (ROOT/'site-src').rglob('*') if p.is_file() and '__pycache__' not in str(p))
class P(HTMLParser):
 def handle_starttag(self,t,a):
  d=dict(a)
  for key in ['href','src','data-photo']:
   value=d.get(key,'')
   if value.startswith('/'):
    path=unquote(urlsplit(value).path).lstrip('/')
    if (ROOT/path).is_file():keep.add(path)
  for value in d.get('srcset','').split(','):
   if value.strip().startswith('/'):keep.add(value.strip().split()[0].lstrip('/'))
for item in manifest['pages'].values():
 parser=P();parser.feed((ROOT/item['file']).read_text())
for css in (ROOT/'assets').glob('*.css'):
 for ref in re.findall(r'url\([\'\"]?([^\)\'\"]+)',css.read_text()):
  if ref.startswith('/'):keep.add(ref.lstrip('/'))
removed=[]
for file in list((ROOT/'wp-content').rglob('*')):
 if file.is_file() and str(file.relative_to(ROOT)) not in keep:
  removed.append(str(file.relative_to(ROOT)));file.unlink()
for folder in sorted((p for p in (ROOT/'wp-content').rglob('*') if p.is_dir()),key=lambda p:len(p.parts),reverse=True):
 if not any(folder.iterdir()):folder.rmdir()
print('Removed',len(removed),'unreferenced legacy files; remaining',sum(p.is_file() for p in ROOT.rglob('*')))
