# 30-Tage-WhatsApp-Challenge

Stand: 10. September 2026. Implementiert als ausdrücklich gekennzeichnete Demo. Die tatsächliche WhatsApp-Zielnummer und der Ablauf im echten Chat sind noch offen.

## Umfang

- Eigene Seite `/whatsapp-challenge/` im bestehenden Gelb-/Graphit-Design, mit lokalem Originallogo, responsivem Hero und animierten Dialogschritten.
- Sichtbare Einstiege im Startseiten-Hero, als eigener Startseiten-Abschnitt, in Navigation und Footer sowie auf Training und Probetraining.
- Vier Grundfragen: Ziel, Erfahrung, Zeit pro Training und Trainingshäufigkeit. Die fünfte Frage hängt von Erfahrung und Ziel ab: Einstieg, Wiedereinstieg, Kraft-Fokus, Ausdauer-Fokus oder Trainingsumfeld.
- Bearbeitbares Startprofil mit korrekter Berechnung des gewünschten wöchentlichen Zeitbudgets. Keine Diagnosen, Erfolgsversprechen oder automatisch erstellten Trainingspläne.
- Nach dem Quiz: prominente Demo-Startkarte für die kostenlose 30-Tage-Challenge, lokal erzeugter Beispiel-QR, drei verständliche Schritte und eine interaktive Chat-Vorschau mit dem gewählten Profil.
- Der später aktivierbare WhatsApp-Modus behält Direktlink, lokale QR-Erzeugung, Nachrichtenvorschau und Kopierfunktion.

## Konfiguration

`site-src/challenge-config.json` enthält ausschließlich öffentliche Einstellungen:

- `whatsapp_number`: bestätigte WhatsApp-Nummer im internationalen Format, nur Ziffern, ohne `+`, Leerzeichen oder führende nationale Null. Leer bedeutet: kein echter WhatsApp-Link. Im Demo-Modus wird stattdessen ein Beispiel-QR mit einem allgemeinen Text ohne Profilangaben erzeugt. Eine vorhandene Studio-Festnetznummer wird nicht automatisch übernommen.
- `demo_enabled`: aktuell `true`. Zeigt unabhängig von einer eventuell hinterlegten Nummer ausschließlich die Demo. Für eine echte Übergabe muss dieses Feld bewusst auf `false` gesetzt und die Zielnummer eingerichtet werden.
- `message_keyword`: Startwort der vorbereiteten Nachricht, derzeit `30TAGE`. Wenn ein vorhandener Bot ein anderes Startwort benötigt, muss das mit dessen tatsächlicher Integration abgeglichen werden.
- `price_note`: derzeit „Kostenlose 30-Tage-Challenge · Interaktive Demo“ entsprechend der Nutzeranforderung. Die Demo-Karte zeigt 0 €; sie löst keine Anmeldung aus.
- `handoff_mode`: aktuell `chat_request`; implementiert ist ausschließlich eine vom Besucher selbst abgesendete Chat-Anfrage. Das Feld aktiviert keinen Bot oder Nachrichtenversand.

Nach Änderung mit Python 3.12+ neu bauen:

```sh
python3 site-src/export_vercel.py
node --test site-src/test_challenge.mjs
```

Der Export enthält nur die freigegebene Website. Der Browser erhält die benötigten öffentlichen Einstellungen als eingebettetes JSON, nicht die Quelldateien. Noindex bleibt aktiv.

## Grenze zur WhatsApp-Anwendung

In der aktuellen Demo enthält der QR-Code nur den klar gekennzeichneten Beispieltext. Er öffnet keinen Chat und enthält keine Antworten. „Kostenlosen Start ausprobieren“ zeigt eine lokale, als Beispiel gekennzeichnete Chat-Vorschau. Es gibt keine echte Anmeldung, Verbindung oder Nachrichtenübermittlung.

Erst im aktivierten WhatsApp-Modus öffnen Button und QR-Code einen `https://wa.me/…?text=…`-Link mit dem Startprofil. Der Besucher muss die Nachricht in WhatsApp prüfen und selbst absenden. Ein Klick oder Scan ist kein Nachweis einer gesendeten Nachricht, verbundenen Telefonnummer oder gestarteten Challenge.

Es gibt bisher keine angegebene WhatsApp-Business-/Bot-Anbindung, keine bestätigten täglichen Inhalte und keine festgelegte Nachrichtenfrequenz. Diese Website richtet daher weder eine automatische 30-tägige Zustellung noch ein Abonnement ein. Eine bestehende Bot-URL, ein Gruppenlink oder ein Kanal-Link ist keine austauschbare Telefonnummer; bei solchen Zielen muss geprüft werden, ob und wie das Startprofil übernommen werden kann.

Für die Freischaltung fehlen die bestätigte Zielnummer bzw. der genaue Bot-Link sowie die Bestätigung des tatsächlichen Nachrichtenablaufs. Die kostenlose Ausrichtung ist durch den Nutzer vorgegeben; Bewegungsimpulse und Motivation werden im Demo-Ablauf als geplant beschrieben. Bei deaktivierter Demo ohne Zielnummer bleibt der bisherige Einrichtungshinweis mit Kopierfunktion erhalten. Es steht keine fiktive Nummer in der Website-Konfiguration.

## Daten und Performance

Die fünf Auswahlwerte verbleiben zunächst im Browser. `sessionStorage` erhält sie innerhalb dieses Tabs beim Neuladen; Einträge älter als 24 Stunden werden beim nächsten Aufruf ignoriert. Zurücksetzen löscht den gespeicherten Stand. Ohne verfügbaren Browser-Speicher funktioniert der Dialog weiter im Arbeitsspeicher.

Es werden keine Namen, E-Mail-Adressen oder Telefonnummern abgefragt und keine Challenge-Formulare an einen eigenen Server gesendet. Nur im aktivierten echten WhatsApp-Modus enthält der Startlink die gewählten Präferenzen. Beim Öffnen werden diese an WhatsApp übermittelt; der eigentliche Chatversand erfolgt anschließend durch den Besucher. Die Datenschutzhinweise beschreiben diesen Ablauf.

Marketingseiten laden nur das kleine gemeinsame Stylesheet. Dialog und Entscheidungsmodell werden nur auf der Challenge-Seite geladen. Die etwa 45 KB große QR-Bibliothek wird lokal gegen Ende des Dialogs nachgeladen, wenn die Demo aktiv oder eine gültige Zielnummer konfiguriert ist. Sie nutzt keinen externen QR-Dienst. Der QR-Code hat eine weiße Ruhezone; bei Ladefehlern bleibt je nach Modus der lokale Demo-Start oder der direkte Link verfügbar, und der QR-Code kann erneut geladen werden. Schrittwechsel verwenden kurze native Animationen. Es gibt keine Polling- oder Scroll-Animationsschleife.

## Prüfung und Bibliothek

`site-src/test_challenge.mjs` prüft alle 324 gültigen Antwortkombinationen, die fünf Zweige, Profiländerungen, ungültige Eingaben, Empfängerprüfung und URL-Inhalt. Die lokalen Browserprüfungen ergänzen Tastaturbedienung, mobile Layouts, Wiederherstellung, QR-Ladefehler und Kopier-Fallbacks. Die QR-Ausgaben wurden unabhängig mit einem anderen Decoder geprüft, auch anhand eines tatsächlich gerenderten Browser-Screenshots. Dabei wurde ausschließlich eine fiktive Nummer in einer separaten lokalen Testansicht verwendet; es wurde kein WhatsApp-Link geöffnet und keine Nachricht gesendet.

QR-Code-Erzeugung: [Nayuki QR Code generator library](https://www.nayuki.io/page/qr-code-generator-library), Version 1.8.0, MIT-Lizenz. Der vollständige Lizenztext bleibt in `assets/vendor/qrcodegen-1.8.0.js` erhalten. Die einzige Ergänzung zur Bibliothek ist ein ES-Modul-Export. WhatsApp-Linkformat: [offizielle Click-to-Chat-Hilfe](https://faq.whatsapp.com/5913398998672934).
