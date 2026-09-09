# Digitale Mitgliedschaft – Umsetzung und Betriebsstatus

Stand: 9. September 2026.

**Ergänzung für die öffentliche Vercel-Demo:** Der Adapter `api/membership.py` prüft Eingaben und erzeugt PDFs ohne dauerhafte Speicherung und ohne E-Mail-Versand. Er übernimmt ausschließlich die Validierungs- und PDF-Funktionen des unten beschriebenen privaten Backends. Dokumente werden als Browser-Download bereitgestellt. Die SQLite-/Outbox-Beschreibung gilt für das lokale/private Backend, nicht für die öffentliche Demo.
 [Lokale Anmeldung öffnen](http://127.0.0.1:8766/mitglied-werden/).

Die Website hat jetzt 34 Inhaltsseiten. „Mitglied werden“ ist die primäre Aktion in Navigation, Startseite, Abschlussbereichen, mobilen Schnellzugängen und den beiden regulären Tarifkarten. Probetraining bleibt als ergänzende Möglichkeit erreichbar. Graphit, helle Formularflächen, lokale Schriften und Gelb `#f3dd16` führen den bestehenden Stil fort.

## Anmeldung

Vier Schritte: Tarif und Beginn, persönliche Angaben, SEPA-Daten, abschließende Prüfung. Standard und Starter verwenden die im Projekt belegten Preise. Gesamtkosten der Erstlaufzeit und einmaliges E-Band werden transparent ausgewiesen. Sonderkonditionen führen weiterhin zur persönlichen Beratung. Vor dem Abschluss lassen sich Angaben bearbeiten und eine PDF-Vorschau herunterladen.

Das Backend prüft Pflichtfelder, Volljährigkeit, Startdatum, IBAN und ausdrückliche Bestätigungen. Es berechnet Preise selbst. Wiederholte identische Anfragen und parallele Doppelklicks erzeugen denselben Vorgang. Während der Übertragung sind Änderungen am Formular gesperrt.

PDFs enthalten Vertragsdaten, Kosten, maskierte IBAN, Vorgangsnummer, Zeitstempel und Bestätigungen. Im konfigurierten Livebetrieb werden die freigegebenen Vertragsbedingungen und Widerrufsinformationen vollständig angehängt. Die zwei vorbereiteten E-Mails – Mitglied und Studio – enthalten den PDF-Anhang. Ein fehlgeschlagener SMTP-Versand bleibt in einer dauerhaften Warteschlange und kann wiederholt werden, ohne eine neue Mitgliedschaft anzulegen.

Kündigung und Widerruf haben eigene, im Footer erreichbare Formulare mit PDF-Eingangsbestätigung. In der Vorschau sind auch diese Erklärungen ausdrücklich unverbindliche Tests.

## Aktueller Status: lokale Vorschau

Der komplette technische Ablauf ist lokal ausführbar. Es werden **keine verbindlichen Verträge abgeschlossen, keine Lastschriften ausgelöst und keine externen E-Mails verschickt**. Testnachrichten werden als `.eml` außerhalb des öffentlichen Webverzeichnisses gespeichert. Der beiliegende Beispielvertrag verwendet ausschließlich synthetische Daten.

Für die produktive Aktivierung fehlen:

1. Vom Studio freigegebene Vertrags-/AGB-PDF und Widerrufsinformation, Dokumentversion sowie Entscheidung über unmittelbaren Vertragsschluss oder einen zunächst bestätigungspflichtigen Antrag. Die vorbereitete Liveansicht verwendet unmittelbaren Vertragsschluss.
2. Bestätigte Kündigungsfristen, Vertragsfortsetzung, Abrechnungstermine, Gläubiger-ID, SEPA-Mandat und Hinweis zum gewünschten vorzeitigen Trainingsbeginn.
3. Versanddienst, freigegebene Absenderadresse und SMTP-Zugang; Zugangsdaten gehören in die Serverumgebung, nicht in HTML oder Chat.
4. Produktiver HTTPS-Betrieb mit verwaltetem Prozess, persistenter Datenablage, Datensicherung, festem Verschlüsselungsschlüssel und betrieblich eingerichtetem Outbox-Retry. Hosting-/Mailanbieter und Aufbewahrungsfristen müssen in die Datenschutzhinweise übernommen werden.

Der Livebetrieb verweigert den Start bei fehlender Konfiguration. Die Aktivierung allein ersetzt keine Prüfung der Vertragsunterlagen und des Betriebs. Eine Studioverwaltungs- oder Bankanbindung für tatsächliche SEPA-Einzüge ist nicht enthalten; gespeichert wird das erteilte Mandat mit den Anmeldedaten. Ebenso ist kein öffentliches Verwaltungsportal enthalten.

## Technik und Daten

Python 3.12+, ReportLab, pypdf und cryptography. Abhängigkeiten: `fitnessstudio-premium/site-src/requirements.txt`. Start aus dem Projekt: `python3 site-src/serve.py`. Der Server lauscht lokal auf Port 8766. Reines statisches Hosting reicht für die neue Anmeldung nicht aus.

- `site-src/membership_api.py`: Validierung, verschlüsselte SQLite-Datensätze, PDFs, Outbox und SMTP.
- `site-src/membership_pages.py`, `assets/membership.css`, `assets/membership.js`: Seiten, Gestaltung und Formularablauf.
- `site-src/membership-config.example.json`: Vorlage ohne Zugangsdaten; für produktive Werte eine private Datei außerhalb des Webverzeichnisses verwenden.
- `site-src/test_membership.py`: elf Prüfungen für Kosten, Eingaben, Doppelklicks, PDF-Anhänge, Verschlüsselung, Zugriffsgrenzen, Serviceformulare und simulierte SMTP-Ausfälle.

Umgebungsvariablen: `MEMBERSHIP_MODE` (standardmäßig `preview`), `MEMBERSHIP_CONFIG`, `MEMBERSHIP_DATA_DIR`, `MEMBERSHIP_ENCRYPTION_KEY`, `PUBLIC_ORIGIN`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`. Für Livebetrieb separate Datenablage und dauerhaft denselben Fernet-Schlüssel verwenden. Der Schlüssel darf nicht verloren gehen. Private Daten werden nicht in das ZIP aufgenommen. Der lokale Python-HTTP-Server ist ein Vorschau-/Integrationsserver, kein fertig betriebener öffentlicher Dienst. Bei produktivem Reverse Proxy muss insbesondere die Begrenzung nach Clientadresse passend umgesetzt werden.

Nach Einrichtung im gleichen privaten Umfeld wiederholt `python3 site-src/membership_api.py --retry-outbox` ausstehende Nachrichten. Die SMTP-Prüfung wurde mit simulierten Antworten durchgeführt; echte Zustellung und Absenderauthentifizierung müssen nach Providerkonfiguration geprüft werden. SMTP-Annahme wird in der Oberfläche von noch ausstehendem Versand unterschieden.

Eine technisch notwendige Sitzung dauert vier Stunden. API-Antworten sind nicht cachebar, Downloads auf die jeweilige Sitzung beschränkt. Private Quellkonfiguration und Daten werden nicht öffentlich ausgeliefert. Daten sind auf Datensatzebene verschlüsselt; zum Betrieb gehört ein geregelter Zugang zu Schlüssel und Ablage.

## Bewegung

Alle `prefers-reduced-motion`- und `no-preference`-Bedingungen wurden auf ausdrücklichen Wunsch aus CSS und JavaScript entfernt. Lade-, Scroll- und Schrittanimationen werden dadurch nicht mehr über die Systemeinstellung abgeschaltet. Sichtbarkeit, Fokus und Hintergrund-Tabs werden weiterhin für einen stabilen Ablauf berücksichtigt. Es wurde keine dauerhafte JavaScript-Scrollschleife ergänzt.

## Prüfung und Grenzen

Elf Backend-/API-Tests bestanden. Die PDF-Anhänge der lokal erzeugten E-Mails stimmen bytegenau mit dem Download überein. Standard wurde am Desktop, Starter mobil durchgespielt. Der Beispielvertrag wurde gerendert und visuell geprüft. 15 Browseransichten der Start-, Preis- und drei neuen Formularseiten bei 1440, 1024 und 320 Pixeln waren ohne horizontalen Überlauf oder defekte Bilder. Der mobile Starter-Ablauf wurde bei 390 Pixeln einschließlich Download durchgeführt; eine Test-Widerrufserklärung erhielt ihre Bestätigung. Die Systemeinstellung für reduzierte Bewegung war testweise aktiv, ohne CSS-Bewegungssperren auszulösen. Eine höhere Conversion ist ein Gestaltungsziel und ohne Nutzungsdaten nicht nachgewiesen.

Die Vertragsoberfläche orientiert sich an den Anforderungen an [Bestellbestätigung und Kostenanzeige](https://www.gesetze-im-internet.de/bgb/__312j.html), [dauerhafte Vertragsbestätigung](https://www.gesetze-im-internet.de/bgb/__312f.html) und [Online-Kündigung](https://www.gesetze-im-internet.de/bgb/__312k.html). Das ist keine rechtliche Freigabe der bislang fehlenden individuellen Vertragsunterlagen.
