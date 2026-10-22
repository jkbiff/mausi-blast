// Alle Spielregel- und Balancing-Zahlen an einem Ort.

export const BOARD_SIZE = 8;
export const TRAY_SIZE = 3;

// Punkte
export const POINTS_PER_LINE = 10;
export const ALL_CLEAR_BONUS = 300;
/** All-Clear-Bonus gibt es erst ab dieser Anzahl ausgeteilter Trays. */
export const ALL_CLEAR_MIN_DEAL_ROUND = 6;

// Combo: so viele Platzierungen ohne Clear in Folge setzen die Combo zurück.
export const COMBO_MISS_LIMIT = 3;

// Stein-Generator
export const GENERATOR = {
  /** Füllgrad-Grenzen für die Gewichtung. */
  fillLow: 0.35,
  fillHigh: 0.6,
  /** fill < fillLow: große Steine (>= bigSize Zellen) leicht reduziert. */
  lowBigWeight: 0.8,
  /** fillLow..fillHigh */
  midSmallWeight: 1.5,
  midBigWeight: 0.6,
  /** fill > fillHigh */
  highSmallWeight: 2.5,
  highBigWeight: 0.2,
  /** Stein gilt als "klein" bis einschließlich so vielen Zellen. */
  smallSize: 3,
  /** Stein gilt als "groß" ab so vielen Zellen. */
  bigSize: 6,
  /** Gap-Assist ab diesem Füllgrad aktiv … */
  gapAssistMinFill: 0.25,
  /** … und greift mit dieser Wahrscheinlichkeit. */
  gapAssistChance: 0.6,
  /** Maximale Lückenlänge, die Gap-Assist füllt. */
  gapAssistMaxLen: 5,
  /** Versuche, einen komplett lösbaren Tray zu finden. */
  maxAttempts: 20,
  /** Sicherheitsgrenze für die Backtracking-Suche (Knoten). */
  solverNodeBudget: 60000,
};

// Revive
export const REVIVE_CLEAR_ROWS = 3;

// Darstellung: Anzahl Steinfarben (Farbe hat keine Spielbedeutung).
export const COLOR_COUNT = 8;
