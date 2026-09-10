"""In-memory checks for the text-only logo assets and HTTP/PDF compatibility."""
from io import BytesIO
from hashlib import sha256
from PIL import Image
from pathlib import Path
import unittest
from brand_assets import FILES, logo_png, png, respond

class Request:
    def __init__(self, headers=None):
        self.headers = headers or {}
        self.output_headers = {}
        self.wfile = BytesIO()
    def send_response(self, status): self.status = status
    def send_error(self, status): self.status = status
    def send_header(self, key, value): self.output_headers[key] = value
    def end_headers(self): pass

class BrandAssets(unittest.TestCase):
    def test_original_is_byte_identical_to_attachment(self):
        self.assertEqual(sha256(logo_png()).hexdigest(), 'f7e1a3514e638f814b2586a7e0b43f9f67d0b1299967ce530fbf5fea91fa5302')
        self.assertEqual(Image.open(BytesIO(logo_png())).size, (2167, 726))

    def test_real_png_dimensions_and_text_only_sources(self):
        for name in FILES:
            raw = png(name)
            self.assertEqual(raw[:8], b'\x89PNG\r\n\x1a\n')
            expected = (1200, 630) if name.startswith('social') else (int(name.split('-')[1]),) * 2
            self.assertEqual(Image.open(BytesIO(raw)).size, expected)
        root = Path(__file__).resolve().parent.parent
        for folder in [root / 'site-src/brand', root / 'assets/brand']:
            for file in folder.iterdir():
                file.read_text(encoding='utf-8')
                self.assertNotIn(file.suffix, ('.png', '.webp', '.jpg', '.ico'))

    def test_get_and_head_have_identical_cache_headers(self):
        get, head = Request(), Request()
        respond(get, 'social-v2.png'); respond(head, 'social-v2.png', head=True)
        self.assertEqual(get.status, 200)
        self.assertEqual(get.output_headers, head.output_headers)
        self.assertEqual(get.wfile.getvalue(), png('social-v2.png'))
        self.assertEqual(head.wfile.getvalue(), b'')
        self.assertEqual(get.output_headers['Content-Type'], 'image/png')

    def test_conditional_get_avoids_resending_image(self):
        first = Request(); respond(first, 'icon-192-v2.png')
        cached = Request({'If-None-Match': first.output_headers['ETag']})
        respond(cached, 'icon-192-v2.png')
        self.assertEqual(cached.status, 304)
        self.assertEqual(cached.wfile.getvalue(), b'')

    def test_only_allowlisted_assets_can_be_read(self):
        for name in ['../membership-config.example.json', '../../.env.local', 'missing.png', '/icon-32-v2.png']:
            request = Request(); respond(request, name)
            self.assertEqual(request.status, 404)
            self.assertEqual(request.wfile.getvalue(), b'')

if __name__ == '__main__': unittest.main()
