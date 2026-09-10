# Aktualisiertes Logo

Die vom Nutzer bereitgestellte transparente PNG-Vorlage (2167 × 726) wird ausschließlich als UTF-8-Text gespeichert. Keine neue PNG-, WebP-, ICO- oder PDF-Datei wird für diese Integration auf die Festplatte geschrieben.

- `site-src/brand/logo-original.svg`: unveränderte Originalbytes als eingebetteter Base64-PNG-Dateninhalt. SHA-256: `f7e1a3514e638f814b2586a7e0b43f9f67d0b1299967ce530fbf5fea91fa5302`.
- `assets/brand/performance-gym-v2.svg`: transparente Webvariante mit 836 × 280 Pixeln, für Header, Footer und Challenge. SVG-Textcontainer mit eingebetteten Rasterpixeln, keine behauptete Vektorisierung. Rund 128 KiB, externe und wiederverwendbare Ressource.
- `site-src/brand/*.png.b64`: Icons und Social-Vorschau als Base64-Text. Die Icons verwenden einen Ausschnitt des aktualisierten 17/7-Schriftzuges auf Graphit für bessere Lesbarkeit in kleinen Größen.
- `site-src/brand_assets.py`: dekodiert diese Quellen ausschließlich im Arbeitsspeicher. `api/brand.py` und der lokale Preview-Server liefern echte `image/png`-Antworten unter `/assets/brand/*.png`, damit Social-Crawler und Apple-Touch-Icons kompatibel bleiben. GET, HEAD und ETag/304 werden unterstützt; nur fest freigegebene Namen sind abrufbar.
- `site-src/membership_api.py`: zeichnet das neue Logo aus der Textquelle in die bestehende dunkle PDF-Kopfzeile. Die Vertragslogik bleibt unverändert.

Die generierten Seiten, JSON-LD, Open Graph, Twitter-Karten und das Webmanifest referenzieren die neuen versionierten URLs. Das bestehende Noindex bleibt erhalten. Historische Bilddateien sowie Logos innerhalb echter Studiofotos werden nicht verändert.

## Social-Karte aktualisieren

Die bisherige Gestaltung wird durch `site-src/social-card.html` definiert. Mit installiertem Playwright und Chromium:

```sh
node site-src/render-social.mjs
python3 site-src/build.py
```

Optional unterstützen `PLAYWRIGHT_MODULE` (Modulpfad) und `CHROMIUM_PATH` (Browserprogramm) vorhandene lokale Laufzeiten. Das Skript rendert in den Arbeitsspeicher und schreibt nur `social-v2.png.b64`. Im Produktionsbuild ist kein Browser nötig. Beim nächsten Motivwechsel die versionierten Dateinamen und Verweise erhöhen, damit vorhandene Social-Caches neu laden können.

Prüfung: `PYTHONDONTWRITEBYTECODE=1 python3 site-src/test_brand_assets.py`.
