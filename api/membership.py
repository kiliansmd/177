"""Stateless public demo. Never stores registrations, sends mail or creates a contract.

The full private/local workflow remains in site-src/membership_api.py.
"""
from http.server import BaseHTTPRequestHandler
from http.cookies import SimpleCookie
from pathlib import Path
from decimal import Decimal
from datetime import datetime, timezone
from urllib.parse import urlsplit, parse_qs
import base64, hashlib, json, re, secrets, sys

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'site-src'))
from membership_api import Membership, Invalid

class PublicPreview(Membership):
    def __init__(self):
        # Deliberately skip the persistent backend and any environment live settings.
        self.live = False
        self.config = json.loads((ROOT / 'site-src/membership-config.example.json').read_text())
        self.config = {key: '' for key in self.config}
        self.config['approved'] = False
        facts = json.loads((ROOT / 'site-src/content.json').read_text())['facts']['membership_plans']
        self.plans = {p['id']: {'id': p['id'], 'name': p['label'],
            'monthly': int(Decimal(p['monthly_eur']) * 100), 'months': p['term_months'], 'band': 1999}
            for p in facts[:2]}

APP = PublicPreview()
COOKIE = '__Host-gym_preview'

class handler(BaseHTTPRequestHandler):
    def action(self):
        parsed = urlsplit(self.path)
        return parse_qs(parsed.query).get('action', [parsed.path.rsplit('/', 1)[-1]])[0].strip('/')

    def token(self):
        jar = SimpleCookie()
        try:
            jar.load(self.headers.get('Cookie', ''))
            value = jar[COOKIE].value if COOKIE in jar else ''
            return value if re.fullmatch(r'[A-Za-z0-9_-]{43}', value) else ''
        except Exception:
            return ''

    def respond(self, status, body, content_type='application/json; charset=utf-8', cookie=None):
        raw = body if isinstance(body, bytes) else json.dumps(body, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('Cache-Control', 'no-store, private')
        self.send_header('X-Robots-Tag', 'noindex, nofollow, noarchive')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        if cookie:
            self.send_header('Set-Cookie', f'{COOKIE}={cookie}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=14400')
        if content_type == 'application/pdf':
            self.send_header('Content-Disposition', 'attachment; filename="Performance-Gym-Demo.pdf"')
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.action() != 'config':
            self.respond(404, {'error': 'Dokument nicht verfügbar. Die öffentliche Demo speichert keine Unterlagen.'})
            return
        token = self.token() or secrets.token_urlsafe(32)
        self.respond(200, {**APP.public(token), 'delivery': 'browser'}, cookie=token)

    def do_POST(self):
        action = self.action()
        if action not in ('preview', 'submit', 'service'):
            self.respond(404, {'error': 'Nicht gefunden.'})
            return
        origin = urlsplit(self.headers.get('Origin', ''))
        host = self.headers.get('Host', '').lower()
        if origin.scheme != 'https' or origin.netloc.lower() != host:
            self.respond(403, {'error': 'Anfrageursprung nicht erlaubt.'})
            return
        token = self.token()
        if not token or not secrets.compare_digest(self.headers.get('X-CSRF-Token', ''), token):
            self.respond(403, {'error': 'Bitte lade die Seite neu und versuche es erneut.'})
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 32768:
                self.respond(413, {'error': 'Die Anfrage ist zu groß.'})
                return
            if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                self.respond(415, {'error': 'JSON erwartet.'})
                return
            body = json.loads(self.rfile.read(length))
            data = APP.validate_service(body) if action == 'service' else APP.validate(body, consents=action != 'preview')
            idem = self.headers.get('Idempotency-Key', '')
            if not re.fullmatch(r'[A-Za-z0-9-]{16,80}', idem):
                raise Invalid({'form': 'Bitte die Seite neu laden.'})
            record = 'DEMO-' + hashlib.sha256((token + idem + json.dumps(data, sort_keys=True)).encode()).hexdigest()[:12].upper()
            created = datetime.now(timezone.utc).isoformat(timespec='seconds')
            pdf = APP.pdf(data, record, created, data.get('kind', 'membership'), draft=action == 'preview')
            if action == 'preview':
                self.respond(200, pdf, 'application/pdf')
            else:
                self.respond(200, {'id': record, 'created': created, 'mode': 'preview',
                    'delivery': 'browser', 'email_status': 'disabled',
                    'pdf_base64': base64.b64encode(pdf).decode()})
        except Invalid as error:
            self.respond(422, {'error': str(error), 'fields': error.fields})
        except (ValueError, TypeError):
            self.respond(400, {'error': 'Ungültige Anfrage.'})
        except Exception:
            self.respond(500, {'error': 'Die PDF-Vorschau konnte nicht erstellt werden. Bitte erneut versuchen.'})

    def do_HEAD(self):
        self.send_response(405)
        self.send_header('X-Robots-Tag', 'noindex, nofollow')
        self.end_headers()

    def log_message(self, format, *args):
        # No form contents, cookies or request identifiers in application logs.
        pass
