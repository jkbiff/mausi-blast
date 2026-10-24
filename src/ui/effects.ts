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

/**
 * Effekt-Elemente werden gesammelt und einmal pro Durchlauf gemeinsam eingefügt (ein Layout statt
 * vieler) und gemeinsam wieder entfernt, wenn das längste Element fertig ist. Alle Effekte enden
 * unsichtbar, ein etwas späteres Entfernen ist also nicht zu sehen.
 */
const batches = new Map<HTMLElement, { frag: DocumentFragment; els: HTMLElement[]; ttl: number }>();

function flush(): void {
  for (const [parent, b] of batches) {
    parent.appendChild(b.frag);
    window.setTimeout(() => b.els.forEach((el) => el.remove()), b.ttl);
  }
  batches.clear();
}

function spawn(el: HTMLElement, ttl: number, parent: HTMLElement = fx): void {
  let b = batches.get(parent);
  if (!b) {
    if (!batches.size) queueMicrotask(flush);
    b = { frag: document.createDocumentFragment(), els: [], ttl: 0 };
    batches.set(parent, b);
  }
  b.frag.appendChild(el);
  b.els.push(el);
  b.ttl = Math.max(b.ttl, ttl);
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

/**
 * Spielfeld-Geometrie relativ zur Effektebene. Wird gemerkt, bis sich das Layout ändert
 * (invalidateGeometry) – so muss beim Abräumen nicht mitten im Neuzeichnen gemessen werden.
 */
let geomCache: { x0: number; y0: number; pitchX: number; pitchY: number; w: number; h: number } | null = null;

function geom() {
  if (!geomCache) {
    const base = fx.getBoundingClientRect();
    const c0 = cells[0].getBoundingClientRect();
    const c1 = cells[1].getBoundingClientRect();
    const c8 = cells[N].getBoundingClientRect();
    geomCache = {
      x0: c0.left - base.left,
      y0: c0.top - base.top,
      pitchX: c1.left - c0.left,
      pitchY: c8.top - c0.top,
      w: c0.width,
      h: c0.height,
    };
  }
  return geomCache;
}

/** Nach Größenänderung neu messen lassen; mit `measureNow` sofort (z. B. beim Aufnehmen eines Steins). */
export function invalidateGeometry(measureNow = false): void {
  geomCache = null;
  if (measureNow) geom();
}

/** Zellposition relativ zur Effektebene über dem Spielfeld. */
export function cellRect(i: number): { x: number; y: number; w: number; h: number } {
  const g = geom();
  return { x: g.x0 + (i % N) * g.pitchX, y: g.y0 + Math.floor(i / N) * g.pitchY, w: g.w, h: g.h };
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

// ---------- Partikel auf einer Zeichenfläche ----------
// Scherben und Funken werden auf ein einziges Canvas gezeichnet statt als viele animierte
// Elemente – das spart auf dem Handy Grafikebenen, Stilberechnung und Zeichenarbeit.

interface Particle {
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  rot: number;
  color: string;
  /** Start (ms, performance.now) und Dauer */
  t0: number;
  life: number;
  round: boolean;
  glow: boolean;
}

const MARGIN = 110;
let canvas: HTMLCanvasElement | null = null;
let ctx2d: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let particleFrame = 0;

function ensureCanvas(): CanvasRenderingContext2D | null {
  const w = fx.clientWidth + 2 * MARGIN;
  const h = fx.clientHeight + 2 * MARGIN;
  // Einfache Auflösung reicht für schnell fliegende Partikel und hält die Bildübertragung klein
  const dpr = 1;
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.className = "fx-canvas";
    fx.appendChild(canvas);
    ctx2d = canvas.getContext("2d");
  }
  // Neues Spiel leert die Effektebene – dann Zeichenfläche wieder einhängen
  if (!canvas.isConnected) fx.appendChild(canvas);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx2d?.setTransform(dpr, 0, 0, dpr, MARGIN * dpr, MARGIN * dpr);
  }
  return ctx2d;
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function drawParticles(now: number): void {
  const c = ctx2d!;
  c.clearRect(-MARGIN, -MARGIN, canvas!.width, canvas!.height);
  particles = particles.filter((p) => now - p.t0 < p.life);
  for (const p of particles) {
    const t = (now - p.t0) / p.life;
    if (t < 0) continue;
    const e = easeOut(t);
    const x = p.x + p.dx * e;
    const y = p.y + p.dy * e;
    const s = p.size * (p.round ? 1 - 0.7 * t : 1);
    c.globalAlpha = 1 - t;
    c.fillStyle = p.color;
    if (p.round) {
      if (p.glow) {
        c.globalAlpha = (1 - t) * 0.35;
        c.beginPath();
        c.arc(x, y, s * 1.8, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 1 - t;
      }
      c.beginPath();
      c.arc(x, y, s / 2, 0, Math.PI * 2);
      c.fill();
    } else {
      c.save();
      c.translate(x, y);
      c.rotate(p.rot * e);
      c.fillRect(-s / 2, -s / 2, s, s);
      c.fillStyle = "rgba(255, 255, 255, 0.3)";
      c.fillRect(-s / 2, -s / 2, s, s / 2);
      c.restore();
    }
  }
  c.globalAlpha = 1;
  particleFrame = particles.length ? requestAnimationFrame(drawParticles) : 0;
}

function addParticles(list: Particle[]): void {
  if (!ensureCanvas()) return;
  particles.push(...list);
  if (!particleFrame) particleFrame = requestAnimationFrame(drawParticles);
}

/** Farbwert einer Blockfarbe (1–8) im aktiven Thema. */
function blockColor(c: string): string {
  if (!/^\d$/.test(c)) return c;
  return getComputedStyle(document.body).getPropertyValue(`--p${c}`).trim() || "#ff69b4";
}

export function sparks(at: Pt, count: number, spread = 50, color = "#fff", delay = 0, parent: HTMLElement = fx): void {
  if (parent === fx) {
    const now = performance.now();
    const list: Particle[] = [];
    for (let k = 0; k < count; k++) {
      const a = rand(0, Math.PI * 2);
      const d = spread * rand(0.4, 1);
      list.push({ x: at.x, y: at.y, dx: Math.cos(a) * d, dy: Math.sin(a) * d, size: 6, rot: 0, color, t0: now + delay, life: 450, round: true, glow: true });
    }
    addParticles(list);
    return;
  }
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
    const r = cellRect(i);
    sparks({ x: r.x + rand(0, r.w), y: r.y + rand(0, r.h) }, 1, 26, "#ffd76a");
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
  const now = performance.now();
  const shards: Particle[] = [];
  for (const i of indices) {
    const row = Math.floor(i / N);
    const col = i % N;
    const r = cellRect(i);
    const horizontal = rowSet.has(row);
    const away = horizontal ? Math.sign(col - oc) || (Math.random() < 0.5 ? -1 : 1) : Math.sign(row - or) || 1;
    const delay = Math.round((horizontal ? Math.abs(col - oc) : Math.abs(row - or)) * 18);
    const color = colorOf(i);
    // Erst läuft ein Regenbogen durch die Linie, dann zerfällt der Block in kleine Quadrate.
    const cell = div("fx-cell rb", {
      left: `${r.x}px`,
      top: `${r.y}px`,
      width: `${r.w}px`,
      height: `${r.h}px`,
      "--delay": `${delay}ms`,
      "--h": String(((horizontal ? col : row) * 45) % 360),
    });
    cell.dataset.c = color;
    spawn(cell, 380 + delay);
    const rgb = blockColor(color);
    for (let k = 0; k < 5; k++) {
      const along = away * rand(30, 110);
      const across = rand(-28, 28);
      shards.push({
        x: r.x + rand(r.w * 0.15, r.w * 0.85),
        y: r.y + rand(r.h * 0.15, r.h * 0.85),
        dx: horizontal ? along : across,
        dy: (horizontal ? across : along) + rand(0, 25),
        size: rand(r.w * 0.18, r.w * 0.32),
        rot: rand(-7, 7),
        color: rgb,
        t0: now + delay + 150,
        life: 500,
        round: false,
        glow: false,
      });
    }
  }
  addParticles(shards);
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
    // einfache Schrift statt 3D-Filter: 16+ gleichzeitige Filter bringen schwächere Handys ins Stocken
    const num = document.createElement("span");
    num.className = "num-lite";
    num.textContent = String(n);
    el.appendChild(num);
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
/** Combo-Anzeige wie im Original: „Combo“ weiß, Zahl groß in Gold; ab 8 „Combo-Meister“ mit Krone. */
export function comboContent(combo: number): HTMLElement[] {
  if (combo >= 8) {
    return [div("crown-icon"), text3d("Combo Master", "gold", "long"), text3d(`×${combo}`, "orange", "sub")];
  }
  const row = div("combo-n");
  row.append(text3d("Combo", "white"), text3d(String(combo), "gold"));
  return [row];
}

/** Mehrere Linien auf einmal: „×L“ mit zwei tanzenden Mäusen. */
export function linesContent(lines: number): HTMLElement[] {
  const row = div("combo-x");
  row.append(div("mascot"), text3d(`×${lines}`, "orange"), div("mascot right"));
  return [row];
}

/** „Farbe weg!“ oben im Feld mit buntem Funkenregen. */
export function colorGone(): void {
  const base = fx.getBoundingClientRect();
  const at = { x: base.width * 0.5, y: base.height * 0.07 };
  const el = div("color-gone", { left: `${at.x}px`, top: `${at.y}px` });
  el.appendChild(text3d("Color Gone!", "rose"));
  spawn(el, 1300);
  const colors = ["#ff4f7a", "#ffa53a", "#ffe04a", "#5fe36a", "#4ad8ff", "#a46bff"];
  colors.forEach((c, k) => sparks(at, 5, 90, c, k * 30));
}

const PRAISE_WORDS = ["Good!", "Great!", "Excellent!", "Wonderful!", "Amazing!"];

/** Eine einzelne Reihe: großes Herz mitten auf der Linie, Lobwort darüber, leuchtende Linie. */
export function heartPraise(rows: number[], cols: number[]): void {
  const horizontal = rows.length > 0;
  const first = horizontal ? rows[0] * N : cols[0];
  const last = horizontal ? rows[0] * N + N - 1 : (N - 1) * N + cols[0];
  const a = cellRect(first);
  const b = cellRect(last);
  const cx = (a.x + b.x + b.w) / 2;
  const cy = (a.y + b.y + b.h) / 2;
  spawn(
    div(horizontal ? "praise-line" : "praise-line col", horizontal
      ? { left: `${a.x}px`, top: `${cy}px`, width: `${b.x + b.w - a.x}px` }
      : { left: `${cx}px`, top: `${a.y}px`, height: `${b.y + b.h - a.y}px` }),
    950,
  );
  const el = div("heart-praise", { left: `${cx}px`, top: `${cy - cellRect(0).h * 0.6}px` });
  const word = document.createElement("span");
  word.className = "word";
  word.textContent = PRAISE_WORDS[Math.floor(Math.random() * PRAISE_WORDS.length)];
  el.append(word, div("heart"));
  spawn(el, 1300);
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

/** Auftakt zu „Alles weg!“: die abgeräumten Blöcke flackern in wechselnden Farben. */
export function flicker(indices: number[], duration: number): void {
  const els = indices.map((i) => {
    const r = cellRect(i);
    const d = div("fx-cell flicker", { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    d.dataset.c = String(1 + Math.floor(Math.random() * 8));
    fx.appendChild(d);
    return d;
  });
  const timer = window.setInterval(() => {
    for (const d of els) {
      d.dataset.c = String(1 + Math.floor(Math.random() * 8));
      d.classList.toggle("dim", Math.random() < 0.3);
    }
  }, 70);
  window.setTimeout(() => {
    window.clearInterval(timer);
    els.forEach((d) => d.remove());
  }, duration);
}

/** Leuchtkugeln mit Schweif schießen durch die geschafften Spalten nach oben bzw. durch Zeilen nach rechts. */
export function lightRockets(rows: number[], cols: number[]): void {
  const rocket = (from: number, to: number, rot: string, delay: number) => {
    const a = cellRect(from);
    const b = cellRect(to);
    spawn(
      div("orb", {
        left: `${a.x + a.w / 2 - 8}px`,
        top: `${a.y + a.h / 2 - 8}px`,
        animationDelay: `${delay}ms`,
        "--dx": `${b.x - a.x}px`,
        "--dy": `${b.y - a.y}px`,
        "--rot": rot,
      }),
      700 + delay,
    );
  };
  cols.forEach((c, k) => rocket((N - 1) * N + c, c, "0deg", k * 60));
  rows.forEach((r, k) => rocket(r * N, r * N + N - 1, "90deg", k * 60));
}

/**
 * Das Feld füllt sich reihenweise von unten mit Blöcken des (neuen) Themas
 * und leert sich danach reihenweise von oben.
 */
export function curtain(): void {
  for (let i = 0; i < N * N; i++) {
    const row = Math.floor(i / N);
    const r = cellRect(i);
    const b = div("block curtain", {
      left: `${r.x}px`,
      top: `${r.y}px`,
      width: `${r.w}px`,
      height: `${r.h}px`,
      "--din": `${(N - 1 - row) * 22}ms`,
      "--dout": `${330 + row * 22}ms`,
    });
    b.dataset.c = "1";
    spawn(b, 330 + N * 22 + 180);
  }
}

/** Diagonaler Lichtstreifen über das Spielfeld. */
export function shine(): void {
  spawn(div("shine"), 650);
}

/** Motive des neuen Themas fliegen diagonal über das leere Feld (wie die Raketen im Original). */
export function themeIntro(): void {
  const base = fx.getBoundingClientRect();
  for (let k = 0; k < 3; k++) {
    spawn(
      div("intro-motif", {
        left: `${rand(-0.1, 0.35) * base.width}px`,
        top: `${base.height * rand(0.75, 0.95)}px`,
        fontSize: `${rand(34, 52)}px`,
        animationDelay: `${k * 220}ms`,
        "--dx": `${base.width * 0.9}px`,
        "--dy": `${-base.height * 0.9}px`,
      }),
      1200 + k * 220,
    );
  }
}

const BALLOONS = ["#ffd23a", "#ff5f8a", "#a66cff", "#ffd23a", "#ff8fc0", "#7f6cff", "#ffe066"];

/** Feier bei „Alles weg!“: Ballons steigen auf, Konfetti fällt, optional mit Name des neuen Themas. */
export function celebrate(themeName: string | null): void {
  const layer = div("celebrate");
  for (let k = 0; k < 26; k++) {
    layer.appendChild(
      div("balloon", {
        left: `${rand(-5, 95)}%`,
        "--w": `${rand(60, 110)}px`,
        "--b": BALLOONS[k % BALLOONS.length],
        "--t": `${rand(1.0, 1.4)}s`,
        "--delay": `${rand(0, 0.2)}s`,
        "--sway": `${rand(-40, 40)}px`,
      }),
    );
  }
  for (let k = 0; k < 60; k++) {
    layer.appendChild(
      div("confetti", {
        left: `${rand(0, 100)}%`,
        "--b": BALLOONS[k % BALLOONS.length],
        "--t": `${rand(1.2, 1.8)}s`,
        "--delay": `${rand(0, 0.4)}s`,
        "--sway": `${rand(-80, 80)}px`,
      }),
    );
  }
  if (themeName) {
    const title = div("theme-title");
    const name = div("name");
    name.append(div("mascot"), text3d(themeName, "gold"), div("mascot right"));
    title.append(text3d("New Skin", "cyan", "sub"), name);
    layer.appendChild(title);
  }
  document.body.appendChild(layer);
  window.setTimeout(() => layer.remove(), 2300);
}
