# Ischias-Training

Web-App mit einem täglich leicht wechselnden Übungsplan bei Ischiasschmerzen. Sie hat animierte Übungsfiguren, einen Timer mit Countdown-Tönen, Sprachansagen und Hintergrundmusik.

> ⚠️ Die App ersetzt keine ärztliche oder physiotherapeutische Beratung. Die Warnzeichen stehen in der App unter „Wichtige Hinweise“.

## Starten

Ohne Build und ohne Installation: **`index.html` im Browser öffnen** (Doppelklick).

Alternativ über einen Webserver, etwa um die App im WLAN auf dem Handy zu öffnen:

```bash
docker run --rm -p 8080:80 -v "$PWD":/usr/share/nginx/html:ro nginx:alpine
# → http://localhost:8080 bzw. http://<IP-des-Macs>:8080 auf dem Handy
```

## Funktionen

- **Tagesplan:** deterministisch pro Datum und garantiert anders als am Vortag. Mit ‹ › kannst du andere Tage ansehen.
- **Intensität:**
  - *Sanft*: für akute Tage, ohne Kräftigung
  - *Normal*
  - *Aktiv*: längere Übungen und mehr Kräftigung
- **15 Übungen** aus Aufwärmen, Mobilisation, Nervengleiten, Dehnung, Kräftigung und Entspannung. Jede Übung hat eine animierte Figur, eine Schritt-für-Schritt-Anleitung, einen Tipp und einen Warnhinweis.
- **Timer:**
  - Vorbereitung, Übung, Pause mit Vorschau auf die nächste Übung
  - automatischer Seitenwechsel bei einseitigen Übungen
  - Pause, Vor und Zurück
  - der Bildschirm bleibt an (Wake Lock)
- **Musik:**
  - generierter ruhiger Klangteppich oder Meeresrauschen (Web Audio, ohne Dateien und Lizenzen)
  - alternativ eine eigene Musikdatei
- **Verlauf:** Trainingsserie und Schmerzwert (0–10) nach jeder Einheit. Gespeichert wird nur lokal im Browser.

## Struktur

| Datei | Inhalt |
|---|---|
| `js/exercises.js` | Übungskatalog inkl. Körperhaltungen (2 Keyframes) für die Animation |
| `js/plan.js` | reine Logik: Tagesplan, Ablauf, Serie, Formatierung |
| `js/figure.js` | SVG-Strichfigur und Animation |
| `js/audio.js` | Musik-Generator, eigene Datei, Signaltöne |
| `js/app.js` | Oberfläche und Trainingsablauf |
| `tests/` | Unit-Tests (`node:test`) |

## Tests

```bash
npm run test:docker   # in Docker (node:22-alpine)
npm test              # mit lokalem Node
```
