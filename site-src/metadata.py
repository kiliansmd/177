"""Shared, factual metadata. Public preview remains deliberately non-indexable."""
from html import escape
from html.parser import HTMLParser
import json

SITE_NAME = '17/7 Performance Gym Rheinbach'
SOCIAL_IMAGE = '/assets/social/performance-gym-rheinbach-v1.png'
SOCIAL_ALT = '17/7 Performance Gym: Originallogo, Trainingshalle und der Schriftzug „Dein Training. Dein Gym.“ in Graphit und Gelb.'


class Breadcrumbs(HTMLParser):
    def __init__(self, body):
        super().__init__()
        self.active = False
        self.current = None
        self.items = []
        self.feed(body)

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == 'nav' and 'breadcrumb' in attrs.get('class', '').split():
            self.active = True
        if self.active and tag in ('a', 'span') and attrs.get('aria-hidden') != 'true':
            self.current = {'name': '', 'url': attrs.get('href')}

    def handle_data(self, text):
        if self.active and self.current is not None:
            self.current['name'] += text

    def handle_endtag(self, tag):
        if self.active and tag in ('a', 'span') and self.current:
            if self.current['name'].strip():
                self.items.append(self.current)
            self.current = None
        if tag == 'nav':
            self.active = False


def metadata(route, title, description, body, domain, assets, image_map):
    canonical = domain + route
    absolute = lambda path: domain + '/' + path.lstrip('/')
    image = domain + SOCIAL_IMAGE
    gym_id, site_id, image_id = domain + '/#gym', domain + '/#website', domain + '/#social-image'
    logo = assets['logos'][0]
    gym = {
        '@type': 'ExerciseGym', '@id': gym_id,
        'name': '17/7 Performance Gym', 'url': domain + '/',
        'description': 'Inhabergeführtes Warehouse Gym in Rheinbach mit Krafttraining, Cardio und Functional Training.',
        'telephone': '+4922269111999', 'email': 'info@performance-gym.de',
        'logo': {'@type': 'ImageObject', '@id': domain + '/#logo', 'url': absolute(logo['path']),
                 'contentUrl': absolute(logo['path']), 'width': logo['width'], 'height': logo['height']},
        'image': {'@id': image_id},
        'address': {'@type': 'PostalAddress', 'streetAddress': 'Industriestraße 32 a–e',
                    'postalCode': '53359', 'addressLocality': 'Rheinbach', 'addressCountry': 'DE'},
        'openingHoursSpecification': {'@type': 'OpeningHoursSpecification',
            'dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            'opens': '06:00', 'closes': '22:00',
            'description': 'An gesetzlichen Feiertagen können die Öffnungszeiten abweichen.'},
        'sameAs': ['https://www.instagram.com/17.7.performance.gym/'],
    }
    webpage = {
        '@type': {'/contact/': 'ContactPage', '/studio/': 'AboutPage', '/unser-team/': 'CollectionPage'}.get(route, 'WebPage'),
        '@id': canonical + '#webpage', 'url': canonical, 'name': title, 'description': description,
        'inLanguage': 'de-DE', 'isPartOf': {'@id': site_id}, 'about': {'@id': gym_id},
        'primaryImageOfPage': {'@id': image_id},
    }
    if route == '/':
        webpage['mainEntity'] = {'@id': gym_id}
    graph = [
        {'@type': 'WebSite', '@id': site_id, 'url': domain + '/', 'name': SITE_NAME,
         'alternateName': 'Performance Gym Rheinbach', 'inLanguage': 'de-DE', 'publisher': {'@id': gym_id}},
        gym,
        {'@type': 'ImageObject', '@id': image_id, 'url': image, 'contentUrl': image,
         'width': 1200, 'height': 630, 'encodingFormat': 'image/png', 'caption': SOCIAL_ALT},
        webpage,
    ]
    crumbs = Breadcrumbs(body).items
    if len(crumbs) > 1:
        breadcrumb_id = canonical + '#breadcrumb'
        webpage['breadcrumb'] = {'@id': breadcrumb_id}
        graph.append({'@type': 'BreadcrumbList', '@id': breadcrumb_id, 'itemListElement': [
            {'@type': 'ListItem', 'position': index, 'name': crumb['name'].strip(),
             'item': absolute(crumb['url']) if crumb['url'] else canonical}
            for index, crumb in enumerate(crumbs, 1)
        ]})
    if route.startswith('/staff-member/'):
        person = next(p for p in assets['team'] if '/staff-member/' + p['slug'] + '/' == route)
        person_id = canonical + '#person'
        webpage.update({'@type': 'ProfilePage', 'mainEntity': {'@id': person_id}})
        photo = person['asset']['path']
        graph.append({'@type': 'Person', '@id': person_id, 'name': person['name'],
                      'url': canonical, 'jobTitle': person['role'],
                      'image': absolute(image_map.get(photo, {}).get('path', photo))})
    elif route.startswith('/gallery/'):
        webpage['@type'] = 'ImageGallery'

    tags = [
        ('name', 'application-name', '17/7 Performance Gym'),
        ('name', 'apple-mobile-web-app-title', '17/7 Gym'),
        ('name', 'format-detection', 'telephone=no'),
        ('property', 'og:site_name', SITE_NAME),
        ('property', 'og:image', image), ('property', 'og:image:secure_url', image),
        ('property', 'og:image:type', 'image/png'), ('property', 'og:image:width', '1200'),
        ('property', 'og:image:height', '630'), ('property', 'og:image:alt', SOCIAL_ALT),
        ('name', 'twitter:card', 'summary_large_image'), ('name', 'twitter:title', title),
        ('name', 'twitter:description', description), ('name', 'twitter:image', image),
        ('name', 'twitter:image:alt', SOCIAL_ALT),
    ]
    head = ''.join(f'<meta {kind}="{key}" content="{escape(value, quote=True)}">' for kind, key, value in tags)
    head += '<link rel="apple-touch-icon" sizes="180x180" href="/wp-content/uploads/2024/06/cropped-LOGO-17-7b-180x180.png">'
    head += '<link rel="icon" type="image/png" sizes="192x192" href="/wp-content/uploads/2024/06/cropped-LOGO-17-7b-192x192.png">'
    head += '<link rel="manifest" href="/site.webmanifest">'
    structured = json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    return head + '<script type="application/ld+json">' + structured + '</script>'
