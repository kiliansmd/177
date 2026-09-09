#!/usr/bin/env python3
"""Local website and membership backend. Private data stays outside the webroot."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from http.cookies import SimpleCookie
from pathlib import Path
from urllib.parse import urlsplit, unquote
from datetime import datetime, timezone
import json, os, secrets
from membership_api import Membership, Invalid
ROOT=Path(__file__).resolve().parent.parent
APP=Membership()
ORIGIN=os.environ.get('PUBLIC_ORIGIN','http://127.0.0.1:8766').rstrip('/')
if APP.live and not ORIGIN.startswith('https://'):raise RuntimeError('Live registration requires an HTTPS PUBLIC_ORIGIN.')
class Preview(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def end_headers(self):
  if not APP.live:self.send_header('X-Robots-Tag','noindex, nofollow')
  self.send_header('X-Content-Type-Options','nosniff');self.send_header('Referrer-Policy','no-referrer')
  if self.path.startswith('/api/'):
   self.send_header('Cache-Control','no-store, private');self.send_header('X-Frame-Options','DENY')
  super().end_headers()
 def session(self):
  cookie=SimpleCookie()
  try:cookie.load(self.headers.get('Cookie',''))
  except Exception:pass
  token=cookie['gym_session'].value if 'gym_session' in cookie else ''
  return APP.session(token)
 def json(self,status,body,cookie=None):
  encoded=json.dumps(body,ensure_ascii=False).encode();self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(encoded)))
  if cookie:self.send_header('Set-Cookie','gym_session='+cookie+'; Path=/api/membership; HttpOnly; SameSite=Strict; Max-Age=14400'+('; Secure' if APP.live else ''))
  self.end_headers();self.wfile.write(encoded)
 def pdf(self,body,filename='Performance-Gym.pdf'):
  self.send_response(200);self.send_header('Content-Type','application/pdf');self.send_header('Content-Disposition','attachment; filename="'+filename+'"');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
 def do_POST(self):
  route=urlsplit(self.path).path
  if route not in ['/api/membership/preview','/api/membership/submit','/api/membership/service']:self.json(404,{'error':'Nicht gefunden.'});return
  allowed={ORIGIN} if APP.live else {ORIGIN,'http://localhost:8766'}
  if self.headers.get('Origin') not in allowed:self.json(403,{'error':'Anfrageursprung nicht erlaubt.'});return
  token,session=self.session()
  if not secrets.compare_digest(self.headers.get('X-CSRF-Token',''),session['csrf']):self.json(403,{'error':'Deine Sitzung ist abgelaufen. Bitte lade die Seite neu.'});return
  try:
   length=int(self.headers.get('Content-Length','0'))
   if length<=0 or length>32768:self.json(413,{'error':'Die Anfrage ist zu groß.'});return
   if self.headers.get('Content-Type','').split(';')[0]!='application/json':self.json(415,{'error':'JSON erwartet.'});return
   body=json.loads(self.rfile.read(length))
   if route.endswith('/preview'):
    data=APP.validate(body,consents=False);self.pdf(APP.pdf(data,'VORSCHAU',datetime.now(timezone.utc).isoformat(timespec='seconds'),draft=True),'Performance-Gym-Vertragsvorschau.pdf');return
   result=APP.submit(body,token,self.headers.get('Idempotency-Key',''),self.client_address[0],service=route.endswith('/service'));self.json(200,result)
  except Invalid as e:self.json(422,{'error':str(e),'fields':e.fields})
  except (json.JSONDecodeError,ValueError,TypeError):self.json(400,{'error':'Ungültige Anfrage.'})
  except Exception:self.json(500,{'error':'Die Anfrage konnte nicht abgeschlossen werden. Bitte erneut versuchen. Eine bereits gespeicherte Anmeldung wird dabei nicht doppelt angelegt.'})
 def do_GET(self):
  request=urlsplit(self.path);route=unquote(request.path)
  if route=='/api/membership/config':
   token,session=self.session();self.json(200,APP.public(session['csrf']),token);return
  if route.startswith('/api/membership/pdf/'):
   token,_=self.session();record_id=route.rsplit('/',1)[-1];body=APP.download(record_id,token)
   if body:self.pdf(body,'Performance-Gym-'+record_id+'.pdf')
   else:self.json(404,{'error':'Dokument für diese Sitzung nicht verfügbar.'})
   return
  if route.startswith('/api/membership/document/'):
   key=route.rsplit('/',1)[-1]
   if key in ['contract_terms_pdf','withdrawal_pdf'] and APP.config.get(key) and Path(APP.config[key]).is_file():self.pdf(Path(APP.config[key]).read_bytes(),key+'.pdf')
   else:self.json(404,{'error':'Die freigegebenen Unterlagen liegen noch nicht vor.'})
   return
  if route.startswith('/api/'):self.json(404,{'error':'Nicht gefunden.'});return
  target=(ROOT/route.lstrip('/')).resolve()
  if not target.is_relative_to(ROOT) or any(part.startswith('.') for part in target.relative_to(ROOT).parts) or (target.relative_to(ROOT).parts and target.relative_to(ROOT).parts[0]=='site-src') or route=='/redirects.json':self.send_error(404);return
  normalized=route[:-10] if route.endswith('index.html') else route
  if not normalized.endswith('/'):normalized+='/'
  redirects=json.loads((ROOT/'redirects.json').read_text())
  if normalized in redirects:
   self.send_response(301);self.send_header('Location',redirects[normalized]+('?' + request.query if request.query else ''));self.end_headers();return
  if not target.exists():
   body=(ROOT/'404.html').read_bytes();self.send_response(404);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body);return
  super().do_GET()
 def do_HEAD(self):
  if self.path.startswith(('/api/','/site-src/')):self.send_error(405);return
  super().do_HEAD()
 def list_directory(self,path):self.send_error(404)
if __name__=='__main__':
 print('Preview ready: http://127.0.0.1:8766/ | Membership: '+('LIVE' if APP.live else 'PREVIEW'),flush=True)
 ThreadingHTTPServer(('127.0.0.1',8766),Preview).serve_forever()
