import { BOARD_SIZE as N, GENERATOR as G, TRAY_SIZE } from "../config";
import { canPlaceAnywhere, countFilled, isTraySolvable, type Board } from "./board";
import { barPiece, PIECES, type Piece } from "./pieces";
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

function candidateTray(board: Board, rng: Rng, fill: number): Piece[] {
  let tray: Piece[];
  do tray = randomTray(rng, fill);
  while (allSame(tray));

  if (fill > G.gapAssistMinFill && rng.next() < G.gapAssistChance) {
    const gaps = findGapBars(board);
    if (gaps.length) {
      tray[rng.int(TRAY_SIZE)] = rng.pick(gaps);
      if (allSame(tray)) return candidateTray(board, rng, fill);
    }
  }
  return tray;
}

/**
 * Teilt einen neuen Tray aus: bevorzugt einen, bei dem alle Steine platzierbar sind,
 * sonst einen, bei dem mindestens einer passt, sonst einen zufälligen.
 */
export function generateTray(board: Board, rng: Rng): Piece[] {
  const fill = countFilled(board) / (N * N);
  let fallback: Piece[] | null = null;
  let last: Piece[] = [];
  for (let attempt = 0; attempt < G.maxAttempts; attempt++) {
    const tray = candidateTray(board, rng, fill);
    last = tray;
    if (isTraySolvable(board, tray)) return tray;
    if (!fallback && tray.some((p) => canPlaceAnywhere(board, p))) fallback = tray;
  }
  return fallback ?? last;
}
