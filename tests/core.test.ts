import { describe, expect, it } from "vitest";
import {
  canPlace, emptyBoard, findFullLines, hasAnyMove, idx, isTraySolvable, place, type Board,
} from "../src/core/board";
import { comboLabel, updateCombo, type ComboState } from "../src/core/combo";
import { findGapBars, generateTray, pieceWeight } from "../src/core/generator";
import { canRevive, newGame, playMove, revive, type GameState } from "../src/core/game";
import { getPiece, PIECES } from "../src/core/pieces";
import { Rng } from "../src/core/rng";
import { linePoints, scoreMove } from "../src/core/scoring";

const N = 8;

/** Board aus 8 Strings ("X" = belegt). */
function boardFrom(rows: string[]): Board {
  const b = emptyBoard();
  rows.forEach((line, r) => [...line].forEach((ch, c) => (b[idx(r, c)] = ch === "X" ? 1 : 0)));
  return b;
}

function stateWith(board: Board, tray: string[], extra: Partial<GameState> = {}): GameState {
  return {
    version: 1,
    board,
    tray: [0, 1, 2].map((i) => (tray[i] ? { pieceId: tray[i], color: i + 1 } : null)),
    score: 0,
    combo: 0,
    missStreak: 0,
    dealRound: 1,
    reviveUsed: false,
    gameOver: false,
    rngState: 42,
    ...extra,
  };
}

describe("Steinkatalog", () => {
  it("hat 42 Formen, größter Stein ist 3×3 mit 9 Zellen", () => {
    expect(PIECES).toHaveLength(42);
    expect(Math.max(...PIECES.map((p) => p.size))).toBe(9);
    expect(getPiece("3x3").size).toBe(9);
    expect(getPiece("D3_a").cells).toEqual([[0, 0], [1, 1], [2, 2]]);
  });
});

describe("Board", () => {
  it("prüft Grenzen und Belegung, leere Bounding-Box-Zellen sind egal", () => {
    const b = emptyBoard();
    b[idx(0, 1)] = 1;
    const diag = getPiece("D2_a");
    expect(canPlace(b, diag, 0, 0)).toBe(true); // (0,1) liegt in der Box, ist aber im Stein leer
    expect(canPlace(b, getPiece("1x2"), 0, 0)).toBe(false);
    expect(canPlace(b, getPiece("1x5"), 0, 4)).toBe(false); // ragt raus
    expect(canPlace(b, getPiece("1x5"), 1, 3)).toBe(true);
  });

  it("entfernt Zeile + Spalte gleichzeitig, Kreuzung nur einmal", () => {
    const b = emptyBoard();
    for (let i = 0; i < N; i++) if (i !== 3) { b[idx(3, i)] = 1; b[idx(i, 3)] = 1; }
    const res = place(b, getPiece("1x1"), 3, 3);
    expect(res.clearedRows).toEqual([3]);
    expect(res.clearedCols).toEqual([3]);
    expect(res.clearedCells).toHaveLength(15);
    expect(res.board.every((v) => v === 0)).toBe(true);
  });

  it("findFullLines erkennt volle Zeilen und Spalten", () => {
    const b = boardFrom(["XXXXXXXX", "X", "X", "X", "X", "X", "X", "X"]);
    expect(findFullLines(b)).toEqual({ rows: [0], cols: [0] });
  });

  it("Game Over nur, wenn kein verbleibender Stein passt", () => {
    const full = boardFrom(Array(8).fill("XXXXXXX."));
    expect(hasAnyMove(full, [getPiece("1x2")])).toBe(false);
    expect(hasAnyMove(full, [getPiece("1x2"), getPiece("1x1")])).toBe(true);
  });

  it("isTraySolvable berücksichtigt Clears zwischendurch", () => {
    // Nur Spalte 7 frei: ein 3x1 passt, danach ist nichts mehr frei – außer durch den Clear.
    const b = boardFrom(["XXXXXXX.", "XXXXXXX.", "XXXXXXX.", "XXXXXXXX", "XXXXXXXX", "XXXXXXXX", "XXXXXXXX", "XXXXXXXX"]);
    expect(isTraySolvable(b, [getPiece("3x1"), getPiece("1x5")])).toBe(true);
    expect(isTraySolvable(b, [getPiece("2x2")])).toBe(false);
    expect(isTraySolvable(emptyBoard(), [getPiece("3x3"), getPiece("3x3"), getPiece("1x5")])).toBe(true);
  });
});

describe("Combo", () => {
  const run = (pattern: boolean[]): number[] => {
    let s: ComboState = { combo: 0, missStreak: 0 };
    const atClears: number[] = [];
    for (const clear of pattern) {
      s = updateCombo(s, clear ? 1 : 0);
      if (clear) atClears.push(s.combo);
    }
    return atClears;
  };

  it("Clear, 2× kein Clear, Clear → C = 2", () => {
    expect(run([true, false, false, true])).toEqual([1, 2]);
  });

  it("Clear, 3× kein Clear, Clear → C = 1", () => {
    expect(run([true, false, false, false, true])).toEqual([1, 1]);
  });

  it("Multi-Line zählt nur +1", () => {
    expect(updateCombo({ combo: 2, missStreak: 1 }, 4)).toEqual({ combo: 3, missStreak: 0 });
  });

  it("Label erst ab C = 2", () => {
    expect(comboLabel(1)).toBeNull();
    expect(comboLabel(3)).toBe("Combo ×3");
  });
});

describe("Punkte", () => {
  it("Linienpunkte-Tabelle", () => {
    expect([1, 2, 3, 4, 5, 6].map((l) => linePoints(l, 1))).toEqual([10, 20, 60, 120, 200, 300]);
    expect([1, 2, 3, 4, 5, 6].map((l) => linePoints(l, 2))).toEqual([20, 40, 120, 240, 400, 600]);
    expect(linePoints(0, 5)).toBe(0);
  });

  it("4-Zellen-Stein füllt 1 Linie, erster Clear → 14", () => {
    expect(scoreMove({ placedCells: 4, linesCleared: 1, combo: 1, boardEmptyAfter: false, dealRound: 1 })).toBe(14);
  });

  it("dasselbe als Folge-Clear (C→2) → 24", () => {
    expect(scoreMove({ placedCells: 4, linesCleared: 1, combo: 2, boardEmptyAfter: false, dealRound: 1 })).toBe(24);
  });

  it("1×1 schließt Zeile + Spalte → 21", () => {
    expect(scoreMove({ placedCells: 1, linesCleared: 2, combo: 1, boardEmptyAfter: false, dealRound: 1 })).toBe(21);
  });

  it("All-Clear bei dealRound 6 → 311, bei 5 → 11", () => {
    expect(scoreMove({ placedCells: 1, linesCleared: 1, combo: 1, boardEmptyAfter: true, dealRound: 6 })).toBe(311);
    expect(scoreMove({ placedCells: 1, linesCleared: 1, combo: 1, boardEmptyAfter: true, dealRound: 5 })).toBe(11);
  });

  it("All-Clear-Bonus wird nicht mit K multipliziert", () => {
    expect(scoreMove({ placedCells: 1, linesCleared: 1, combo: 3, boardEmptyAfter: true, dealRound: 6 })).toBe(331);
  });
});

describe("Spielzüge (playMove)", () => {
  it("4-Zellen-Stein füllt 1 Linie, erster Clear → 14", () => {
    const b = boardFrom(["XXXX....", "X"]);
    const r = playMove(stateWith(b, ["1x4", "1x1", "1x1"]), 0, 0, 4);
    expect(r.points).toBe(14);
    expect(r.combo).toBe(1);
  });

  it("1×1 schließt Zeile + Spalte gleichzeitig → 21", () => {
    const rows = Array(8).fill("...X....");
    rows[3] = "XXX.XXXX";
    rows[0] = "X..X....";
    const r = playMove(stateWith(boardFrom(rows), ["1x1", "1x1", "1x2"]), 0, 3, 3);
    expect(r.linesCleared).toBe(2);
    expect(r.points).toBe(21);
  });

  it("1×1 schließt einzige belegte Zeile, Board leer: dealRound 6 → 311, 5 → 11", () => {
    const b = boardFrom(["XXXXXXX."]);
    const six = playMove(stateWith(b, ["1x1", "1x2", "1x3"], { dealRound: 6 }), 0, 0, 7);
    expect(six.points).toBe(311);
    expect(six.allClear).toBe(true);
    const five = playMove(stateWith(b, ["1x1", "1x2", "1x3"], { dealRound: 5 }), 0, 0, 7);
    expect(five.points).toBe(11);
    expect(five.allClear).toBe(false);
  });

  it("3×3 in Ecke schließt 3 Zeilen + 3 Spalten → 309", () => {
    const rows = [
      "...XXXXX",
      "...XXXXX",
      "...XXXXX",
      "XXX.....",
      "XXX.....",
      "XXX.....",
      "XXX.....",
      "XXX....X",
    ];
    const r = playMove(stateWith(boardFrom(rows), ["3x3", "1x1", "1x2"]), 0, 0, 0);
    expect(r.linesCleared).toBe(6);
    expect(r.points).toBe(309);
  });

  it("Sequenz: 1×1 cleart Zeile (11) → 3×3 kein Clear (9) → 1×5 cleart Zeile, C→2 (25) = 45", () => {
    const rows = Array(8).fill("........");
    rows[0] = "XXXXXXX.";
    rows[5] = "XXX.....";
    let s = stateWith(boardFrom(rows), ["1x1", "3x3", "1x5"]);
    const a = playMove(s, 0, 0, 7);
    s = a.state;
    const b = playMove(s, 1, 1, 0);
    s = b.state;
    const c = playMove(s, 2, 5, 3);
    expect([a.points, b.points, c.points]).toEqual([11, 9, 25]);
    expect(c.combo).toBe(2);
    expect(c.state.score).toBe(45);
  });

  it("nach dem dritten Stein wird neu ausgeteilt", () => {
    let s = stateWith(emptyBoard(), ["1x1", "1x1", "1x2"]);
    s = playMove(s, 0, 0, 0).state;
    s = playMove(s, 1, 2, 2).state;
    const r = playMove(s, 2, 4, 4);
    expect(r.dealtNewTray).toBe(true);
    expect(r.state.tray.every((t) => t !== null)).toBe(true);
    expect(r.state.dealRound).toBe(2);
  });

  it("Game Over, wenn kein verbleibender Stein passt; Revive einmal möglich", () => {
    // Schachbrett: kein 2×2 passt irgendwo, der 1×1 schließt keine Linie.
    const rows = Array.from({ length: 8 }, (_, r) => (r % 2 ? ".X.X.X.X" : "X.X.X.X."));
    const s0 = stateWith(boardFrom(rows), ["1x1", "2x2", "2x2"]);
    const r = playMove(s0, 0, 0, 1);
    expect(r.linesCleared).toBe(0);
    expect(r.state.gameOver).toBe(true);
    expect(canRevive(r.state)).toBe(true);
    const rv = revive(r.state);
    expect(rv.state.gameOver).toBe(false);
    expect(rv.state.reviveUsed).toBe(true);
    expect(rv.state.score).toBe(r.state.score);
    expect(rv.state.combo).toBe(0);
    expect(canRevive({ ...rv.state, gameOver: true })).toBe(false);
  });

  it("neues Spiel ist deterministisch per Seed", () => {
    expect(newGame(123).tray).toEqual(newGame(123).tray);
    expect(newGame(123).dealRound).toBe(1);
  });
});

describe("Generator", () => {
  it("Gewichtung nach Füllgrad", () => {
    const small = getPiece("1x2");
    const big = getPiece("3x3");
    expect(pieceWeight(small, 0.1)).toBe(1);
    expect(pieceWeight(big, 0.1)).toBeLessThan(1);
    expect(pieceWeight(small, 0.5)).toBe(1.5);
    expect(pieceWeight(big, 0.5)).toBe(0.6);
    expect(pieceWeight(small, 0.7)).toBe(2.5);
    expect(pieceWeight(big, 0.7)).toBe(0.2);
  });

  it("Gap-Assist findet Lücken in sonst vollen Linien", () => {
    const b = boardFrom(["XXX..XXX"]);
    const ids = findGapBars(b).map((p) => p.id);
    expect(ids).toContain("1x2");
  });

  it("Trays sind auf leerem Board immer komplett lösbar, nie 3 gleiche", () => {
    const rng = new Rng(7);
    for (let i = 0; i < 200; i++) {
      const tray = generateTray(emptyBoard(), rng);
      expect(tray).toHaveLength(3);
      expect(new Set(tray.map((p) => p.id)).size).toBeGreaterThan(1);
      expect(isTraySolvable(emptyBoard(), tray)).toBe(true);
    }
  });

  it("bei fast vollem Board passt mindestens ein Stein, wenn möglich", () => {
    const b = boardFrom(["XXXXXXX.", "XXXXXXXX", "XXXXXXXX", "XXXXXXXX", "XXXXXXXX", "XXXXXXXX", "XXXXXXXX", "XXXXXXX."]);
    const rng = new Rng(99);
    for (let i = 0; i < 30; i++) {
      expect(hasAnyMove(b, generateTray(b, rng))).toBe(true);
    }
  });

  it("simulierte Partien laufen ohne Fehler und zählen Punkte", () => {
    for (let seed = 1; seed <= 5; seed++) {
      let s = newGame(seed);
      let moves = 0;
      while (!s.gameOver && moves < 300) {
        let done = false;
        for (let slot = 0; slot < 3 && !done; slot++) {
          const t = s.tray[slot];
          if (!t) continue;
          const p = getPiece(t.pieceId);
          for (let r = 0; r < 8 && !done; r++) for (let c = 0; c < 8 && !done; c++) {
            if (canPlace(s.board, p, r, c)) {
              s = playMove(s, slot, r, c).state;
              done = true;
            }
          }
        }
        expect(done).toBe(true);
        moves++;
      }
      expect(s.score).toBeGreaterThan(0);
    }
  });
});
