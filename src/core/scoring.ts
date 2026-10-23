// Punktewertung, gemessen an der Original-App (siehe config.ts).
import { ALL_CLEAR_BONUS, LINE_POINTS_BASE, LINE_POINTS_PER_COMBO } from "../config";

/** Linienpunkte: pro Linie 51 × Combo + 56 (Combo = Position in der Combo, ohne Obergrenze). */
export function linePoints(lines: number, combo: number): number {
  if (lines <= 0) return 0;
  return lines * (LINE_POINTS_PER_COMBO * Math.max(combo, 1) + LINE_POINTS_BASE);
}

/** Komplettabräumung: der Zug räumt Linien ab und hinterlässt ein leeres Feld. */
export function isAllClearBonus(boardEmptyAfter: boolean, linesCleared: number): boolean {
  return boardEmptyAfter && linesCleared > 0;
}

export interface MoveScoreInput {
  placedCells: number;
  linesCleared: number;
  /** Combo-Zähler, bereits für diesen Zug aktualisiert. */
  combo: number;
  boardEmptyAfter: boolean;
}

/** Blöcke (nie vervielfacht) + Linienpunkte + 300 bei Komplettabräumung. */
export function scoreMove(m: MoveScoreInput): number {
  const bonus = isAllClearBonus(m.boardEmptyAfter, m.linesCleared) ? ALL_CLEAR_BONUS : 0;
  return m.placedCells + linePoints(m.linesCleared, m.combo) + bonus;
}
