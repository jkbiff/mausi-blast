// Visuelle Effekte: Zersplittern, Lichtstreifen, Punktzahlen, Banner, Themenwechsel-Feier.
import { BOARD_SIZE as N } from "../config";

type Pt = { x: number; y: number };

let fx: HTMLElement;
let globalFx: HTMLElement;
let cells: HTMLElement[];

export function initEffects(fxEl: HTMLElement, globalEl: HTMLElement, cellEls: HTMLElement[]): void {
  fx = fxEl;
  globalFx = globalEl;
  cells = cellEls;
}

function spawn(el: HTMLElement, ttl: number, parent: HTMLElement = fx): void {
  parent.appendChild(el);
  window.setTimeout(() => el.remove(), ttl);
}

function div(className: string, style: Record<string, string> = {}): HTMLDivElement {
  const d = document.createElement("div");
  d.className = className;
  for (const [k, v] of Object.entries(style)) {
    if (k.startsWith("--")) d.style.setProperty(k, v);
    else d.style.setProperty(k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`), v);
  }
  return d;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Zellposition relativ zur Effektebene über dem Spielfeld. */
export function cellRect(i: number): { x: number; y: number; w: number; h: number } {
  const base = fx.getBoundingClientRect();
  const r = cells[i].getBoundingClientRect();
  return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height };
}

export function centroid(indices: number[]): Pt {
  let x = 0;
  let y = 0;
  for (const i of indices) {
    const r = cellRect(i);
    x += r.x + r.w / 2;
    y += r.y + r.h / 2;
  }
  return { x: x / indices.length, y: y / indices.length };
}

/** 3D-Schrift (Farbvarianten: gold, green, cyan, orange, rainbow). */
export function text3d(content: string, variant = "gold", extra = ""): HTMLSpanElement {
  const s = document.createElement("span");
  s.className = `t3d ${variant} ${extra}`.trim();
  s.textContent = content;
  return s;
}

export function sparks(at: Pt, count: number, spread = 50, color = "#fff", delay = 0, parent: HTMLElement = fx): void {
  for (let k = 0; k < count; k++) {
    const a = rand(0, Math.PI * 2);
    const d = spread * rand(0.4, 1);
    spawn(
      div("spark", {
        left: `${at.x - 3}px`,
        top: `${at.y - 3}px`,
        animationDelay: `${delay}ms`,
        "--c": color,
        "--dx": `${Math.cos(a) * d}px`,
        "--dy": `${Math.sin(a) * d}px`,
      }),
      500 + delay,
      parent,
    );
  }
}

/** Funken rund um einen frisch gelegten Stein (das türkise Aufglühen macht CSS). */
export function placeSparkles(indices: number[]): void {
  for (const i of indices) {
    if (Math.random() > 0.5) continue;
    const r = cellRect(i);
    sparks({ x: r.x + rand(0, r.w), y: r.y + rand(0, r.h) }, 1, 22, "#8ff6ff");
  }
}

/**
 * Geschaffte Linien: Blöcke blitzen auf und zerspringen in Scherben, die entlang der Linie
 * vom Ablageort weg fliegen.
 */
export function shatter(indices: number[], colorOf: (i: number) => string, rows: number[], origin: number[]): void {
  const or = origin.reduce((s, i) => s + Math.floor(i / N), 0) / origin.length;
  const oc = origin.reduce((s, i) => s + (i % N), 0) / origin.length;
  const rowSet = new Set(rows);
  for (const i of indices) {
    const row = Math.floor(i / N);
    const col = i % N;
    const r = cellRect(i);
    const horizontal = rowSet.has(row);
    const away = horizontal ? Math.sign(col - oc) || (Math.random() < 0.5 ? -1 : 1) : Math.sign(row - or) || 1;
    const delay = Math.round((horizontal ? Math.abs(col - oc) : Math.abs(row - or)) * 18);
    const color = colorOf(i);
    const cell = div("fx-cell", {
      left: `${r.x}px`,
      top: `${r.y}px`,
      width: `${r.w}px`,
      height: `${r.h}px`,
      animationDelay: `${delay}ms`,
    });
    cell.dataset.c = color;
    spawn(cell, 260 + delay);
    for (let k = 0; k < 5; k++) {
      const along = away * rand(40, 120);
      const across = rand(-30, 30);
      const shard = div("shard", {
        left: `${r.x + rand(0, r.w * 0.6)}px`,
        top: `${r.y + rand(0, r.h * 0.6)}px`,
        animationDelay: `${delay + 40}ms`,
        "--s": `${rand(r.w * 0.25, r.w * 0.5)}px`,
        "--dx": `${horizontal ? along : across}px`,
        "--dy": `${(horizontal ? across : along) + rand(0, 25)}px`,
        "--rot": `${rand(-400, 400)}deg`,
      });
      shard.dataset.c = color;
      shard.style.opacity = "0";
      shard.style.animationFillMode = "both";
      spawn(shard, 600 + delay);
    }
  }
}

/** Heller Lichtstreifen über jeder geschafften Linie. */
export function streaks(rows: number[], cols: number[]): void {
  const line = (from: number, to: number, cls: string) => {
    const a = cellRect(from);
    const b = cellRect(to);
    spawn(
      div(`streak ${cls}`, {
        left: `${a.x - 4}px`,
        top: `${a.y - 2}px`,
        width: `${b.x + b.w - a.x + 8}px`,
        height: `${b.y + b.h - a.y + 4}px`,
      }),
      340,
    );
  };
  for (const r of rows) line(r * N, r * N + N - 1, "row");
  for (const c of cols) line(c, (N - 1) * N + c, "col");
}

/** Combo-Zahl auf jedem abgeräumten Block. */
export function cellNumbers(indices: number[], n: number): void {
  indices.forEach((i, k) => {
    const r = cellRect(i);
    const el = div("cell-num", {
      left: `${r.x}px`,
      top: `${r.y}px`,
      width: `${r.w}px`,
      height: `${r.h}px`,
      animationDelay: `${(k % N) * 15}ms`,
    });
    el.appendChild(text3d(String(n), "orange"));
    el.style.opacity = "0";
    el.style.animationFillMode = "both";
    spawn(el, 700 + (k % N) * 15);
  });
}

export function points(value: number, at: Pt, variant = "gold"): void {
  const el = div("points", { left: `${at.x}px`, top: `${at.y}px` });
  el.appendChild(text3d(String(value), variant));
  spawn(el, 850);
}

/** Großes Banner über dem Feld; ersetzt ein noch sichtbares Banner derselben Art. */
export function banner(children: HTMLElement[], variant = "", ttl = 1000): void {
  fx.querySelectorAll(variant.includes("record") ? ".banner.record" : ".banner:not(.record)").forEach((b) => b.remove());
  const b = div(`banner ${variant}`.trim(), { animationDuration: `${ttl - 50}ms` });
  b.append(...children);
  spawn(b, ttl);
}

/** Combo-Anzeige: ×2/×3 mit Mäusen, ab 4 „Combo N“, ab 6 „Combo-Meister“. */
export function comboContent(combo: number): HTMLElement[] {
  if (combo >= 6) {
    return [div("crown-icon"), text3d("Combo-Meister", "gold", "long"), text3d(`×${combo}`, "orange", "sub")];
  }
  if (combo >= 4) return [text3d(`Combo ${combo}`, "green")];
  const row = div("combo-x");
  row.append(div("mascot"), text3d(`×${combo}`, "orange"), div("mascot right"));
  return [row];
}

/** Partikel im Motiv des Themas (z. B. Kleeblatt) an einer Stelle im Fenster. */
export function motifBurst(x: number, y: number): void {
  for (let k = 0; k < 6; k++) {
    const a = rand(0, Math.PI * 2);
    const d = rand(18, 46);
    spawn(
      div("motif", {
        left: `${x - 9}px`,
        top: `${y - 12}px`,
        fontSize: `${rand(12, 22)}px`,
        "--dx": `${Math.cos(a) * d}px`,
        "--dy": `${Math.sin(a) * d - 10}px`,
      }),
      850,
      globalFx,
    );
  }
}

export function sparksAt(x: number, y: number, count: number, color = "#bfffe6"): void {
  sparks({ x, y }, count, 40, color, 0, globalFx);
}

const BALLOONS = ["#ffd23a", "#ff5f8a", "#a66cff", "#ffd23a", "#ff8fc0", "#7f6cff", "#ffe066"];

/**
 * Feier beim Themenwechsel: Ballons steigen auf, Konfetti fällt, der Name des neuen Themas
 * erscheint. `onPeak` läuft, wenn die Ballons den Bildschirm bedecken (Thema wechseln).
 */
export function celebrate(themeName: string, onPeak: () => void): void {
  const layer = div("celebrate");
  for (let k = 0; k < 26; k++) {
    layer.appendChild(
      div("balloon", {
        left: `${rand(-5, 95)}%`,
        "--w": `${rand(60, 110)}px`,
        "--b": BALLOONS[k % BALLOONS.length],
        "--t": `${rand(1.8, 2.6)}s`,
        "--delay": `${rand(0, 0.5)}s`,
        "--sway": `${rand(-40, 40)}px`,
      }),
    );
  }
  for (let k = 0; k < 60; k++) {
    layer.appendChild(
      div("confetti", {
        left: `${rand(0, 100)}%`,
        "--b": BALLOONS[k % BALLOONS.length],
        "--t": `${rand(1.6, 2.8)}s`,
        "--delay": `${rand(0.2, 1)}s`,
        "--sway": `${rand(-80, 80)}px`,
      }),
    );
  }
  const title = div("theme-title");
  title.append(text3d("Neues Thema", "cyan", "sub"), text3d(themeName, "green"));
  layer.appendChild(title);
  document.body.appendChild(layer);
  window.setTimeout(onPeak, 900);
  window.setTimeout(() => layer.remove(), 3400);
}
