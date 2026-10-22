import { isValidState, type GameState } from "../core/game";

const KEY_GAME = "mausi-blast:game";
const KEY_BEST = "mausi-blast:best";
const KEY_SETTINGS = "mausi-blast:settings";

export interface Settings {
  sound: boolean;
  haptics: boolean;
}

const DEFAULT_SETTINGS: Settings = { sound: true, haptics: true };

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

export const loadSettings = (): Settings => ({ ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(KEY_SETTINGS) });
export const saveSettings = (s: Settings) => write(KEY_SETTINGS, s);
