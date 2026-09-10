"""Brand images stored only as UTF-8 text; decode into memory for HTTP/PDF use."""
import base64
from functools import lru_cache
from hashlib import sha256
from pathlib import Path
from xml.etree import ElementTree

SOURCE = Path(__file__).resolve().parent / 'brand'
FILES = frozenset(['social-v2.png', *(f'icon-{size}-v2.png' for size in (32, 180, 192, 512))])

@lru_cache(maxsize=5)
def png(name):
    if name not in FILES:
        raise KeyError(name)
    text = (SOURCE / (name + '.b64')).read_text(encoding='ascii')
    return base64.b64decode(''.join(text.split()), validate=True)

@lru_cache(maxsize=1)
def logo_png():
    image = ElementTree.parse(SOURCE / 'logo-original.svg').find('{http://www.w3.org/2000/svg}image')
    return base64.b64decode(image.attrib['href'].split(',', 1)[1], validate=True)

def respond(request, name, head=False):
    """Shared local/Vercel handler. No arbitrary paths and no filesystem writes."""
    try:
        body = png(name)
    except KeyError:
        request.send_error(404)
        return
    etag = '"' + sha256(body).hexdigest() + '"'
    fresh = request.headers.get('If-None-Match') in (etag, 'W/' + etag, '*')
    request.send_response(304 if fresh else 200)
    request.send_header('Content-Type', 'image/png')
    request.send_header('Cache-Control', 'public, max-age=86400, s-maxage=31536000')
    request.send_header('ETag', etag)
    request.send_header('X-Content-Type-Options', 'nosniff')
    if not fresh:
        request.send_header('Content-Length', str(len(body)))
    request.end_headers()
    if not head and not fresh:
        request.wfile.write(body)
