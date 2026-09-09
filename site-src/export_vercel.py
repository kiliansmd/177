"""Build the website and export an explicit public allowlist for Vercel."""
from pathlib import Path
import json, os, shutil, subprocess, sys
ROOT = Path(__file__).resolve().parent.parent
host = os.environ.get('VERCEL_PROJECT_PRODUCTION_URL') or os.environ.get('VERCEL_URL')
if host and not os.environ.get('SITE_URL'):
    os.environ['SITE_URL'] = 'https://' + host
subprocess.run([sys.executable, str(ROOT/'site-src/build.py')], check=True)
public = ROOT/'public'
if public.exists():
    shutil.rmtree(public)
public.mkdir()
manifest = json.loads((ROOT/'site-src/build-manifest.json').read_text())
files = {p['file'] for p in manifest['pages'].values()}
files.update(route.strip('/')+'/index.html' for route in manifest['redirects'])
files.update(['index.html', '404.html', 'robots.txt', 'sitemap.xml', 'site.webmanifest'])
for rel in files:
    target = public/rel
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT/rel, target)
for folder in ['assets', 'wp-content']:
    shutil.copytree(ROOT/folder, public/folder)
assert not list(public.rglob('*.py'))
assert not list(public.rglob('*.json'))
print('Exported public website; backend source and private data excluded.')
