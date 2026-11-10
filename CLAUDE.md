# Ischias-Training – Projektnotizen

Private Web-App (Davids Rücken/Ischias). Täglich wechselnder Übungsplan mit animierten Strichfiguren, Timer, Sprachansagen und Musik. Kein Git-Repo, kein Jira-Ticket. Bei Git-Workflows vorher nachfragen.

## Grundprinzipien (nicht brechen)

- **Kein Build, keine Abhängigkeiten.** `index.html` muss per Doppelklick (`file://`) funktionieren. Deshalb gibt es keine ES-Module: Jede JS-Datei ist ein UMD-Wrapper (Browser: `window.X`, Node: `module.exports`), damit die Tests sie mit `require` laden können.
- **Logik ohne DOM** gehört in `js/plan.js`, **Daten** in `js/exercises.js`. Beide sind in `tests/plan.test.js` getestet.
- **Kein `alert()`/`confirm()`/`prompt()`.** In der Claude-Artifact-Ansicht sind sie blockiert. Stattdessen ein `<dialog>` in der Seite verwenden (Beispiel: `#confirm-exit`).
- **Farben nur als CSS-Tokens** in `:root`. Dark-Mode muss dreifach gepflegt werden: `:root`, `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` und `:root[data-theme="dark"]`.
- **Medizinisch vorsichtig formulieren.** Jede Übung hat bei Bedarf `caution`. Grundregel: Beinschmerz darf nicht zunehmen, Zentralisierung ist gut, Nervengleiten heißt gleiten und nicht dehnen. Warnzeichen stehen im Dialog `#disclaimer`.

## Neue Übung ergänzen

1. In `js/exercises.js` ein Objekt an `EXERCISES` anhängen:
   - `id` (kebab-case, eindeutig), `name`, `short`, `steps` (≥ 3), `tip`, `caution` (darf leer sein)
   - `categories`: eine oder mehrere aus `warmup | mobility | nerve | stretch | strength | cooldown`
   - `duration`: Sekunden bei Level „Normal“, **pro Seite**, wenn `sides: true`
   - `cycle`: Sekunden für einen Animationszyklus (A→B→A). Langsam halten 8–10, gleiten 4, kräftigen 6.
   - `prop`: optional `'chair'` (weitere Props in `PROPS` in `js/figure.js`)
   - `poses: { a, b }`: zwei Haltungen, die animiert werden
2. **Posen-Koordinaten:**
   - Seitenansicht, Person schaut nach links oder rechts. Boden liegt bei y ≈ 166–170, y wächst nach unten.
   - Gelenke: `head, neck, mid` (Wirbelsäulenmitte, macht den Rücken rund oder hohl), `hip`, `elbowN/handN/kneeN/footN` (zugewandte Seite, dunkel), `elbowF/…/footF` (abgewandte Seite, hell).
   - Arme starten am `neck`. Kopfmitte etwa 15–20 px vom `neck` entfernt.
   - Richtwerte für Längen: Rumpf ~60, Oberschenkel ~45, Unterschenkel ~45, Oberarm ~30, Unterarm ~28.
   - Immer von einer Basis-Haltung ableiten: `with_(HOOK | QUAD | PRONE | SEATED | KNEEL, { …nur geänderte Gelenke })`. Die Basis-Haltungen stehen oben in der Datei.
   - Erlaubter Bereich: x 0–260, y 25–180 (wird getestet). Der Ausschnitt wird pro Übung automatisch gezoomt (`fitViewBox`).
3. **Visuell prüfen:** `tools/poses.html` im Browser öffnen, optional nur eine Übung mit `#<id>`. Headless geht auch:
   `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --allow-file-access-from-files --screenshot=/tmp/p.png --window-size=1000,1400 file:///Users/dbelzer/ruecken/tools/poses.html`
4. **Tests ausführen (Docker):**
   `docker run --rm -v "$PWD":/app -w /app node:22-alpine node --test tests/*.test.js`
   - Die Tests prüfen unter anderem: vollständige Posen, keine Doppelungen im Tagesplan und dass sich jeder Tag vom Vortag unterscheidet (365 Tage, alle Level).
   - Wird eine Kategorie zu klein, können die Tests fehlschlagen. Dann eine weitere Übung in diese Kategorie aufnehmen.
5. Danach die README-Zahl „15 Übungen“ anpassen und das Artifact neu veröffentlichen (siehe unten).

## Tagesplan-Logik (js/plan.js)

- `LEVELS` (sanft / normal / aktiv) legt fest, wie viele Übungen pro Kategorie (`slots`) gezogen werden, und den Dauerfaktor.
- Der Plan ist deterministisch pro Datum: Seed = Datum + Level. Die Kette ab `EPOCH` (2025-01-01) sorgt dafür, dass Übungen vom Vortag nach hinten sortiert werden.
- Knappe Kategorien werden zuerst gezogen, damit es keine Doppelungen gibt. Die Reihenfolge im Training folgt trotzdem den `slots`.

## Veröffentlichung als Claude-Artifact (Handy)

- Link: https://claude.ai/artifact/UryhJeHLoXYXBBkhGrpqPa (privat, Icon „fitness“)
- Aktualisieren:
  1. `docker run --rm -v "$PWD":/app -w /app node:22-alpine node tools/build-artifact.js` erzeugt `dist/index.html`.
  2. Artifact-Tool: publish mit `url` = Link oben, `file_path` = `dist/index.html`, `files` = `css/styles.css` sowie `js/exercises.js`, `js/plan.js`, `js/figure.js`, `js/audio.js`, `js/app.js` (published path = Projektpfad).
  3. Vorher das Artifact einmal mit `action: "read"` lesen, das ist in einer neuen Sitzung Pflicht. Kein `icon` mitgeben.
- Im Artifact-Frame gilt: Audio erst nach Nutzer-Klick. Wake Lock und Sprachausgabe sind nicht garantiert. localStorage gilt nur pro Gerät.

## Offene Ideen / bekannte Schwächen

- Die Figuren „Piriformis (Figur 4)“ und „Knie-Pendel“ sind in der Seitenansicht schwer erkennbar. Idee: optionale Frontansicht.
- Eine eigene Musikdatei geht nach dem Neuladen verloren (Browser-Sicherheit). Idee: feste Datei im Projekt mitliefern.
- Die App ist keine installierbare PWA und funktioniert nicht offline über einen Service Worker.
- Schmerzverlauf: Bisher nur der Wert nach dem Training. Ideen: zusätzlich einen Wert vorher erfassen und einen kleinen Verlaufschart anzeigen.
