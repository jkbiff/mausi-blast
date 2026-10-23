# Mausi Blast – Game Spec (Block-Blast-Nachbau ohne Werbung)

> Diese Datei ist als Briefing für Claude Code gedacht. Einfach ins Projekt legen und sagen:
> „Lies MAUSI_BLAST_SPEC.md und bau das Spiel danach, Schritt für Schritt, mit Tests für die Spiellogik.“

## 0. Quellenlage – was ist gesichert, was ist Design-Entscheidung?

| Thema | Status |
|---|---|
| 8×8-Feld, 3 Steine pro Runde, keine Rotation, Reihen+Spalten clearen, Game Over | **gesichert** (offizielle Store-Beschreibung, alle Quellen) |
| Steinkatalog inkl. Diagonalen, 1×5, 3×3 | **gesichert** (Analyse der Android-App 10.8.1 + Simulator-Repo) |
| Combo-Regel (2 Fehlzüge erlaubt, 3. resettet) | **gesichert** für Android 10.8.1 Classic-Baseline |
| Punkteformel (10·K·L·(L−1), All-Clear 300) | **gesichert** für Android 10.8.1 Classic-Baseline; App hat Varianten/A-B-Tests |
| Stein-Generator der Original-App | **unbekannt** (nie veröffentlicht) → eigener Generator, Vorschlag unten |
| Revive, Animationen, Sounds, UI-Details | **Design-Entscheidung** für Mausi Blast |

Hungry Studio hat den Code nie veröffentlicht. Alles hier ist Spielmechanik (nicht urheberrechtlich geschützt). Für Mausi Blast eigene Grafiken, Sounds, Namen und Logo verwenden – nichts aus der Original-App übernehmen.

---

## 1. Grundregeln

- **Board:** 8 Zeilen × 8 Spalten, startet leer.
- **Tray:** Spieler sieht 3 Steine. Erst wenn **alle 3** platziert sind, kommen 3 neue. Keine Vorschau auf die nächsten.
- **Platzierung:** Stein beliebig aufs Feld ziehen. Jede belegte Zelle des Steins muss auf einer leeren Board-Zelle landen und im Feld bleiben. Leere Zellen innerhalb der Bounding-Box (z. B. bei Diagonalen) sind egal.
- **Keine Rotation**, keine Schwerkraft. Steine bleiben exakt da liegen, wo sie platziert wurden, bis sie gecleart werden.
- **Clear-Check nach jeder Platzierung:** Alle vollen Zeilen **und** Spalten werden gleichzeitig ermittelt und gemeinsam entfernt. Zeile + Spalte zählen als **2 Linien**; die gemeinsame Zelle wird nur einmal entfernt.
- **Game Over:** Wenn **keiner** der noch verbleibenden Tray-Steine (1–3) irgendwo legal passt. Ein einzelner nicht passender Stein ist kein Game Over, solange ein anderer noch passt.

## 2. Steinkatalog (42 Formen, feste Orientierung)

`X` = belegt, `.` = leer. Jede Rotation ist ein eigener Stein.

```ts
export const PIECES: Record<string, string[]> = {
  // Einzel
  "1x1": ["X"],
  // Balken horizontal
  "1x2": ["XX"], "1x3": ["XXX"], "1x4": ["XXXX"], "1x5": ["XXXXX"],
  // Balken vertikal
  "2x1": ["X","X"], "3x1": ["X","X","X"], "4x1": ["X","X","X","X"], "5x1": ["X","X","X","X","X"],
  // Quadrate & Rechtecke
  "2x2": ["XX","XX"], "3x3": ["XXX","XXX","XXX"],
  "2x3": ["XXX","XXX"], "3x2": ["XX","XX","XX"],
  // Kleine Ecken (3 Zellen)
  "L2_a": ["XX","X."], "L2_b": ["XX",".X"], "L2_c": ["X.","XX"], "L2_d": [".X","XX"],
  // L / J (4 Zellen)
  "L3_a": ["XXX","X.."], "L3_b": ["XXX","..X"], "L3_c": ["X..","XXX"], "L3_d": ["..X","XXX"],
  "L3_e": ["X.","X.","XX"], "L3_f": [".X",".X","XX"], "L3_g": ["XX","X.","X."], "L3_h": ["XX",".X",".X"],
  // Große Ecken (5 Zellen)
  "L5_a": ["XXX","X..","X.."], "L5_b": ["XXX","..X","..X"], "L5_c": ["X..","X..","XXX"], "L5_d": ["..X","..X","XXX"],
  // S / Z
  "S_h": [".XX","XX."], "Z_h": ["XX.",".XX"], "S_v": ["X.","XX",".X"], "Z_v": [".X","XX","X."],
  // T
  "T_up": [".X.","XXX"], "T_down": ["XXX",".X."], "T_left": ["X.","XX","X."], "T_right": [".X","XX",".X"],
  // Plus
  "PLUS": [".X.","XXX",".X."],
  // Diagonalen (nur Ecken berühren sich)
  "D2_a": ["X.",".X"], "D2_b": [".X","X."],
  "D3_a": ["X..",".X.","..X"], "D3_b": ["..X",".X.","X.."],
};
```

Größter Stein: 3×3 (9 Zellen).

## 3. Combo-System (Original-Verhalten, Android 10.8.1 Classic)

Interner Zähler `C` (startet bei 0) und `missStreak` (Platzierungen ohne Clear in Folge).

```
nach jeder Platzierung:
  if (linesCleared > 0):
      C += 1                 // auch bei Multi-Line nur +1
      missStreak = 0
  else:
      missStreak += 1
      if (missStreak >= 3): C = 0   // 3. Fehlzug in Folge resettet
```

- Gezählt werden **einzelne platzierte Steine**, nicht Trays.
- Beispiele: Clear → kein → kein → Clear = C 1, dann 2. Clear → kein → kein → kein → Clear = C 1, dann 1.
- **Anzeige:** Bei C = 1 kein Label. Bei C = 2 „COMBO“ ohne Zahl. Ab C = 3 „COMBO {C−1}“. (Für Mausi Blast frei änderbar, z. B. einfach „Combo ×C“.)

> **Stand Mausi Blast:** Die Punktewertung ist an Bildschirmaufnahmen der Original-App gemessen:
> 1 Punkt pro Block, pro abgeräumter Linie 51 × Combo + 56 (ohne Obergrenze), +300 bei
> Komplettabräumung (siehe `src/config.ts`). Abschnitt 4 unten beschreibt die ursprüngliche Spec und gilt nicht mehr.

## 4. Punkteformel (Original-Baseline)

`C` wird **vor** der Wertung des Zugs aktualisiert. `K = C`. `L` = Anzahl voller Zeilen + Spalten in diesem Zug.

```
punkte = platzierteZellen                  // 1 Punkt pro Zelle des Steins
       + linienPunkte(L, K)
       + allClearBonus

linienPunkte(L, K):
  L == 0 → 0
  L == 1 → 10 * K
  L >= 2 → 10 * K * L * (L - 1)

allClearBonus = 300, wenn Board nach dem Clear komplett leer
                UND dealRound >= 6   (dealRound = Anzahl ausgeteilter Trays)
                sonst 0
```

| L | Punkte bei K=1 | K=2 |
|---|---|---|
| 1 | 10 | 20 |
| 2 | 20 | 40 |
| 3 | 60 | 120 |
| 4 | 120 | 240 |
| 5 | 200 | 400 |
| 6 | 300 | 600 |

All-Clear-Bonus wird **nicht** mit K multipliziert.

### Testfälle (als Unit-Tests übernehmen)

| Situation | Erwartung |
|---|---|
| 4-Zellen-Stein füllt 1 Linie, erster Clear (C→1), Board nicht leer | 4 + 10 = **14** |
| dasselbe als Folge-Clear (C→2) | 4 + 20 = **24** |
| 1×1 schließt Zeile + Spalte gleichzeitig, C→1, Board nicht leer | 1 + 20 = **21** |
| 1×1 schließt einzige belegte Zeile, Board leer, dealRound = 6, C→1 | 1 + 10 + 300 = **311** |
| dasselbe bei dealRound = 5 | **11** |
| 3×3 in Ecke schließt 3 Zeilen + 3 Spalten, C→1, Board nicht leer | 9 + 300 = **309** |
| Sequenz: 1×1 cleart Zeile (11) → 3×3 kein Clear (9) → 1×5 cleart Zeile, C→2 (25) | gesamt **45** |
| Combo: Clear, 2× kein Clear, Clear | C = 2 beim zweiten Clear |
| Combo: Clear, 3× kein Clear, Clear | C = 1 beim zweiten Clear |

Optional (Original-Varianten, nicht Pflicht): Multiplikator ab C≈11 abflachen (11→11, 12→11, 13→12).

## 5. Stein-Generator (eigenes Design, Original ist unbekannt)

Ziel: fair wirken, nicht frustrieren, trotzdem schwierig bleiben. Bewährter Ansatz aus einem Open-Source-Browser-Klon:

1. **Gewichtung nach Füllgrad** `fill = belegte Zellen / 64`:
   - fill < 0.35: alle Steine ungefähr gleich gewichtet (große Steine leicht reduziert).
   - fill 0.35–0.6: Steine ≤ 3 Zellen ×1.5, Steine ≥ 6 Zellen ×0.6.
   - fill > 0.6: Steine ≤ 3 Zellen ×2.5, Steine ≥ 6 Zellen ×0.2.
2. **Gap-Assist:** Ab fill > 0.25 mit 60 % Wahrscheinlichkeit nach einer offenen Lücke suchen (z. B. eine Zeile/Spalte mit genau 1–5 zusammenhängenden freien Zellen, sonst voll) und einen Tray-Slot durch einen passenden Balken ersetzen.
3. **Spielbarkeits-Check:** Kandidaten-Tray simulieren: Gibt es eine Reihenfolge + Positionen, mit denen **alle 3** Steine platzierbar sind (inkl. Clears zwischendurch)? Bis zu 20 Versuche.
   - Fallback 1: Tray, bei dem mindestens 1 Stein passt.
   - Fallback 2: rein zufälliger Tray (dann kann Game Over kommen – gewollt).
4. Keine 3 identischen Steine in einem Tray.

Alle Zahlen als Konstanten in einer `config.ts`, damit man das Balancing später tunen kann.

## 6. Revive (Ersatz für „Werbung schauen“)

Original: Revive gegen Werbung/Kauf. Mausi Blast: **1× pro Runde gratis**.
- Bei Game Over: Button „Weiterspielen (1×)“.
- Effekt (Vorschlag): Die 3 vollsten Zeilen leeren, Score bleibt, Combo resettet, neuer Tray (mit Spielbarkeits-Check).
- Danach beim nächsten Game Over endgültig vorbei.

## 7. Spielmodi

**v1 (MVP):** Classic / Endlos-Highscore.

**v2 (optional):**
- **Adventure:** Levels mit Ziel, z. B. „X Edelsteine sammeln“ – bestimmte Zellen starten mit Edelstein-Steinen, die eingesammelt werden, wenn ihre Zeile/Spalte gecleart wird. Oder „Score Y erreichen“. Fortschritt schaltet Puzzle-Bild-Teile frei (Original nutzt Jigsaw-Motive) – hier z. B. eigene Fotos als Puzzle.
- **Daily Puzzle:** Täglich gleicher Seed (Datum als Seed für den Generator), feste Startbelegung.

## 8. UX & Game Feel (macht den Unterschied)

- **Drag:** Stein beim Anfassen auf Board-Zellgröße skalieren, mit Versatz über dem Finger anzeigen (sonst verdeckt der Daumen alles). Snap auf nächste gültige Zelle.
- **Ghost-Preview:** Halbtransparente Vorschau, wo der Stein landet. Ungültige Position → keine Vorschau, Stein fliegt beim Loslassen zurück in den Tray.
- **Clear-Vorschau:** Zeilen/Spalten, die durch diese Platzierung voll würden, schon beim Ziehen hervorheben.
- **Clear-Animation:** Zellen kurz aufleuchten, dann nacheinander (Welle) wegpoppen, ~250–400 ms.
- **Score:** Hochzählen statt springen, „+Punkte“-Popup am Clear-Ort, Combo-Text groß und kurz.
- **All-Clear:** eigene, auffällige Animation.
- **Nicht platzierbare Tray-Steine** ausgegraut darstellen.
- **Haptik** (Vibration API / Flutter HapticFeedback) bei Platzieren und Clear, **Sounds** mit Tonhöhe steigend pro Combo-Stufe. Beides abschaltbar.
- **Persistenz:** Highscore + laufendes Spiel lokal speichern (Reload = weiterspielen).
- **Farben:** Jeder Stein bekommt beim Austeilen eine zufällige Farbe aus einer Palette; Farbe hat keine Spielbedeutung.

## 9. Architektur-Vorschlag

Spiellogik strikt getrennt von der Darstellung, damit sie testbar ist:

```
/core        board.ts, pieces.ts, scoring.ts, combo.ts, generator.ts, rng.ts (seedbar)
/ui          Rendering, Drag & Drop, Animationen
/state       Spielzustand, Save/Load
/tests       alle Testfälle aus Abschnitt 4 + Generator-Tests
config.ts    alle Balancing-Zahlen
```

Kernfunktionen:
- `canPlace(board, piece, row, col): boolean`
- `place(board, piece, row, col): { board, clearedRows, clearedCols }`
- `hasAnyMove(board, pieces): boolean`
- `isTraySolvable(board, pieces): boolean` (Backtracking über Reihenfolgen + Positionen)
- `scoreMove(...)` und `updateCombo(...)` als reine Funktionen

**Tech-Optionen:**
- **Web/PWA** (TypeScript + Vite + Canvas oder DOM-Grid): am schnellsten, läuft auf jedem Handy, als App auf den Homescreen installierbar, kein App Store nötig.
- **Flutter:** echte native App für Android/iOS, bessere Haptik.

## 10. Startprompt für Claude Code

```
Lies MAUSI_BLAST_SPEC.md. Baue „Mausi Blast“ als [PWA mit TypeScript + Vite | Flutter-App].
1. Zuerst /core mit allen Regeln aus Abschnitt 1–5 und Unit-Tests für jeden Testfall aus Abschnitt 4.
2. Dann ein spielbares UI mit Drag & Drop, Ghost-Preview und Clear-Vorschau.
3. Dann Animationen, Sounds, Haptik, Highscore, Save/Load, Revive.
Keine Werbung, keine Tracker, keine Fremd-Assets. Eigene Farben und Sounds.
```
