import { BOARD_SIZE as N, GENERATOR } from "../config";
import type { Piece } from "./pieces";

/** 8×8-Feld als flaches Array; 0 = leer, > 0 = Farbindex des Steins. */
export type Board = number[];

export interface PlaceResult {
  board: Board;
  placedCells: number[];
  clearedRows: number[];
  clearedCols: number[];
  /** Indizes aller entfernten Zellen (Kreuzungen nur einmal). */
  clearedCells: number[];
}

export const idx = (row: number, col: number): number => row * N + col;

export function emptyBoard(): Board {
  return new Array(N * N).fill(0);
}

export function countFilled(board: Board): number {
  let n = 0;
  for (const v of board) if (v) n++;
  return n;
}

export function isEmpty(board: Board): boolean {
  return board.every((v) => v === 0);
}

export function canPlace(board: Board, piece: Piece, row: number, col: number): boolean {
  if (row < 0 || col < 0 || row + piece.h > N || col + piece.w > N) return false;
  for (const [r, c] of piece.cells) if (board[(row + r) * N + col + c]) return false;
  return true;
}

export function findFullLines(board: Board): { rows: number[]; cols: number[] } {
  const rows: number[] = [];
  const cols: number[] = [];
  for (let i = 0; i < N; i++) {
    let rowFull = true;
    let colFull = true;
    for (let j = 0; j < N; j++) {
      if (!board[i * N + j]) rowFull = false;
      if (!board[j * N + i]) colFull = false;
    }
    if (rowFull) rows.push(i);
    if (colFull) cols.push(i);
  }
  return { rows, cols };
}

/** Setzt den Stein und entfernt alle vollen Zeilen und Spalten gleichzeitig. */
export function place(board: Board, piece: Piece, row: number, col: number, color = 1): PlaceResult {
  if (!canPlace(board, piece, row, col)) throw new Error(`Stein ${piece.id} passt nicht auf ${row}/${col}`);
  const next = board.slice();
  const placedCells = piece.cells.map(([r, c]) => idx(row + r, col + c));
  for (const i of placedCells) next[i] = color;

  const { rows, cols } = findFullLines(next);
  const cleared = new Set<number>();
  for (const r of rows) for (let c = 0; c < N; c++) cleared.add(idx(r, c));
  for (const c of cols) for (let r = 0; r < N; r++) cleared.add(idx(r, c));
  for (const i of cleared) next[i] = 0;

  return { board: next, placedCells, clearedRows: rows, clearedCols: cols, clearedCells: [...cleared] };
}

export function canPlaceAnywhere(board: Board, piece: Piece): boolean {
  for (let r = 0; r + piece.h <= N; r++) {
    for (let c = 0; c + piece.w <= N; c++) if (canPlace(board, piece, r, c)) return true;
  }
  return false;
}

export function hasAnyMove(board: Board, pieces: readonly Piece[]): boolean {
  return pieces.some((p) => canPlaceAnywhere(board, p));
}

function boardKey(board: Board): string {
  let lo = 0;
  let hi = 0;
  for (let i = 0; i < 32; i++) {
    if (board[i]) lo |= 1 << i;
    if (board[i + 32]) hi |= 1 << i;
  }
  return `${lo >>> 0}.${hi >>> 0}`;
}

/**
 * Gibt es eine Reihenfolge + Positionen, mit denen alle Steine platzierbar sind
 * (inkl. Clears zwischendurch)? Backtracking mit Memo; bei überschrittenem
 * Knotenbudget wird `false` geliefert.
 */
export function isTraySolvable(board: Board, pieces: readonly Piece[], nodeBudget = GENERATOR.solverNodeBudget): boolean {
  const seen = new Set<string>();
  let nodes = 0;

  const solve = (b: Board, rest: readonly Piece[]): boolean => {
    if (rest.length === 0) return true;
    const key = `${boardKey(b)}|${rest.map((p) => p.id).sort().join(",")}`;
    if (seen.has(key)) return false;
    seen.add(key);

    const tried = new Set<string>();
    for (let i = 0; i < rest.length; i++) {
      const piece = rest[i];
      if (tried.has(piece.id)) continue;
      tried.add(piece.id);
      const others = rest.filter((_, j) => j !== i);
      for (let r = 0; r + piece.h <= N; r++) {
        for (let c = 0; c + piece.w <= N; c++) {
          if (!canPlace(b, piece, r, c)) continue;
          if (++nodes > nodeBudget) return false;
          if (solve(place(b, piece, r, c).board, others)) return true;
        }
      }
    }
    return false;
  };

  return solve(board.map((v) => (v ? 1 : 0)), pieces);
}
