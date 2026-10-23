import { BOARD_SIZE as N, COLOR_COUNT, GAME_MODES, TRAY_SIZE, type GameMode } from "../config";
import { canPlace, emptyBoard, hasAnyMove, isEmpty, place, type Board } from "./board";
import { updateCombo } from "./combo";
import { generateTray } from "./generator";
import { getPiece, type Piece } from "./pieces";
import { Rng } from "./rng";
import { isAllClearBonus, scoreMove } from "./scoring";

export interface TrayItem {
  pieceId: string;
  /** Farbindex 1..COLOR_COUNT, rein optisch. */
  color: number;
}

export interface GameState {
  version: 1;
  board: Board;
  tray: (TrayItem | null)[];
  score: number;
  combo: number;
  missStreak: number;
  /** Anzahl bisher ausgeteilter Trays. */
  dealRound: number;
  gameOver: boolean;
  rngState: number;
  /** Spielmodus; ältere Spielstände ohne Modus gelten als "hard". */
  mode?: GameMode;
}

export const modeOf = (state: GameState): GameMode => state.mode ?? "hard";

export interface MoveResult {
  state: GameState;
  placedCells: number[];
  clearedRows: number[];
  clearedCols: number[];
  clearedCells: number[];
  linesCleared: number;
  points: number;
  combo: number;
  allClear: boolean;
  dealtNewTray: boolean;
}

function dealInto(state: GameState, rng: Rng): void {
  const pieces = generateTray(state.board, rng, modeOf(state), state.dealRound === 0);
  const colors: number[] = [];
  state.tray = pieces.map((p) => {
    let color: number;
    do color = 1 + rng.int(COLOR_COUNT);
    while (colors.includes(color));
    colors.push(color);
    return { pieceId: p.id, color };
  });
  state.dealRound++;
  state.rngState = rng.state;
}

export function trayPieces(state: GameState): Piece[] {
  return state.tray.filter((t): t is TrayItem => t !== null).map((t) => getPiece(t.pieceId));
}

export function newGame(seed: number, mode: GameMode = "standard"): GameState {
  const state: GameState = {
    version: 1,
    board: emptyBoard(),
    tray: new Array(TRAY_SIZE).fill(null),
    score: 0,
    combo: 0,
    missStreak: 0,
    dealRound: 0,
    gameOver: false,
    rngState: seed >>> 0,
    mode,
  };
  dealInto(state, new Rng(state.rngState));
  return state;
}

export function canPlaceSlot(state: GameState, slot: number, row: number, col: number): boolean {
  const item = state.tray[slot];
  return !!item && !state.gameOver && canPlace(state.board, getPiece(item.pieceId), row, col);
}

/** Führt einen Zug aus (unveränderlich: gibt neuen Zustand zurück). */
export function playMove(prev: GameState, slot: number, row: number, col: number): MoveResult {
  const item = prev.tray[slot];
  if (!item || prev.gameOver) throw new Error("Ungültiger Zug");
  const piece = getPiece(item.pieceId);
  const res = place(prev.board, piece, row, col, item.color);
  const lines = res.clearedRows.length + res.clearedCols.length;
  const comboState = updateCombo(prev, lines);
  const emptyAfter = isEmpty(res.board);

  const state: GameState = {
    ...prev,
    board: res.board,
    tray: prev.tray.map((t, i) => (i === slot ? null : t)),
    combo: comboState.combo,
    missStreak: comboState.missStreak,
  };
  const points = scoreMove({
    placedCells: piece.size,
    linesCleared: lines,
    combo: comboState.combo,
    boardEmptyAfter: emptyAfter,
  });
  state.score += points;

  let dealtNewTray = false;
  if (state.tray.every((t) => t === null)) {
    dealInto(state, new Rng(state.rngState));
    dealtNewTray = true;
  }
  state.gameOver = !hasAnyMove(state.board, trayPieces(state));

  return {
    state,
    placedCells: res.placedCells,
    clearedRows: res.clearedRows,
    clearedCols: res.clearedCols,
    clearedCells: res.clearedCells,
    linesCleared: lines,
    points,
    combo: comboState.combo,
    allClear: isAllClearBonus(emptyAfter, lines),
    dealtNewTray,
  };
}

export function isValidState(s: unknown): s is GameState {
  const g = s as GameState;
  return (
    !!g &&
    g.version === 1 &&
    Array.isArray(g.board) &&
    g.board.length === N * N &&
    Array.isArray(g.tray) &&
    g.tray.length === TRAY_SIZE &&
    g.tray.every((t) => t === null || (typeof t.pieceId === "string" && !!getPieceSafe(t.pieceId))) &&
    typeof g.score === "number" &&
    (g.mode === undefined || GAME_MODES.includes(g.mode))
  );
}

function getPieceSafe(id: string): Piece | null {
  try {
    return getPiece(id);
  } catch {
    return null;
  }
}
