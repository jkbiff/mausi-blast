// Alle Spielregel- und Balancing-Zahlen an einem Ort.

export const BOARD_SIZE = 8;
export const TRAY_SIZE = 3;

// Punkte
/**
 * Linienpunkte pro Linie = LINE_POINTS_PER_COMBO × Combo + LINE_POINTS_BASE.
 * Aus Bildschirmaufnahmen der Original-App gemessen; trifft alle Werte ab Combo 10 auf < 1 %:
 * 1 Linie bei Combo 10/13/14/15/20/21/22 → 566/720/770/822/1076/1126/1178,
 * 2 Linien bei Combo 12 → 1334, 6 Linien bei Combo 19 → 6140.
 */
export const LINE_POINTS_PER_COMBO = 51;
export const LINE_POINTS_BASE = 56;
export const ALL_CLEAR_BONUS = 300;

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

/** Spielmodi: Standard teilt hilfreichere Steine aus, Hard ist der ursprüngliche Generator. */
export type GameMode = "standard" | "hard";
export const GAME_MODES: readonly GameMode[] = ["standard", "hard"];

/** Zusätzliche Hilfe im Standard-Modus (siehe generator.ts). */
export const STANDARD_ASSIST = {
  /** So viele Kandidaten-Trays werden bewertet … */
  candidates: 6,
  /** Zusätzlich gezielt gebaute Trays (Steine, die am meisten Linien schließen). */
  constructed: 3,
  /** Mit dieser Wahrscheinlichkeit kommt der beste Kandidat, sonst ein zufälliger aus den besten drei. */
  pickBestChance: 0.7,
  /** Gap-Assist greift häufiger und früher. */
  gapAssistChance: 0.85,
  gapAssistMinFill: 0.15,
  /** Bewertung eines Trays nach dem Durchspielen. */
  lineValue: 120,
  allClearValue: 2500,
  fillPenalty: 4,
};

// Darstellung: Anzahl Steinfarben (Farbe hat keine Spielbedeutung).
export const COLOR_COUNT = 8;
