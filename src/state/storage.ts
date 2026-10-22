import { isValidState, type GameState } from "../core/game";
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

export function loadStats(): Stats {
  return { bestCombo: 0, allClears: 0, ...read<Partial<Stats>>(KEY_STATS) };
}

export const saveStats = (s: Stats) => write(KEY_STATS, s);

export interface Settings {
  sound: boolean;
  haptics: boolean;
  /** ID aus src/ui/skins.ts */
  skin: string;
  /** Bei „Alles weg!“ automatisch zum nächsten Blockdesign wechseln. */
  skinCycle: boolean;
}

const DEFAULT_SETTINGS: Settings = { sound: true, haptics: true, skin: DEFAULT_SKIN, skinCycle: true };

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

export function loadGame(): GameState | null {
  const s = read<unknown>(KEY_GAME);
  return isValidState(s) ? s : null;
}

export const saveGame = (state: GameState) => write(KEY_GAME, state);

export const loadBest = (): number => read<number>(KEY_BEST) ?? 0;
export const saveBest = (best: number) => write(KEY_BEST, best);

/** Rekord zu Beginn der laufenden Runde – damit „Neuer Rekord!“ auch nach einem Neuladen stimmt. */
export const loadRoundBest = (): number | null => read<number>(KEY_ROUND_BEST);
export const saveRoundBest = (best: number) => write(KEY_ROUND_BEST, best);

export function loadSettings(): Settings {
  const s = { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(KEY_SETTINGS) };
  if (!SKIN_IDS.includes(s.skin)) s.skin = DEFAULT_SKIN;
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
