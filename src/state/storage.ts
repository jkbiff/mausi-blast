import type { GameMode } from "../config";
import { isValidState, modeOf, type GameState } from "../core/game";
import { DEFAULT_SKIN, SKIN_IDS } from "../ui/skins";

const KEY_GAME = "mausi-blast:game";
const KEY_BEST = "mausi-blast:best";
const KEY_SETTINGS = "mausi-blast:settings";
const KEY_ROUND_BEST = "mausi-blast:best-at-round-start";
const KEY_PHOTO = "mausi-blast:photo";
const KEY_STATS = "mausi-blast:stats";

/** Statistik über alle Runden. */
export interface Stats {
  bestCombo: number;
  allClears: number;
}

/**
 * Highscore und Statistik gibt es pro Modus. Werte aus der Zeit vor den Modi (Schlüssel ohne
 * Modus) stammen aus dem heutigen Hard-Modus und werden dort weiterverwendet.
 */
function readPerMode<T>(key: string, mode: GameMode): T | null {
  return read<T>(`${key}:${mode}`) ?? (mode === "hard" ? read<T>(key) : null);
}

export function loadStats(mode: GameMode): Stats {
  return { bestCombo: 0, allClears: 0, ...readPerMode<Partial<Stats>>(KEY_STATS, mode) };
}

export const saveStats = (mode: GameMode, s: Stats) => write(`${KEY_STATS}:${mode}`, s);

export interface Settings {
  sound: boolean;
  /** ID aus src/ui/skins.ts */
  skin: string;
  /** Bei „Alles weg!“ automatisch zum nächsten Blockdesign wechseln. */
  skinCycle: boolean;
  /** Zuletzt gespielter Modus (Hintergrund des Startbildschirms). */
  lastMode: GameMode;
}

const DEFAULT_SETTINGS: Settings = { sound: true, skin: DEFAULT_SKIN, skinCycle: true, lastMode: "standard" };

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Speicher voll oder gesperrt – Spiel läuft trotzdem weiter.
  }
}

/** Jeder Modus hat seinen eigenen Spielstand; der alte gemeinsame Spielstand zählt für seinen Modus. */
export function loadGame(mode: GameMode): GameState | null {
  const own = read<unknown>(`${KEY_GAME}:${mode}`);
  if (isValidState(own)) return own;
  const legacy = read<unknown>(KEY_GAME);
  return isValidState(legacy) && modeOf(legacy) === mode ? legacy : null;
}

export const saveGame = (state: GameState) => write(`${KEY_GAME}:${modeOf(state)}`, state);

export const loadBest = (mode: GameMode): number => readPerMode<number>(KEY_BEST, mode) ?? 0;
export const saveBest = (mode: GameMode, best: number) => write(`${KEY_BEST}:${mode}`, best);

/** Rekord zu Beginn der laufenden Runde – damit „Neuer Rekord!“ auch nach einem Neuladen stimmt. */
export const loadRoundBest = (mode: GameMode): number | null => read<number>(`${KEY_ROUND_BEST}:${mode}`);
export const saveRoundBest = (mode: GameMode, best: number) => write(`${KEY_ROUND_BEST}:${mode}`, best);

export function loadSettings(): Settings {
  const s = { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(KEY_SETTINGS) };
  if (!SKIN_IDS.includes(s.skin)) s.skin = DEFAULT_SKIN;
  if (s.lastMode !== "standard" && s.lastMode !== "hard") s.lastMode = "standard";
  return s;
}
export const saveSettings = (s: Settings) => write(KEY_SETTINGS, s);

/** Eigenes Foto für das Foto-Design, als verkleinerte JPEG-Data-URL. */
export function loadPhoto(): string | null {
  try {
    return localStorage.getItem(KEY_PHOTO);
  } catch {
    return null;
  }
}

export function savePhoto(dataUrl: string): boolean {
  try {
    localStorage.setItem(KEY_PHOTO, dataUrl);
    return true;
  } catch {
    return false;
  }
}
