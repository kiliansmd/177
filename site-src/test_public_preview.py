"""Verify the hosted PDF demo without sending mail or storing registrations."""
from pathlib import Path
from http.server import ThreadingHTTPServer
from http.client import HTTPConnection
from io import BytesIO
from pypdf import PdfReader
from unittest.mock import patch
import importlib.util, json, threading, unittest, uuid, os, base64
from test_membership import sample

spec=importlib.util.spec_from_file_location('public_preview',Path(__file__).resolve().parent.parent/'api/membership.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class HostedPreview(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.server=ThreadingHTTPServer(('127.0.0.1',0),module.handler)
  cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
 @classmethod
 def tearDownClass(cls):cls.server.shutdown();cls.server.server_close()
 def request(self,action,body=None,headers=None):
  conn=HTTPConnection('127.0.0.1',self.server.server_port)
  common={'Host':'demo.vercel.app','Origin':'https://demo.vercel.app','Content-Type':'application/json'};common.update(headers or {})
  conn.request('POST' if body is not None else 'GET','/api/membership?action='+action,json.dumps(body) if body is not None else None,common)
  result=conn.getresponse();raw=result.read();value=(result.status,dict(result.getheaders()),raw);conn.close();return value
 def config(self):
  code,headers,raw=self.request('config');self.assertEqual(code,200);config=json.loads(raw)
  self.assertEqual(config['delivery'],'browser');self.assertEqual(config['mode'],'preview');self.assertIn('Secure',headers['Set-Cookie'])
  return {'Cookie':headers['Set-Cookie'].split(';')[0],'X-CSRF-Token':config['csrf'],'Idempotency-Key':str(uuid.uuid4())}
 def test_complete_pdf_demo_and_no_persistent_backend(self):
  headers=self.config();body=sample();body['pricing']={'monthly':1}
  code,meta,raw=self.request('submit',body,headers);self.assertEqual(code,200)
  data=json.loads(raw);self.assertEqual(data['email_status'],'disabled');self.assertNotIn('pdf_url',data)
  pdf=base64.b64decode(data['pdf_base64']);pages=PdfReader(BytesIO(pdf)).pages;self.assertEqual(len(pages),2);self.assertIn('343,87',''.join(p.extract_text() for p in pages))
  self.assertIn('noindex',meta['X-Robots-Tag']);self.assertIn('no-store',meta['Cache-Control']);self.assertFalse(hasattr(module.APP,'db_path'))
  again=json.loads(self.request('submit',body,headers)[2]);self.assertEqual(data['id'],again['id'])
 def test_origin_and_csrf_rejected(self):
  headers=self.config()
  for extra in [{'Origin':'https://other.example'},{'X-CSRF-Token':'wrong'},{'Cookie':''}]:
   code,_,_=self.request('submit',sample(),{**headers,**extra});self.assertEqual(code,403)
 def test_service_and_validation(self):
  headers=self.config();body=sample();body['iban']='DE00';self.assertEqual(self.request('submit',body,headers)[0],422)
  service={'kind':'withdrawal','name':'Mara Beispiel','email':'mara@example.com','contract':'TEST-123'}
  self.assertEqual(self.request('service',service,headers)[0],200)
  self.assertEqual(self.request('missing')[0],404)
 def test_environment_cannot_activate_contracts(self):
  with patch.dict(os.environ,{'MEMBERSHIP_MODE':'live'}):
   app=module.PublicPreview();self.assertFalse(app.live);self.assertFalse(app.config['approved']);self.assertFalse(hasattr(app,'data'))

if __name__=='__main__':unittest.main(verbosity=2)
