import { COMBO_MISS_LIMIT } from "../config";

export interface ComboState {
  combo: number;
  missStreak: number;
}

/** Wird nach jeder Platzierung aufgerufen, vor der Punktewertung. */
export function updateCombo(state: ComboState, linesCleared: number): ComboState {
  if (linesCleared > 0) return { combo: state.combo + 1, missStreak: 0 };
  const missStreak = state.missStreak + 1;
  return { combo: missStreak >= COMBO_MISS_LIMIT ? 0 : state.combo, missStreak };
}

/** Anzeigetext; bei C ≤ 1 kein Label. */
export function comboLabel(combo: number): string | null {
  return combo >= 2 ? `Combo ×${combo}` : null;
}
