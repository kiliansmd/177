"""PNG-compatible social previews and icons, decoded from text entirely in RAM."""
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'site-src'))
from brand_assets import respond

class handler(BaseHTTPRequestHandler):
    def name(self):
        return parse_qs(urlsplit(self.path).query).get('name', [''])[0]

    def do_GET(self):
        respond(self, self.name())

    def do_HEAD(self):
        respond(self, self.name(), head=True)
