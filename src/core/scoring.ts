// Punktewertung wie auf block-blast.gg/de/scoring beschrieben.
import { ALL_CLEAR_BONUS, MAX_COMBO_MULTIPLIER, POINTS_PER_LINE } from "../config";

/** Linienpunkte: 10 × L × L, multipliziert mit der Combo-Position (höchstens ×8). */
export function linePoints(lines: number, combo: number): number {
  if (lines <= 0) return 0;
  return POINTS_PER_LINE * lines * lines * Math.min(Math.max(combo, 1), MAX_COMBO_MULTIPLIER);
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

/** Blöcke (nie vervielfacht) + Linienpunkte × Combo + 300 bei Komplettabräumung. */
export function scoreMove(m: MoveScoreInput): number {
  const bonus = isAllClearBonus(m.boardEmptyAfter, m.linesCleared) ? ALL_CLEAR_BONUS : 0;
  return m.placedCells + linePoints(m.linesCleared, m.combo) + bonus;
}
