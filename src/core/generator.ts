import { BOARD_SIZE as N, GENERATOR as G, STANDARD_ASSIST as S, TRAY_SIZE, type GameMode } from "../config";
import { canPlace, canPlaceAnywhere, countFilled, isEmpty, isTraySolvable, place, type Board } from "./board";
import { barPiece, getPiece, PIECES, type Piece } from "./pieces";
import type { Rng } from "./rng";

export function pieceWeight(piece: Piece, fill: number): number {
  const small = piece.size <= G.smallSize;
  const big = piece.size >= G.bigSize;
  if (fill < G.fillLow) return big ? G.lowBigWeight : 1;
  if (fill <= G.fillHigh) return small ? G.midSmallWeight : big ? G.midBigWeight : 1;
  return small ? G.highSmallWeight : big ? G.highBigWeight : 1;
}

/** Balken, die genau eine Lücke in einer sonst vollen Zeile/Spalte schließen. */
export function findGapBars(board: Board): Piece[] {
  const result: Piece[] = [];
  const scan = (get: (i: number) => number, horizontal: boolean) => {
    let start = -1;
    let len = 0;
    let runs = 0;
    for (let i = 0; i < N; i++) {
      if (get(i)) continue;
      if (start < 0 || i !== start + len) {
        runs++;
        start = i;
        len = 0;
      }
      len++;
    }
    if (runs === 1 && len <= G.gapAssistMaxLen) result.push(barPiece(len, horizontal));
  };
  for (let r = 0; r < N; r++) scan((c) => board[r * N + c], true);
  for (let c = 0; c < N; c++) scan((r) => board[r * N + c], false);
  return result;
}

function randomTray(rng: Rng, fill: number): Piece[] {
  const weights = PIECES.map((p) => pieceWeight(p, fill));
  const tray: Piece[] = [];
  for (let i = 0; i < TRAY_SIZE; i++) tray.push(rng.weighted(PIECES, weights));
  return tray;
}

const allSame = (tray: Piece[]) => tray.every((p) => p.id === tray[0].id);

function candidateTray(board: Board, rng: Rng, fill: number, mode: GameMode): Piece[] {
  let tray: Piece[];
  do tray = randomTray(rng, fill);
  while (allSame(tray));

  const minFill = mode === "standard" ? S.gapAssistMinFill : G.gapAssistMinFill;
  const chance = mode === "standard" ? S.gapAssistChance : G.gapAssistChance;
  if (fill > minFill && rng.next() < chance) {
    const gaps = findGapBars(board);
    if (gaps.length) {
      tray[rng.int(TRAY_SIZE)] = rng.pick(gaps);
      if (allSame(tray)) return candidateTray(board, rng, fill, mode);
    }
  }
  return tray;
}

/**
 * Bewertung einer Platzierung, ähnlich wie ein Mensch spielt: geschlossene Linien zählen am meisten,
 * sonst Stellen, die schon angefangene Reihen und Spalten weiter auffüllen.
 */
export function placementScore(board: Board, piece: Piece, row: number, col: number): { lines: number; score: number } {
  const own = new Set(piece.cells.map(([r, c]) => (row + r) * N + col + c));
  const filled = (i: number) => board[i] !== 0 || own.has(i);
  let lines = 0;
  let score = 0;
  const line = (count: number) => {
    if (count === N) lines++;
    else score += count * count;
  };
  for (let r = row; r < row + piece.h; r++) {
    let n = 0;
    for (let c = 0; c < N; c++) if (filled(r * N + c)) n++;
    line(n);
  }
  for (let c = col; c < col + piece.w; c++) {
    let n = 0;
    for (let r = 0; r < N; r++) if (filled(r * N + c)) n++;
    line(n);
  }
  return { lines, score: lines * 1000 + score };
}

const ORDERS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];

/**
 * Wie hilfreich ist ein Tray? Spielt alle Reihenfolgen durch und legt jeden Stein gierig dorthin,
 * an die nach placementScore beste Stelle.
 * Ergebnis: bester Wert über alle Reihenfolgen; -Infinity, wenn nie alle drei passen.
 */
export function trayValue(board: Board, tray: readonly Piece[]): number {
  let best = -Infinity;
  for (const order of ORDERS) {
    if (order.some((i) => i >= tray.length)) continue;
    let b = board;
    let lines = 0;
    let ok = true;
    for (const i of order) {
      const piece = tray[i];
      let pick: { r: number; c: number; lines: number; score: number } | null = null;
      for (let r = 0; r + piece.h <= N; r++) {
        for (let c = 0; c + piece.w <= N; c++) {
          if (!canPlace(b, piece, r, c)) continue;
          const q = placementScore(b, piece, r, c);
          if (!pick || q.score > pick.score) pick = { r, c, ...q };
        }
      }
      if (!pick) {
        ok = false;
        break;
      }
      b = place(b, piece, pick.r, pick.c).board;
      lines += pick.lines;
    }
    if (!ok) continue;
    const value = lines * S.lineValue + (lines > 0 && isEmpty(b) ? S.allClearValue : 0) - countFilled(b) * S.fillPenalty;
    if (value > best) best = value;
  }
  return best;
}

/**
 * Baut einen Tray gezielt: wählt nacheinander aus allen Formen einen der drei Steine, die auf dem
 * (gedanklich weitergespielten) Feld am besten passen – also Linien schließen oder angefangene füllen.
 */
function constructedTray(board: Board, rng: Rng): Piece[] | null {
  let b = board;
  const tray: Piece[] = [];
  for (let k = 0; k < TRAY_SIZE; k++) {
    const options: { piece: Piece; r: number; c: number; score: number }[] = [];
    for (const piece of PIECES) {
      if (k === 2 && tray[0].id === piece.id && tray[1].id === piece.id) continue;
      let best: { r: number; c: number; score: number } | null = null;
      for (let r = 0; r + piece.h <= N; r++) {
        for (let c = 0; c + piece.w <= N; c++) {
          if (!canPlace(b, piece, r, c)) continue;
          const q = placementScore(b, piece, r, c);
          if (!best || q.score > best.score) best = { r, c, score: q.score };
        }
      }
      if (best) {
        // Bevorzugt Steine, nach denen wenig übrig bleibt; ein leeres Feld zählt besonders.
        const after = place(b, piece, best.r, best.c).board;
        const left = countFilled(after);
        options.push({ piece, ...best, score: best.score - left * 25 + (left === 0 ? 5000 : 0) });
      }
    }
    if (!options.length) return null;
    options.sort((x, y) => y.score - x.score);
    const pick = options[rng.int(Math.min(3, options.length))];
    tray.push(pick.piece);
    b = place(b, pick.piece, pick.r, pick.c).board;
  }
  // Reihenfolge im Tray mischen, damit die „Lösung“ nicht immer links nach rechts ist
  for (let i = tray.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [tray[i], tray[j]] = [tray[j], tray[i]];
  }
  return tray;
}

/** Standard-Modus: viele Kandidaten bewerten und bevorzugt den hilfreichsten austeilen. */
function generateHelpfulTray(board: Board, rng: Rng, fill: number): Piece[] | null {
  const scored: { tray: Piece[]; value: number }[] = [];
  const add = (tray: Piece[]) => {
    const value = trayValue(board, tray);
    if (value > -Infinity) scored.push({ tray, value });
  };
  for (let k = 0; k < S.candidates; k++) add(candidateTray(board, rng, fill, "standard"));
  for (let k = 0; k < S.constructed; k++) {
    const tray = constructedTray(board, rng);
    if (tray) add(tray);
  }
  if (!scored.length) return null;
  scored.sort((a, b) => b.value - a.value);
  if (rng.next() < S.pickBestChance) return scored[0].tray;
  return scored[rng.int(Math.min(3, scored.length))].tray;
}

/**
 * Teilt einen neuen Tray aus. Standard: bevorzugt den hilfreichsten von mehreren Kandidaten.
 * Hard (und Rückfall): einer, bei dem alle Steine platzierbar sind, sonst einer, bei dem
 * mindestens einer passt, sonst ein zufälliger.
 */
/** Start im Standard-Modus wie im Original: drei gleiche Rechtecke, mit denen man ganze Reihen baut. */
const OPENING_PIECES = ["2x3", "3x2", "2x2"];

export function generateTray(board: Board, rng: Rng, mode: GameMode = "hard", opening = false): Piece[] {
  const fill = countFilled(board) / (N * N);
  if (mode === "standard" && opening) {
    const piece = getPiece(rng.pick(OPENING_PIECES));
    return [piece, piece, piece];
  }
  if (mode === "standard") {
    const helpful = generateHelpfulTray(board, rng, fill);
    if (helpful) return helpful;
  }
  let fallback: Piece[] | null = null;
  let last: Piece[] = [];
  for (let attempt = 0; attempt < G.maxAttempts; attempt++) {
    const tray = candidateTray(board, rng, fill, mode);
    last = tray;
    if (isTraySolvable(board, tray)) return tray;
    if (!fallback && tray.some((p) => canPlaceAnywhere(board, p))) fallback = tray;
  }
  return fallback ?? last;
}
