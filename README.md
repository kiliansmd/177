# 17/7 Performance Gym – optimierte Website

Stand: 9. September 2026.

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

- `site-src/build.py`: Seitenaufbau, deutsche Texte, Navigation, Tarife und Metadaten.
- `assets/site.css`: gesamtes responsives Design.
- `assets/site.js`: Menü, Teamfilter, Galerie, externe Medien und E-Mail-Vorbereitung.
- `assets/motion.js`: progressive Lade-, Scroll- und Filteranimationen ohne externe Bibliothek.
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

## Funktionen

- Kontakt: Pflichtfeldprüfung, thematisch vorausgefüllte Anfrage, Vorschautext, E-Mail-Link und Kopierfunktion. Der Besucher verschickt die Nachricht in seinem eigenen E-Mail-Programm. Die neue digitale Mitgliedschaft hat einen separaten PDF-/SMTP-Backendpfad; derzeit werden nur lokale Testnachrichten erzeugt.
- Team: 17 eigenständige Profile, filterbar nach Personal Training, Leitung und Team.
- Galerie: tastaturbedienbarer Dialog mit Vor-/Zurücknavigation und Fokus-Rückgabe.
- 360°-Tour und YouTube: Verbindung zum Anbieter erst nach ausdrücklichem Klick; Deaktivieren entfernt die Einbettung.
- Mobile Navigation, Sprunglink, sichtbarer Tastaturfokus, beschriftete Formulare und animierte Übergänge.
- Verfeinerte lokale Typografie: Oswald 700 für Haupttitel, Oswald 600 für Zwischenüberschriften und Namen, Lato 400/700 für Lesetext und Bedienung. Hauptschriften werden vorgeladen.
- Gestaffelte Einstiege, einmalige Scroll-Reveals, Bild- und Karteninteraktionen sowie native Seitenübergänge in unterstützenden Browsern. Es gibt keine JavaScript-Scrollschleife, keinen künstlichen Ladebildschirm und keine verzögert abgefangenen Links.
- Auf ausdrücklichen Wunsch sind sämtliche Reduced-Motion-Bedingungen entfernt. Ohne die Skripte bleiben die Inhalte sichtbar und die Seiten über gewöhnliche Links erreichbar.

## Veröffentlichung

Die Fassung ist für die öffentliche Vercel-Vorschau eingerichtet; der funktionale Status der Anmeldung ist oben beschrieben.

Für einen Produktivserver werden die erzeugten HTML-Seiten, `assets/`, die verbliebenen Logo-/Schriftdateien in `wp-content/`, `robots.txt`, `sitemap.xml` und `404.html` benötigt. `site-src/` und diese Dokumentation müssen nicht öffentlich ausgeliefert werden. Die Weiterleitungen aus `redirects.json` auf dem gewählten Server als HTTP 301 konfigurieren; die mitgelieferten Weiterleitungs-HTML-Seiten dienen zusätzlich als statischer Fallback. Eine unbekannte Adresse soll HTTP 404 mit `404.html` liefern.

Die kanonische Domain ist `https://fitness-studio-rheinbach.de`. Bei anderer Domain vor dem Build `SITE_URL` setzen. Noindex wird in dieser Veröffentlichung bewusst auch auf Vercel gesetzt.

Vor dem Livegang: aktuelle Preise und Ansprechpartner vom Betreiber bestätigen lassen; Datenschutzhinweise mit den tatsächlich eingesetzten Hosting-/E-Mail-Anbietern und deren Speicherfristen abgleichen. Impressum und Datenschutzhinweise sind ein überarbeiteter Entwurf, keine rechtliche Freigabe. Für den Livebetrieb der Mitgliedschaft müssen Vertragsunterlagen, SEPA-Angaben und ein SMTP-Absender konfiguriert werden. Reines statisches Hosting unterstützt diese Anmeldung nicht.

Die Positionierung „inhabergeführt“ stammt aus dem Nutzerbriefing. Es wird daraus keine Eigentümerrolle eines konkret benannten Teammitglieds abgeleitet.

## Digitale Anmeldung

`/mitglied-werden/` ist der primäre Einstieg. Vier Schritte, serverseitige Prüfung, PDF-Vertragsvorschau, verschlüsselte Speicherung und dauerhafte Mail-Outbox sind implementiert. `/kuendigen/` und `/widerrufen/` ergänzen den Ablauf. **Aktuell nur lokale Testanmeldung, kein Vertragsschluss und kein externer Versand.** Details zu Konfiguration, offenen Betreiberangaben und Tests stehen in `MITGLIEDSCHAFT.md`.

## Instagram-Feed

Auf der Startseite ist das Elfsight-Widget `563dff4a-619d-4b7d-8355-b4e6426327b0` integriert. Der lokale Loader `assets/instagram.js` umfasst rund 2 KB und wird nur auf der Startseite eingebunden. Ein einmaliger IntersectionObserver startet `https://elfsightcdn.com/platform.js` asynchron 1600 Pixel vor dem Viewport. Bis dahin entstehen durch die Einbindung keine externen Widget-Anfragen. Das Attribut `data-elfsight-app-lazy` wird beim Start entfernt, um eine zusätzliche Wartebedingung im Anbieter-Loader zu vermeiden. Keine Scroll-Handler, keine Polling-Schleife.

Reservierte Flächen begrenzen Layoutsprünge; das echte Widget passt sich responsiv an. Bei ausbleibender Darstellung erscheint ein Hinweis, und der direkte Instagram-Link bleibt verfügbar. Die vom Anbieter geladenen Bibliotheken, Bilder und deren Antwortzeiten lassen sich durch den kleinen lokalen Loader nicht vollständig kontrollieren. Bei direktem Anspringen des Feed-Bereichs oder sehr langsamer Verbindung kann deshalb eine kurze Ladephase sichtbar bleiben.

Grundlage: [Elfsight zur asynchronen Einbindung](https://help.elfsight.com/article/1101-how-to-improve-widgets-loading-speed). Die Datenschutzhinweise unterscheiden den automatisch nachgeladenen Feed von den weiterhin erst nach Klick geladenen YouTube- und 360°-Inhalten.
