"""Run locally in preview mode. SMTP is mocked; no message leaves the machine."""
import unittest,tempfile,os,json,uuid,sqlite3,hashlib,sys,smtplib
from pathlib import Path
from datetime import date,timedelta
from unittest.mock import patch,MagicMock
from io import BytesIO
from pypdf import PdfReader
from email import policy
from email.parser import BytesParser
from concurrent.futures import ThreadPoolExecutor
from urllib.request import Request,urlopen,build_opener,HTTPCookieProcessor
from urllib.error import HTTPError
from http.cookiejar import CookieJar
from membership_api import Membership,Invalid

def sample():
 return dict(plan='standard',first_name='Mara',last_name='Beispiel',email='mara@example.com',phone='',street='Teststraße 1',postcode='53359',city='Rheinbach',country='Deutschland',birthdate='2000-05-15',start_date=(date.today()+timedelta(days=20)).isoformat(),account_holder='Mara Beispiel',iban='DE89370400440532013000',sepa_consent=True,terms_consent=True,early_start_consent=False)

class Logic(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.env=patch.dict(os.environ,{'MEMBERSHIP_DATA_DIR':self.tmp.name,'MEMBERSHIP_MODE':'preview'});self.env.start();self.app=Membership()
 def tearDown(self):self.env.stop();self.tmp.cleanup()
 def test_prices_come_from_server(self):
  body=sample();body['pricing']={'monthly':1};d=self.app.validate(body);self.assertEqual(d['pricing']['monthly'],2699);self.assertEqual(d['pricing']['monthly']*12+d['pricing']['band'],34387)
 def test_invalid_iban_minor_and_consent(self):
  for field,value in [('iban','DE00000000000000000000'),('birthdate',date.today().isoformat()),('email','not-an-email'),('terms_consent',False)]:
   body=sample();body[field]=value
   with self.subTest(field=field),self.assertRaises(Invalid) as error:self.app.validate(body)
   self.assertIn(field,error.exception.fields)
 def test_early_start_requires_separate_choice(self):
  body=sample();body['start_date']=date.today().isoformat()
  with self.assertRaises(Invalid):self.app.validate(body)
  body['early_start_consent']=True;self.app.validate(body)
 def test_pdf_emails_encryption_and_duplicate(self):
  token='test-session';key=str(uuid.uuid4());body=sample();r=self.app.submit(body,token,key,'127.0.0.1');again=self.app.submit(body,token,key,'127.0.0.1');self.assertEqual(r,again)
  pdf=self.app.download(r['id'],token);pages=PdfReader(BytesIO(pdf)).pages;self.assertEqual(len(pages),2)
  text=''.join(p.extract_text() for p in pages);self.assertIn('343,87',text);self.assertIn('Mara Beispiel',text);self.assertNotIn(body['iban'],text)
  self.assertIsNone(self.app.download(r['id'],'wrong-session'))
  messages=list((Path(self.tmp.name)/'preview-outbox').glob('*.eml'));self.assertEqual(len(messages),2)
  for f in messages:
   m=BytesParser(policy=policy.default).parsebytes(f.read_bytes());attachments=list(m.iter_attachments());self.assertEqual(attachments[0].get_payload(decode=True),pdf)
  raw=self.app.db_path.read_bytes();self.assertNotIn(b'Mara',raw);self.assertNotIn(body['iban'].encode(),raw)
  changed=sample();changed['first_name']='Andere'
  with self.assertRaises(Invalid):self.app.submit(changed,token,key,'127.0.0.1')
 def test_parallel_double_click(self):
  key=str(uuid.uuid4())
  with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(lambda _:self.app.submit(sample(),'session',key,'127.0.0.1'),range(2)))
  self.assertEqual(results[0]['id'],results[1]['id'])
  with self.app.db() as db:self.assertEqual(db.execute('SELECT count(*) FROM records').fetchone()[0],1)
 def test_smtp_failure_and_retry_without_new_contract(self):
  result=self.app.submit(sample(),'session',str(uuid.uuid4()),'127.0.0.1')
  with self.app.db() as db:db.execute("UPDATE outbox SET status='pending'")
  self.app.live=True
  with patch.dict(os.environ,{'SMTP_HOST':'smtp.example.invalid','SMTP_USERNAME':'test','SMTP_PASSWORD':'test','SMTP_PORT':'587'}):
   with patch('membership_api.smtplib.SMTP',side_effect=OSError('simulated')):self.app.deliver(result['id'])
   self.assertEqual(self.app.result(result['id'])['email_status'],'pending')
   fake=MagicMock()
   with patch('membership_api.smtplib.SMTP',return_value=fake):self.app.deliver(result['id'])
   self.assertEqual(fake.sendmail.call_count,2);self.assertEqual(self.app.result(result['id'])['email_status'],'sent')
 def test_no_live_without_approved_configuration(self):
  with patch.dict(os.environ,{'MEMBERSHIP_MODE':'live'}),self.assertRaises(RuntimeError):Membership()
 def test_service_receipt(self):
  for kind in ['cancellation','withdrawal']:
   body={'kind':kind,'name':'Mara Beispiel','email':'mara@example.com','contract':'TEST-123','termination':'ordinary','end_date':'','reason':''}
   r=self.app.submit(body,'service',str(uuid.uuid4()),'127.0.0.1',service=True);text=PdfReader(BytesIO(self.app.download(r['id'],'service'))).pages[0].extract_text();self.assertIn('TEST-123',text)

class HTTP(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.jar=CookieJar();cls.client=build_opener(HTTPCookieProcessor(cls.jar));cls.origin='http://127.0.0.1:8766'
  cls.config=json.load(cls.client.open(cls.origin+'/api/membership/config'))
  if cls.config['mode']!='preview':raise unittest.SkipTest('HTTP tests run only in preview mode.')
 def request(self,path,body=None,headers=None,client=None):
  h={'Origin':self.origin,'Content-Type':'application/json','X-CSRF-Token':self.config['csrf'],'Idempotency-Key':str(uuid.uuid4())};h.update(headers or {})
  return (client or self.client).open(Request(self.origin+path,data=json.dumps(body).encode() if body is not None else None,headers=h))
 def test_origin_and_csrf(self):
  for header in [{'Origin':'https://untrusted.example'},{'X-CSRF-Token':'wrong'}]:
   with self.assertRaises(HTTPError) as e:self.request('/api/membership/submit',sample(),header)
   self.assertEqual(e.exception.code,403)
 def test_private_source_not_public(self):
  with self.assertRaises(HTTPError) as e:self.request('/site-src/membership-config.example.json')
  self.assertEqual(e.exception.code,404)
 def test_complete_starter_submission_and_private_download(self):
  body=sample();body['plan']='starter';key=str(uuid.uuid4());headers={'Idempotency-Key':key}
  result=json.load(self.request('/api/membership/submit',body,headers));again=json.load(self.request('/api/membership/submit',body,headers));self.assertEqual(result['id'],again['id'])
  response=self.request(result['pdf_url']);self.assertIn('no-store',response.headers['Cache-Control']);pdf=response.read();self.assertIn('56,98',''.join(p.extract_text() for p in PdfReader(BytesIO(pdf)).pages))
  with self.assertRaises(HTTPError) as e:self.request(result['pdf_url'],client=build_opener())
  self.assertEqual(e.exception.code,404)

if __name__=='__main__':unittest.main(verbosity=2)
