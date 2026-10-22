# Mausi Blast 🐭

Block-Puzzle im Stil von Block Blast – **ohne Werbung, ohne Tracker**, läuft im Browser und lässt sich
auf dem Handy wie eine App installieren (PWA, funktioniert auch offline).

Regeln und Punkteformel: siehe [`MAUSI_BLAST_SPEC.md`](MAUSI_BLAST_SPEC.md).

## Aufs Handy bringen

1. Auf GitHub im Repo: **Settings → Pages → Build and deployment → Source: „GitHub Actions“**.
2. Der Workflow `Deploy to GitHub Pages` baut und veröffentlicht bei jedem Push automatisch.
   Die Adresse ist dann `https://<github-name>.github.io/mausi-blast/`.
3. Adresse am Handy öffnen:
   - **iPhone (Safari):** Teilen-Symbol → „Zum Home-Bildschirm“.
   - **Android (Chrome):** ⋮-Menü → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.

Highscore und laufende Runde werden lokal auf dem Gerät gespeichert.

## Entwicklung

```bash
npm install
npm run dev      # lokaler Server mit Hot Reload
npm test         # Unit-Tests der Spiellogik
npm run build    # Produktions-Build nach dist/
```

## Aufbau

```
src/config.ts        alle Balancing-Zahlen (Punkte, Combo, Generator)
src/core/            reine Spiellogik, testbar ohne Browser
  pieces.ts          42 Steinformen
  board.ts           canPlace, place, hasAnyMove, isTraySolvable
  combo.ts           Combo-Zähler
  scoring.ts         Punkteformel
  generator.ts       fairer Stein-Generator (Füllgrad-Gewichtung, Gap-Assist, Lösbarkeits-Check)
  game.ts            Spielzustand, Züge, Revive
  rng.ts             seedbarer Zufall
src/state/storage.ts Speichern/Laden (localStorage)
src/ui/sound.ts      synthetisierte Sounds + Vibration
src/ui/skins.ts      Liste der Blockdesigns (Aussehen: Abschnitt „Blockdesigns“ in styles.css)
src/main.ts          Darstellung, Drag & Drop, Animationen
tests/               Unit-Tests (alle Testfälle aus der Spec)
public/              Manifest, Service Worker, Icons
```
