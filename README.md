# 17/7 Performance Gym – optimierte Website

Stand: 10. September 2026.

## GitHub und Vercel

Vollständiges Projekt für `https://github.com/kiliansmd/177`. Vercel baut mit `python3 site-src/export_vercel.py` die explizit freigegebenen Website-Dateien nach `public/`; Python-Funktionen liegen unter `api/`. Alle Seiten und HTTP-Antworten erhalten `noindex, nofollow, noarchive`. Crawling bleibt in `robots.txt` möglich, damit Suchmaschinen die Noindex-Anweisung lesen können. Noindex ist kein Zugriffsschutz; die Vorschau ist öffentlich.

Die öffentliche Mitgliedschaft ist eine **unverbindliche Demo**: Eingaben werden zur PDF-Erzeugung verarbeitet und das PDF direkt im Browser bereitgestellt. Es wird keine Anmeldung dauerhaft gespeichert und keine E-Mail versendet. Der vollständige lokale Backendpfad einschließlich verschlüsselter Datenbank und SMTP-Outbox bleibt enthalten. Er muss für echte Verträge mit freigegebenen Dokumenten, dauerhaftem Speicher und Mailzugang eingerichtet werden.

Vercel-Projekt und GitHub-Repository sind für Veröffentlichungen von `main` verbunden. `.gitignore` und `.vercelignore` schließen Zugangsdaten, lokale Datenbanken, Schlüssel, Test-E-Mails und Build-Verzeichnisse aus.

### Lokale Prüfung der öffentlichen Demo

```sh
python3 -m pip install -r requirements.txt
python3 site-src/export_vercel.py
cd site-src
python3 -m unittest -v test_public_preview test_membership.Logic
```

Die Initialisierung des öffentlichen Endpunkts ignoriert `MEMBERSHIP_MODE=live` absichtlich; das Veröffentlichen allein kann keinen echten Vertragsschluss einschalten.

## Websiteumfang
 Website mit statischen Inhaltsseiten und lokalem Mitgliedschafts-Backend: 34 Inhaltsseiten und 12 Weiterleitungsadressen. Die ursprünglichen 36 Website-Adressen der lokalen SiteSucker-Kopie bleiben erreichbar. Die technischen Downloadseiten sind kein Bestandteil der Website.

## Lokal ansehen

Im Projektverzeichnis ausführen:

```sh
python3 -m pip install -r site-src/requirements.txt
python3 site-src/serve.py
```

Vorschau: http://127.0.0.1:8766/

Der lokale Server liefert echte 301-Weiterleitungen, eine eigene 404-Seite und einen Noindex-Header. Er bindet ausschließlich an 127.0.0.1. Falls die Vorschau bereits läuft, muss kein zweiter Server gestartet werden.

## Bearbeiten und bauen

- `site-src/build.py`: Seitenaufbau, deutsche Texte, Navigation und Tarife.
- `site-src/metadata.py`: zentrale Open-Graph-/X-Cards- und JSON-LD-Metadaten aus den vorhandenen Studiofakten.
- `site-src/social-card.html`: reproduzierbare 1200 × 630 px große Social-Karte mit unverändertem Originallogo und Originalfoto. Die fertige PNG-Datei liegt unter `assets/social/`.
- `assets/site.css`: grundlegendes Design, Typografie und Animationen.
- `assets/responsive.css`: Viewport-Höhen, mobile und Tablet-Layouts sowie Querformat-Anpassungen.
- `assets/ux.css`: abschließendes Premium-Design mit gerahmten Bildflächen, präziser Typografie, Tarifkarten, Hero-Aktionen, Interaktionsdetails und mobiler Kostenübersicht; wird zuletzt eingebunden.
- `assets/site.js`: Menü, Teamfilter, Galerie, externe Medien und E-Mail-Vorbereitung.
- `assets/motion.js`: progressive Lade-, Scroll- und Filteranimationen ohne externe Bibliothek.
- `assets/scroll.js`: sanfte Positionskorrektur nahe Abschnittsanfängen nach beendeten Touch-/Mausradgesten, ohne Eingaben abzufangen.
- `site-src/content.json`: verifizierte Fakten mit Quellen und offenen Sachfragen.
- `site-src/assets.json`: Zuordnung der echten Studiobilder und Teamprofile.
- `site-src/legal.json`: auf die tatsächlichen Datenflüsse angepasster Rechtstextentwurf.
- `site-src/image-map.json`: Zuordnung der vorhandenen Bilder zu den WebP-Varianten.

Zum Neubauen ist **Python 3.12 oder neuer** erforderlich. Es werden keine zusätzlichen Python-Pakete benötigt:

```sh
python3 site-src/build.py
```

Der Build funktioniert mit den beiliegenden Bildderivaten ohne Zugriff auf den ursprünglichen Download. Nur für eine erneute Bildkonvertierung mit `site-src/optimize_images.py` werden Pillow und die Originalbilder benötigt. Pfade in der Asset-Quelldokumentation beziehen sich auf den ursprünglichen lokalen Download.

Die fertigen HTML-Seiten funktionieren ohne Build-Prozess auf einem statischen Webserver. Eigene CSS-, JavaScript-, Foto- und Schriftdateien sind lokal. Der Instagram-Feed lädt seine Plattform und Medien von Elfsight nach, sobald sein Bereich näher rückt. Die eigene Website verwendet kein Frontend-Framework und keine extern geladenen Schriften.

Die Scrollregeln einschließlich Touch, Abbruch, Verlauf und Browser-Fallback lassen sich ohne zusätzliche Pakete mit `node --test site-src/test_scroll.mjs` prüfen. Technische Grundlage: [Scrollende](https://developer.mozilla.org/en-US/docs/Web/API/Document/scrollend_event) und [native Scrollgrenzen](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overscroll-behavior).

## Funktionen

- Kontakt: Pflichtfeldprüfung, thematisch vorausgefüllte Anfrage, Vorschautext, E-Mail-Link und Kopierfunktion. Der Besucher verschickt die Nachricht in seinem eigenen E-Mail-Programm. Die neue digitale Mitgliedschaft hat einen separaten PDF-/SMTP-Backendpfad; derzeit werden nur lokale Testnachrichten erzeugt.
- Team: 17 eigenständige Profile, filterbar nach Personal Training, Leitung und Team.
- Galerie: tastaturbedienbarer Dialog mit Vor-/Zurücknavigation und Fokus-Rückgabe.
- 360°-Tour und YouTube: Verbindung zum Anbieter erst nach ausdrücklichem Klick; Deaktivieren entfernt die Einbettung.
- Mobile Navigation, Sprunglink, sichtbarer Tastaturfokus, beschriftete Formulare und animierte Übergänge.
- Alle Hero-Bereiche füllen die verfügbare erste Bildschirmhöhe. Auf der Startseite gehören Hero und gelbe Faktenleiste zu einer gemeinsamen Fläche. Stabile mobile Viewport-Einheiten vermeiden Sprünge beim Ein-/Ausblenden der Browserleiste; bei vergrößertem Text darf der Inhalt natürlich weiterwachsen.
- Die mobile Mitgliedschaftsleiste erscheint erst nach dem Hero. Unterseiten bieten einen direkten Sprung zum folgenden Inhalt; das mobile Menü bleibt auch im kurzen Querformat scrollbar.
- Scrollgrenzen: natives `overscroll-behavior-y: none` verhindert elastisches Überziehen an den vertikalen Seitengrenzen in unterstützenden Browsern. Menü, Galerie und scrollbare Textfelder begrenzen die Weitergabe ihrer Scrollbewegungen.
- Eine kleine Über-/Unterschreitung an Abschnittsanfängen wird nach Ende der Geste sanft korrigiert (je nach Bildschirmhöhe höchstens 20–42 px). Feine Bewegungen, das Verlassen eines Zielpunkts, Textauswahl, Tastatur, Zoom und direkte Sprunglinks bleiben frei. Checkout, Vertragsservice und Rechtstexte verwenden ausschließlich natives Scrollen. Neue Eingaben unterbrechen eine laufende Korrektur sofort.
- Die Positionskorrektur verwendet `scrollend`; ältere Browser erhalten einen passiven 180-ms-Debounce. Keine eigene Scroll-Engine, keine dauerhaft laufende Animation und kein Verhindern von Wheel-/Touch-Events. Formularschritte berücksichtigen den Header-Abstand genau einmal.
- Verfeinerte lokale Typografie: Oswald 700 für Haupttitel, Oswald 600 für Zwischenüberschriften und Namen, Lato 400/700 für Lesetext und Bedienung. Hauptschriften werden vorgeladen.
- Gestaffelte Einstiege, einmalige Scroll-Reveals, Bild- und Karteninteraktionen sowie native Seitenübergänge in unterstützenden Browsern. Es gibt keine JavaScript-Scrollschleife, keinen künstlichen Ladebildschirm und keine verzögert abgefangenen Links.
- Auf ausdrücklichen Wunsch sind sämtliche Reduced-Motion-Bedingungen entfernt. Ohne die Skripte bleiben die Inhalte sichtbar und die Seiten über gewöhnliche Links erreichbar.

## Conversion und Premium-Design

Die Informationsseiten für Training, Studio, Tarife, Team, Probetraining und Kontakt bieten einen konkreten primären Einstieg und einen passenden zweiten Weg. Echte Studiofotos stehen auf großen Bildschirmen in eigenständigen gerahmten Flächen; auf kleinen Bildschirmen bleiben sie als abgedunkelte, responsive Hintergründe erhalten. Der Startseiten-Hero schließt weiterhin einschließlich gelber Faktenleiste am ersten Viewport ab.

Die Tarifübersicht zeigt die beiden regulären Einzelmitgliedschaften schon im Einstieg; auf mobilen Hochformaten erscheint ein kompakter Standard-Preishinweis einschließlich der einmaligen E-Band-Gebühr. Die vollständigen Karten stehen unter `#tarife`, einzelne Tarife unter `#standard` und `#starter`. Standard wird durch eine helle Karte hervorgehoben, ohne eine unbelegte Beliebtheits- oder Knappheitsbehauptung. Preise und Konditionen stammen weiterhin aus den vorhandenen geprüften Daten.

Mitgliedschaftslinks führen direkt zu `#anmeldung`; nach einer Tarifauswahl bleibt die jeweilige `tarif`-Angabe erhalten. Trainingsbereiche sind über eine eigene Sprungnavigation erreichbar. Personal-Trainer- und Profilkontakte springen direkt zur passenden gefilterten Teamansicht beziehungsweise zur vorbereiteten Kontaktanfrage. Die gemeinsame Abschlussfläche bietet Anmeldung, Tarifvergleich und einen persönlichen Telefonkontakt in klarer Abstufung.

Diese Optimierung verändert keine Vertragslogik und aktiviert keine echten Verträge. Es werden keine zusätzlichen Schriften, Analyse-Dienste oder Animationsbibliotheken geladen. Die vorhandenen Animationen, Scrollgrenzen, Metadaten und Nichtindexierungsregeln bleiben erhalten. Aussagen zur tatsächlichen Conversion-Steigerung erfordern reale Nutzungsdaten und einen geeigneten Vorher-/Nachher-Vergleich.

Ein kleiner früher Inline-Listener behandelt den erwartbaren `AbortError` übersprungener nativer Seitenübergänge. Er wird vor dem ersten Rendering registriert, verändert keine Navigation und deaktiviert keine Animation. Chrome kann einen eingehenden Übergang bereits vor `pagereveal` verwerfen und dabei kein Transition-Objekt übergeben. Ausschließlich die native `DOMException` mit `AbortError` und dem exakten Text `Transition was skipped` wird in der ersten Sekunde nach einem solchen Ereignis behandelt. Andere Fehler bleiben sichtbar. Hintergrund: [Chrome-Dokumentation zu dokumentübergreifenden View Transitions](https://developer.chrome.com/docs/web-platform/view-transitions/cross-document).

## Social-Vorschau und Metadaten

Alle 34 Inhaltsseiten haben individuelle Titel und Beschreibungen, konsistente Canonicals, Open-Graph-Daten einschließlich Bildtyp, Bildmaßen und Alternativtext sowie `summary_large_image`-Cards. Die Social-Grafik wird nur von Vorschau-Crawlern geladen und erzeugt keine zusätzliche Bildanforderung beim gewöhnlichen Seitenbesuch. Ihre HTML/CSS-Quelle verwendet die lokalen Markenschriften, das unveränderte horizontale PNG-Logo und das vorhandene Studiofoto. Die bereitgestellte PNG-Datei ist 1200 × 630 px groß; ein normaler Website-Build muss sie nicht neu rendern. Bei grafischen Änderungen die Quelle im Browser mit exakt 1200 × 630 px öffnen, das Laden der lokalen Schriften und Bilder abwarten und einen Viewport-Screenshot als neue versionierte PNG-Datei exportieren. Den Dateipfad anschließend in `metadata.py` aktualisieren.

JSON-LD verbindet `WebSite`, `ExerciseGym`, die jeweilige Seite, sichtbare Breadcrumbs und die Social-Grafik. Profilseiten enthalten die vorhandenen Namen, Rollen und Fotos als `Person`; Kontakt-, Studio-, Team- und Galerieseiten erhalten passende Seitentypen. Es werden keine Bewertungen, Koordinaten, Auszeichnungen oder zusätzlichen Geschäftsfakten erfunden. Öffnungszeiten enthalten den vorhandenen Feiertagshinweis. Originale Touch- und Browsericons sowie ein Manifest vervollständigen die Geräte-Metadaten.

Die Implementierung folgt dem [Open Graph Protocol](https://ogp.me/) und verwendet die dokumentierten [LocalBusiness-Daten](https://developers.google.com/search/docs/appearance/structured-data/local-business). **Noindex bleibt ausdrücklich aktiv:** Diese Metadaten ermöglichen saubere Linkvorschauen und bereiten die Seiten technisch vor; sie schalten keine Suchmaschinenindexierung frei.

Der Anmeldeeinstieg hat einen deutlich sichtbaren Tarif-Button. Mobil lassen sich Laufzeit, E-Band-Gebühr, Startdatum und Mindestbetrag direkt in der Übersicht aufklappen. Eingabefehler sind mit ihren Feldern verbunden und verschwinden beim Bearbeiten gezielt. Ein fehlgeschlagener Verbindungsaufbau bietet nach spätestens zwölf Sekunden einen Wiederholungsbutton und einen direkten Telefonkontakt; Auswahl und Eingaben bleiben erhalten. Das Bearbeiten einer vorbereiteten Kontaktanfrage verwirft deren veraltete E-Mail-Vorschau.

## Veröffentlichung

Die Fassung ist für die öffentliche Vercel-Vorschau eingerichtet; der funktionale Status der Anmeldung ist oben beschrieben.

Für einen Produktivserver werden die erzeugten HTML-Seiten, `assets/`, die verbliebenen Logo-/Schriftdateien in `wp-content/`, `robots.txt`, `sitemap.xml`, `site.webmanifest` und `404.html` benötigt. `site-src/` und diese Dokumentation müssen nicht öffentlich ausgeliefert werden. Die Weiterleitungen aus `redirects.json` auf dem gewählten Server als HTTP 301 konfigurieren; die mitgelieferten Weiterleitungs-HTML-Seiten dienen zusätzlich als statischer Fallback. Eine unbekannte Adresse soll HTTP 404 mit `404.html` liefern.

Die kanonische Domain ist `https://177.meindigitalerbetrieb.de`. Vercel übernimmt seine konfigurierte Produktionsdomain beim Export. Bei anderer Domain vor dem Build `SITE_URL` setzen. Noindex wird in dieser Veröffentlichung bewusst auch auf Vercel gesetzt.

Vor dem Livegang: aktuelle Preise und Ansprechpartner vom Betreiber bestätigen lassen; Datenschutzhinweise mit den tatsächlich eingesetzten Hosting-/E-Mail-Anbietern und deren Speicherfristen abgleichen. Impressum und Datenschutzhinweise sind ein überarbeiteter Entwurf, keine rechtliche Freigabe. Für den Livebetrieb der Mitgliedschaft müssen Vertragsunterlagen, SEPA-Angaben und ein SMTP-Absender konfiguriert werden. Reines statisches Hosting unterstützt diese Anmeldung nicht.

Die Positionierung „inhabergeführt“ stammt aus dem Nutzerbriefing. Es wird daraus keine Eigentümerrolle eines konkret benannten Teammitglieds abgeleitet.

## Digitale Anmeldung

`/mitglied-werden/` ist der primäre Einstieg. Vier Schritte, serverseitige Prüfung, PDF-Vertragsvorschau, verschlüsselte Speicherung und dauerhafte Mail-Outbox sind implementiert. `/kuendigen/` und `/widerrufen/` ergänzen den Ablauf. **Aktuell nur lokale Testanmeldung, kein Vertragsschluss und kein externer Versand.** Details zu Konfiguration, offenen Betreiberangaben und Tests stehen in `MITGLIEDSCHAFT.md`.

## Instagram-Feed

Auf der Startseite ist das Elfsight-Widget `563dff4a-619d-4b7d-8355-b4e6426327b0` integriert. Der lokale Loader `assets/instagram.js` umfasst rund 2 KB und wird nur auf der Startseite eingebunden. Ein einmaliger IntersectionObserver startet `https://elfsightcdn.com/platform.js` asynchron 1600 Pixel vor dem Viewport. Bis dahin entstehen durch die Einbindung keine externen Widget-Anfragen. Das Attribut `data-elfsight-app-lazy` wird beim Start entfernt, um eine zusätzliche Wartebedingung im Anbieter-Loader zu vermeiden. Keine Scroll-Handler, keine Polling-Schleife.

Reservierte Flächen begrenzen Layoutsprünge; das echte Widget passt sich responsiv an. Bei ausbleibender Darstellung erscheint ein Hinweis, und der direkte Instagram-Link bleibt verfügbar. Die vom Anbieter geladenen Bibliotheken, Bilder und deren Antwortzeiten lassen sich durch den kleinen lokalen Loader nicht vollständig kontrollieren. Bei direktem Anspringen des Feed-Bereichs oder sehr langsamer Verbindung kann deshalb eine kurze Ladephase sichtbar bleiben.

Grundlage: [Elfsight zur asynchronen Einbindung](https://help.elfsight.com/article/1101-how-to-improve-widgets-loading-speed). Die Datenschutzhinweise unterscheiden den automatisch nachgeladenen Feed von den weiterhin erst nach Klick geladenen YouTube- und 360°-Inhalten.
