"""Membership API: validated pricing, encrypted records, PDF and durable mail outbox.

Preview is the default. Live mode requires an approved configuration, legal PDFs,
SMTP credentials and a persistent encryption key. No secret is sent to the client.
"""
from pathlib import Path
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from io import BytesIO
from email.message import EmailMessage
from email.policy import SMTP
from email.utils import format_datetime, make_msgid
from xml.sax.saxutils import escape
import hashlib, json, os, re, secrets, smtplib, sqlite3, ssl, threading
import reportlab
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.utils import ImageReader
from brand_assets import logo_png
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from cryptography.fernet import Fernet
from pypdf import PdfReader, PdfWriter

ROOT=Path(__file__).resolve().parent.parent
COMPANY='17/7 performance-gym Fitness GmbH Rheinbach'
ADDRESS='Industriestraße 32, 53359 Rheinbach'
EMAIL=re.compile(r'^[A-Za-z0-9.!#$%&\x27*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$')
LOCK=threading.RLock()
MAIL_LOCK=threading.Lock()
FONT_DIR=Path(reportlab.__file__).parent/'fonts'
pdfmetrics.registerFont(TTFont('Gym',str(FONT_DIR/'Vera.ttf')))
pdfmetrics.registerFont(TTFont('GymBold',str(FONT_DIR/'VeraBd.ttf')))
pdfmetrics.registerFontFamily('Gym',normal='Gym',bold='GymBold')

class Invalid(ValueError):
 def __init__(self,fields):self.fields=fields;super().__init__('Bitte prüfe die markierten Angaben.')

def money(cents):return f'{cents/100:,.2f}'.replace(',','_').replace('.',',').replace('_','.')+' €'
def clean(value,limit=200):
 if not isinstance(value,str):return ''
 return re.sub(r'[\x00-\x1f\x7f]',' ',value).strip()[:limit]
def valid_iban(value):
 if not re.fullmatch(r'[A-Z]{2}\d{2}[A-Z0-9]{11,30}',value):return False
 lengths={'DE':22,'AT':20,'BE':16,'BG':22,'CH':21,'CY':28,'CZ':24,'DK':18,'EE':20,'ES':24,'FI':18,'FR':27,'GB':22,'GR':27,'HR':21,'HU':28,'IE':22,'IS':26,'IT':27,'LI':21,'LT':20,'LU':20,'LV':21,'MC':27,'MT':31,'NL':18,'NO':15,'PL':28,'PT':25,'RO':24,'SE':24,'SI':19,'SK':24,'SM':27}
 if value[:2] not in lengths or len(value)!=lengths[value[:2]]:return False
 digits=''.join(str(ord(c)-55) if c.isalpha() else c for c in value[4:]+value[:4])
 return int(digits)%97==1

class Membership:
 def __init__(self):
  self.live=os.environ.get('MEMBERSHIP_MODE','preview')=='live'
  self.config=json.loads(Path(os.environ.get('MEMBERSHIP_CONFIG',ROOT/'site-src/membership-config.example.json')).read_text())
  self.data=Path(os.environ.get('MEMBERSHIP_DATA_DIR',ROOT.parent.parent/'work/membership-runtime')).resolve()
  if self.data==ROOT or ROOT in self.data.parents:raise RuntimeError('Membership data must be outside the public website directory.')
  self.data.mkdir(parents=True,exist_ok=True,mode=0o700);self.data.chmod(0o700)
  key=os.environ.get('MEMBERSHIP_ENCRYPTION_KEY')
  if not key and self.live:raise RuntimeError('Persistent MEMBERSHIP_ENCRYPTION_KEY required for live operation.')
  keyfile=self.data/'preview.key'
  if not key:
   if not keyfile.exists():keyfile.write_bytes(Fernet.generate_key());keyfile.chmod(0o600)
   key=keyfile.read_bytes()
  self.crypto=Fernet(key)
  self.db_path=self.data/'memberships.sqlite3'
  with self.db() as db:
   db.executescript('''CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY, session TEXT, idem TEXT, fingerprint TEXT, created TEXT, kind TEXT, payload BLOB, pdf BLOB, UNIQUE(session,idem));
CREATE TABLE IF NOT EXISTS outbox(id INTEGER PRIMARY KEY, record_id TEXT, channel TEXT, message BLOB, status TEXT, attempts INTEGER DEFAULT 0, UNIQUE(record_id,channel));''')
  self.db_path.chmod(0o600)
  facts=json.loads((ROOT/'site-src/content.json').read_text())['facts']['membership_plans']
  self.plans={p['id']:{'id':p['id'],'name':p['label'],'monthly':int(Decimal(p['monthly_eur'])*100),'months':p['term_months'],'band':1999} for p in facts[:2]}
  self.sessions={};self.rate={}
  required=['terms_version','contract_terms_pdf','withdrawal_pdf','creditor_id','sepa_text','early_start_text','billing_notice','notice_standard','notice_starter','renewal_standard','renewal_starter','sender_email','studio_email']
  self.missing=[k for k in required if not self.config.get(k)]
  if not self.config.get('approved'):self.missing.append('approved')
  for k in ['contract_terms_pdf','withdrawal_pdf']:
   if self.config.get(k) and not Path(self.config[k]).is_file():self.missing.append(k+'_file')
  for k in ['SMTP_HOST','SMTP_USERNAME','SMTP_PASSWORD']:
   if not os.environ.get(k):self.missing.append(k)
  for k in ['sender_email','studio_email']:
   if self.config.get(k) and not EMAIL.fullmatch(self.config[k]):self.missing.append(k+'_invalid')
  if self.live and self.missing:raise RuntimeError('Live configuration incomplete: '+', '.join(self.missing))
 def db(self):
  db=sqlite3.connect(self.db_path,timeout=20);db.row_factory=sqlite3.Row;return db
 def seal(self,value):return self.crypto.encrypt(value if isinstance(value,bytes) else json.dumps(value,ensure_ascii=False).encode())
 def session(self,cookie):
  with LOCK:
   now=datetime.now(timezone.utc)
   self.sessions={k:v for k,v in self.sessions.items() if v['expires']>now}
   if cookie in self.sessions:return cookie,self.sessions[cookie]
   token=secrets.token_urlsafe(32);data={'csrf':secrets.token_urlsafe(32),'expires':now+timedelta(hours=4)};self.sessions[token]=data
   return token,data
 def public(self,csrf):
  plans=[]
  for key,p in self.plans.items():
   plans.append({**p,'minimum':p['monthly']*p['months']+p['band'],'notice':self.config.get('notice_'+key) or 'Kündigungsfrist wird mit den freigegebenen Vertragsbedingungen ergänzt.','renewal':self.config.get('renewal_'+key) or 'Regelung nach der Erstlaufzeit noch nicht freigegeben.'})
  return {'mode':'live' if self.live else 'preview','csrf':csrf,'plans':plans,'today':date.today().isoformat(),'latest_start':(date.today()+timedelta(days=180)).isoformat(),'company':COMPANY,'creditor_id':self.config.get('creditor_id') or 'Wird vom Studio ergänzt','sepa_text':self.config.get('sepa_text') or 'Nur Testmandat: Im Livebetrieb steht hier das freigegebene SEPA-Lastschriftmandat mit Gläubiger-ID. Es wird in dieser Vorschau keine Einzugsermächtigung erteilt.','early_start_text':self.config.get('early_start_text') or 'Nur Test: Ich möchte vor Ablauf der Widerrufsfrist starten. Der verbindliche Hinweis zu einem vorzeitigen Leistungsbeginn wird vom Studio freigegeben.','billing_notice':self.config.get('billing_notice') or 'Abbuchungstermin und Vertragsfortsetzung werden vor dem Livegang vom Studio freigegeben.','terms_version':self.config.get('terms_version') or 'VORSCHAU','documents':[k for k in ['contract_terms_pdf','withdrawal_pdf'] if self.config.get(k) and Path(self.config[k]).is_file()]}
 def validate(self,body,consents=True):
  if not isinstance(body,dict):raise Invalid({'form':'Ungültige Anfrage.'})
  errors={};data={k:clean(body.get(k,''),400 if k=='street' else 150) for k in ['plan','first_name','last_name','email','phone','street','postcode','city','country','birthdate','start_date','account_holder','iban']}
  for k in ['first_name','last_name','email','street','postcode','city','country','birthdate','start_date','account_holder','iban']:
   if not data[k]:errors[k]='Bitte ausfüllen.'
  if data['plan'] not in self.plans:errors['plan']='Bitte Standard oder Starter wählen.'
  if not EMAIL.fullmatch(data['email']):errors['email']='Bitte eine gültige E-Mail-Adresse eintragen.'
  for k in ['birthdate','start_date']:
   try:date.fromisoformat(data[k])
   except ValueError:errors[k]='Bitte ein gültiges Datum wählen.'
  if 'birthdate' not in errors:
   born=date.fromisoformat(data['birthdate']);today=date.today();age=today.year-born.year-((today.month,today.day)<(born.month,born.day))
   if age<18 or age>110:errors['birthdate']='Die Online-Anmeldung ist ab 18 möglich. Unter 18 helfen wir dir persönlich im Studio.'
  if 'start_date' not in errors:
   start=date.fromisoformat(data['start_date'])
   if not date.today()<=start<=date.today()+timedelta(days=180):errors['start_date']='Bitte einen Start innerhalb der nächsten 180 Tage wählen.'
  data['iban']=re.sub(r'\s','',data['iban']).upper()
  if not valid_iban(data['iban']):errors['iban']='Die IBAN ist nicht gültig. Bitte prüfe die Eingabe.'
  if body.get('website'):errors['form']='Die Anfrage konnte nicht verarbeitet werden.'
  data['consents']={k:body.get(k) is True for k in ['sepa_consent','terms_consent','early_start_consent']}
  if consents:
   for k in ['sepa_consent','terms_consent']:
    if not data['consents'][k]:errors[k]='Bitte ausdrücklich bestätigen.'
   if 'start_date' not in errors and start<date.today()+timedelta(days=14) and not data['consents']['early_start_consent']:errors['early_start_consent']='Bitte den gewünschten vorzeitigen Start bestätigen oder einen späteren Termin wählen.'
  if errors:raise Invalid(errors)
  data['terms_version']=self.config.get('terms_version') or 'VORSCHAU';data['mode']='live' if self.live else 'preview'
  data['pricing']=self.plans[data['plan']];return data
 def validate_service(self,body):
  if not isinstance(body,dict):raise Invalid({'form':'Ungültige Anfrage.'})
  data={k:clean(body.get(k,''),2000 if k=='reason' else 200) for k in ['name','email','contract','kind','termination','end_date','reason']};errors={}
  for k in ['name','email','contract']:
   if not data[k]:errors[k]='Bitte ausfüllen.'
  if not EMAIL.fullmatch(data['email']):errors['email']='Bitte eine gültige E-Mail-Adresse eintragen.'
  if data['kind'] not in ['cancellation','withdrawal']:errors['kind']='Ungültige Erklärung.'
  if data['kind']=='cancellation':
   if data['termination'] not in ['ordinary','extraordinary']:errors['termination']='Bitte Kündigungsart wählen.'
   if data['termination']=='extraordinary' and not data['reason']:errors['reason']='Bitte Kündigungsgrund angeben.'
   if data['end_date']:
    try:date.fromisoformat(data['end_date'])
    except ValueError:errors['end_date']='Ungültiges Datum.'
  if errors:raise Invalid(errors)
  data['mode']='live' if self.live else 'preview';return data
 def pdf(self,data,record_id,created,kind='membership',draft=False):
  output=BytesIO();styles={
   'title':ParagraphStyle('title',fontName='GymBold',fontSize=25,leading=29,spaceAfter=18,textColor=HexColor('#161715')),
   'h':ParagraphStyle('h',fontName='GymBold',fontSize=12,leading=18,spaceBefore=16,spaceAfter=8),
   'p':ParagraphStyle('p',fontName='Gym',fontSize=9,leading=14,spaceAfter=7),
   'small':ParagraphStyle('small',fontName='Gym',fontSize=8,leading=12,textColor=HexColor('#555555'),spaceAfter=7)}
  def para(text,style='p'):return Paragraph(escape(str(text)).replace('\n','<br/>'),styles[style])
  def table(rows):
   t=Table([[para(a,'small'),para(b)] for a,b in rows],colWidths=[158,341],hAlign='LEFT')
   t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('BACKGROUND',(0,0),(-1,-1),HexColor('#f3f2ea')),('LINEBELOW',(0,0),(-1,-1),.5,HexColor('#d7d8d1')),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),('LEFTPADDING',(0,0),(-1,-1),10)]));return t
  def decorate(c,doc):
   c.setFillColor(HexColor('#161715'));c.rect(0,770,595.28,72,fill=1,stroke=0)
   c.drawImage(ImageReader(BytesIO(logo_png())),48,780,width=160,height=160*726/2167,mask='auto')
   c.setFillColor(HexColor('#666666'));c.setFont('Gym',7);c.drawString(48,30,record_id+'  |  '+('VORSCHAU - KEIN VERTRAG' if not self.live or draft else 'Vertragsunterlagen'));c.drawRightString(547,30,str(doc.page))
  preview=not self.live or draft
  title=('Vertragsvorschau' if preview else 'Deine Mitgliedschaft') if kind=='membership' else ('Kündigung' if kind=='cancellation' else 'Widerruf')+' - Eingangsbestätigung'
  story=[para(title,'title'),para('VORSCHAU: Kein verbindlicher Vertrag, keine Abbuchung und kein externer E-Mail-Versand.' if not self.live else ('Entwurf zur Prüfung vor deiner Bestellung.' if draft else 'Diese Unterlagen bestätigen deine digital abgegebene Erklärung.')),
   table([('Vorgangsnummer',record_id),('Erstellt am',created),('Studio',COMPANY+'\n'+ADDRESS)])]
  if kind=='membership':
   p=data['pricing'];story += [para('01  Deine Mitgliedschaft','h'),table([('Tarif',p['name']),('Trainingsbeginn',data['start_date']),('Erstlaufzeit',str(p['months'])+' Monat(e)'),('Monatsbeitrag',money(p['monthly'])),('E-Band, einmalig',money(p['band'])),('Aufnahmegebühr',money(0)),('Mindestbetrag der Erstlaufzeit',money(p['monthly']*p['months']+p['band'])),('Kündigung',self.config.get('notice_'+p['id']) or 'Noch nicht freigegeben; diese Vorschau ist kein verbindliches Angebot.'),('Nach der Erstlaufzeit',self.config.get('renewal_'+p['id']) or 'Noch nicht freigegeben.')]),para('02  Deine Angaben','h'),table([('Mitglied',data['first_name']+' '+data['last_name']),('Geburtsdatum',data['birthdate']),('Anschrift',data['street']+'\n'+data['postcode']+' '+data['city']+'\n'+data['country']),('E-Mail',data['email']),('Telefon',data['phone'] or 'Nicht angegeben')]),PageBreak(),para('Zahlung & Erklärungen','title'),para('03  SEPA-Lastschrift','h'),table([('Kontoinhaber',data['account_holder']),('IBAN',data['iban'][:4]+' •••• •••• •••• '+data['iban'][-4:]),('Gläubiger',COMPANY),('Gläubiger-ID',self.config.get('creditor_id') or 'Noch nicht freigegeben'),('Mandatsreferenz',record_id),('Abbuchung',self.config.get('billing_notice') or 'Noch nicht freigegeben.')]),para(self.config.get('sepa_text') or 'Testmandat. Eine rechtswirksame SEPA-Einzugsermächtigung wird mit dieser Vorschau nicht erteilt.'),para('04  Dokumentierte Bestätigungen','h')]
   for key,label in [('sepa_consent','SEPA-Mandat'),('terms_consent','Vertragsbedingungen und Widerrufsinformation'),('early_start_consent','Gewünschter vorzeitiger Leistungsbeginn')]:story.append(para(label+': '+('bestätigt' if data['consents'][key] else 'nicht bestätigt / nicht erforderlich')))
   if data['consents']['early_start_consent']:story.append(para(self.config.get('early_start_text') or 'Der verbindliche Hinweis zum vorzeitigen Leistungsbeginn ist noch nicht freigegeben.'))
   story += [para('Dokumentversion: '+data['terms_version']),para('Vertragsbedingungen und Widerrufsinformation','h'),para('Die freigegebenen Unterlagen werden im Livebetrieb vollständig angehängt. Sie liegen für diese Vorschau noch nicht vor.' if not self.live else 'Die vollständigen Vertragsbedingungen und Widerrufsinformationen sind Bestandteil dieser PDF und folgen auf den nächsten Seiten.'),para('Kontakt: info@performance-gym.de | 02226 91 11 999','small')]
  else:
   statement='Hiermit widerrufe ich den angegebenen Vertrag.' if kind=='withdrawal' else 'Hiermit kündige ich den angegebenen Vertrag '+('außerordentlich.' if data['termination']=='extraordinary' else 'ordentlich.')
   story += [para('Deine Erklärung','h'),para(statement),table([('Name',data['name']),('E-Mail',data['email']),('Vertrag / Mitgliedschaft',data['contract']),('Gewünschter Zeitpunkt',data['end_date'] or 'Zum nächstmöglichen Zeitpunkt'),('Begründung',data['reason'] or 'Nicht angegeben')]),para('Die Bestätigung dokumentiert den Eingang deiner Erklärung und ihre Angaben. Eine Prüfung des konkreten Beendigungszeitpunkts wird damit nicht vorweggenommen.')]
  grouped=[];index=0
  while index<len(story):
   if isinstance(story[index],Paragraph) and story[index].style.name=='h' and index+1<len(story) and isinstance(story[index+1],Table):
    grouped.append(KeepTogether(story[index:index+2]));index+=2
   else:grouped.append(story[index]);index+=1
  SimpleDocTemplate(output,pagesize=(595.28,841.89),leftMargin=48,rightMargin=48,topMargin=100,bottomMargin=55).build(grouped,onFirstPage=decorate,onLaterPages=decorate)
  result=output.getvalue()
  if self.live and kind=='membership':
   writer=PdfWriter();writer.append(PdfReader(BytesIO(result)))
   for key in ['contract_terms_pdf','withdrawal_pdf']:writer.append(self.config[key])
   final=BytesIO();writer.write(final);result=final.getvalue()
  return result
 def message(self,data,pdf,record_id,kind,channel):
  member=data.get('first_name',data.get('name',''))
  title='Deine Mitgliedschaft' if kind=='membership' else 'Eingang deiner '+('Kündigung' if kind=='cancellation' else 'Widerrufserklärung')
  recipient=data['email'] if channel=='member' else self.config['studio_email']
  msg=EmailMessage(policy=SMTP);msg['Subject']=('[VORSCHAU] ' if not self.live else '')+title+' | '+record_id
  msg['From']=self.config.get('sender_email') or 'vorschau@performance-gym.invalid';msg['To']=recipient;msg['Date']=format_datetime(datetime.now(timezone.utc));msg['Message-ID']=make_msgid(domain='performance-gym.de')
  msg.set_content(('VORSCHAU - Diese Nachricht wurde nur lokal erstellt.\n\n' if not self.live else '')+'Hallo '+member+',\n\nim Anhang findest du deine Unterlagen zum Vorgang '+record_id+'.\n'+('Dies ist eine unverbindliche Testanmeldung. Es wurde kein Vertrag geschlossen.\n' if not self.live else '')+'\nBei Fragen erreichst du uns unter info@performance-gym.de oder 02226 91 11 999.\n\nDein Team vom 17/7 Performance Gym\n'+COMPANY+'\n'+ADDRESS)
  msg.add_attachment(pdf,maintype='application',subtype='pdf',filename='Performance-Gym-'+record_id+'.pdf')
  return msg.as_bytes()
 def deliver(self,record_id):
  from email import message_from_bytes
  with MAIL_LOCK:
   with self.db() as db:rows=db.execute('SELECT * FROM outbox WHERE record_id=? AND status=?',(record_id,'pending')).fetchall()
   for row in rows:
    raw=self.crypto.decrypt(row['message']);status='pending'
    if not self.live:
     folder=self.data/'preview-outbox';folder.mkdir(exist_ok=True,mode=0o700)
     path=folder/(record_id+'-'+row['channel']+'.eml');path.write_bytes(raw);path.chmod(0o600);status='preview'
    else:
     try:
      host=os.environ['SMTP_HOST'];port=int(os.environ.get('SMTP_PORT','587'));context=ssl.create_default_context()
      conn=smtplib.SMTP_SSL(host,port,timeout=12,context=context) if port==465 else smtplib.SMTP(host,port,timeout=12)
      with conn:
       if port!=465:conn.starttls(context=context)
       conn.login(os.environ['SMTP_USERNAME'],os.environ['SMTP_PASSWORD'])
       msg=message_from_bytes(raw);conn.sendmail(msg['From'],[msg['To']],raw);status='sent'
     except (OSError,smtplib.SMTPException):status='pending'
    with self.db() as db:db.execute('UPDATE outbox SET status=?,attempts=attempts+1 WHERE id=?',(status,row['id']))
 def result(self,record_id):
  with self.db() as db:
   row=db.execute('SELECT id,created,kind FROM records WHERE id=?',(record_id,)).fetchone();statuses=[r[0] for r in db.execute('SELECT status FROM outbox WHERE record_id=?',(record_id,))]
  return {**dict(row),'mode':'live' if self.live else 'preview','email_status':'preview' if not self.live else ('sent' if statuses and all(s=='sent' for s in statuses) else 'pending'),'pdf_url':'/api/membership/pdf/'+record_id}
 def submit(self,body,session,idem,ip,service=False):
  if not re.fullmatch(r'[a-zA-Z0-9-]{16,80}',idem):raise Invalid({'form':'Bitte die Seite neu laden.'})
  data=self.validate_service(body) if service else self.validate(body)
  fingerprint=hashlib.sha256(json.dumps(data,sort_keys=True).encode()).hexdigest();shash=hashlib.sha256(session.encode()).hexdigest()
  with LOCK:
   with self.db() as db:existing=db.execute('SELECT * FROM records WHERE session=? AND idem=?',(shash,idem)).fetchone()
   if existing:
    if existing['fingerprint']!=fingerprint:raise Invalid({'form':'Diese Anfrage wurde bereits mit anderen Angaben verwendet. Bitte neu beginnen.'})
    return self.result(existing['id'])
   now=datetime.now(timezone.utc);recent=[t for t in self.rate.get(ip,[]) if t>now-timedelta(hours=1)]
   if len(recent)>=(10 if self.live else 100):raise Invalid({'form':'Zu viele Anfragen. Bitte später erneut versuchen oder das Studio kontaktieren.'})
   self.rate[ip]=recent+[now];record_id='PG-'+now.strftime('%Y%m%d')+'-'+secrets.token_hex(4).upper();created=now.isoformat(timespec='seconds');kind=data.get('kind','membership')
   pdf=self.pdf(data,record_id,created,kind)
   with self.db() as db:
    db.execute('INSERT INTO records VALUES(?,?,?,?,?,?,?,?)',(record_id,shash,idem,fingerprint,created,kind,self.seal(data),self.seal(pdf)))
    for channel in ['member','studio']:db.execute('INSERT INTO outbox(record_id,channel,message,status) VALUES(?,?,?,?)',(record_id,channel,self.seal(self.message(data,pdf,record_id,kind,channel)),'pending'))
  self.deliver(record_id);return self.result(record_id)
 def download(self,record_id,session):
  with self.db() as db:row=db.execute('SELECT pdf FROM records WHERE id=? AND session=?',(record_id,hashlib.sha256(session.encode()).hexdigest())).fetchone()
  return self.crypto.decrypt(row['pdf']) if row else None

if __name__=='__main__':
 import argparse
 parser=argparse.ArgumentParser();parser.add_argument('--retry-outbox',action='store_true');args=parser.parse_args()
 app=Membership()
 if args.retry_outbox:
  with app.db() as db:ids=[r[0] for r in db.execute("SELECT DISTINCT record_id FROM outbox WHERE status='pending'")]
  for record_id in ids:app.deliver(record_id)
  print('Outbox retry completed:',len(ids),'records')
