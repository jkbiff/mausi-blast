// Alle Sounds werden live per Web Audio synthetisiert – keine Fremd-Assets.

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

/** Muss aus einer Nutzer-Geste heraus aufgerufen werden (iOS/Chrome-Autoplay-Regeln). */
export function unlockAudio(): void {
  if (!enabled) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, gain: number): void {
  if (!ctx) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const semis = (base: number, n: number) => base * Math.pow(2, n / 12);

function ready(): boolean {
  if (!enabled) return false;
  unlockAudio();
  return !!ctx;
}

export function playPickup(): void {
  if (ready()) tone(660, 0, 0.06, "sine", 0.08);
}

export function playPlace(): void {
  if (!ready()) return;
  tone(180, 0, 0.12, "triangle", 0.25);
  tone(360, 0, 0.05, "sine", 0.08);
}

export function playInvalid(): void {
  if (ready()) tone(140, 0, 0.1, "sine", 0.1);
}

/** Tonhöhe steigt mit der Combo-Stufe. */
export function playClear(lines: number, combo: number): void {
  if (!ready()) return;
  const base = semis(523.25, Math.min(combo - 1, 12) * 2);
  const steps = [0, 4, 7, 12].slice(0, Math.min(2 + lines, 4));
  steps.forEach((s, i) => tone(semis(base, s), i * 0.06, 0.22, "triangle", 0.18));
}

export function playAllClear(): void {
  if (!ready()) return;
  [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone(semis(523.25, s), i * 0.07, 0.35, "triangle", 0.16));
}

export function playRecord(): void {
  if (!ready()) return;
  [0, 4, 7, 12].forEach((s, i) => tone(semis(659.25, s), i * 0.1, 0.3, "square", 0.06));
  tone(semis(659.25, 12), 0.4, 0.5, "triangle", 0.14);
}

export function playGameOver(): void {
  if (!ready()) return;
  [7, 4, 0, -5].forEach((s, i) => tone(semis(392, s), i * 0.16, 0.3, "sine", 0.18));
}

export function playRevive(): void {
  if (!ready()) return;
  [0, 7, 12].forEach((s, i) => tone(semis(440, s), i * 0.09, 0.25, "sine", 0.16));
}

let hapticsEnabled = true;

export function setHapticsEnabled(on: boolean): void {
  hapticsEnabled = on;
}

export function vibrate(pattern: number | number[]): void {
  if (!hapticsEnabled) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // nicht unterstützt (z. B. iOS Safari)
  }
}
