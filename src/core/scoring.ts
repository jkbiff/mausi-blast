import { ALL_CLEAR_BONUS, ALL_CLEAR_MIN_DEAL_ROUND, POINTS_PER_LINE } from "../config";

export function linePoints(lines: number, combo: number): number {
  if (lines <= 0) return 0;
  if (lines === 1) return POINTS_PER_LINE * combo;
  return POINTS_PER_LINE * combo * lines * (lines - 1);
}

export function isAllClearBonus(boardEmptyAfter: boolean, linesCleared: number, dealRound: number): boolean {
  return boardEmptyAfter && linesCleared > 0 && dealRound >= ALL_CLEAR_MIN_DEAL_ROUND;
}

export interface MoveScoreInput {
  placedCells: number;
  linesCleared: number;
  /** Combo-Zähler, bereits für diesen Zug aktualisiert. */
  combo: number;
  boardEmptyAfter: boolean;
  dealRound: number;
}

export function scoreMove(m: MoveScoreInput): number {
  const bonus = isAllClearBonus(m.boardEmptyAfter, m.linesCleared, m.dealRound) ? ALL_CLEAR_BONUS : 0;
  return m.placedCells + linePoints(m.linesCleared, m.combo) + bonus;
}
