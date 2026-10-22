import "./styles.css";
import { BOARD_SIZE as N, TRAY_SIZE } from "./config";
import { canPlace, canPlaceAnywhere, place } from "./core/board";
import { comboLabel } from "./core/combo";
import { canRevive, newGame, playMove, revive, type GameState } from "./core/game";
import { getPiece, type Piece } from "./core/pieces";
import { randomSeed } from "./core/rng";
import * as store from "./state/storage";
import * as sfx from "./ui/sound";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const boardWrap = $("board-wrap");
const boardEl = $("board");
const fxEl = $("fx");
const trayEl = $("tray");
const scoreEl = $("score");
const bestEl = $("best");
const gameOverEl = $("overlay-gameover");
const settingsEl = $("overlay-settings");
const soundOpt = $<HTMLInputElement>("opt-sound");
const hapticsOpt = $<HTMLInputElement>("opt-haptics");
const newGameBtn = $("btn-newgame");

// ---------- Zustand ----------

let state: GameState = store.loadGame() ?? newGame(randomSeed());
let best = Math.max(store.loadBest(), state.score);
/** Rekord zu Beginn der Runde – für „Neuer Rekord!“. */
let bestAtStart = store.loadBest();
let settings = store.loadSettings();
let shownScore = state.score;
let gameOverTimer = 0;

sfx.setSoundEnabled(settings.sound);
sfx.setHapticsEnabled(settings.haptics);

// ---------- DOM-Aufbau ----------

const cells: HTMLDivElement[] = [];
for (let i = 0; i < N * N; i++) {
  const d = document.createElement("div");
  d.className = "cell";
  boardEl.appendChild(d);
  cells.push(d);
}

const slots: HTMLDivElement[] = [];
for (let i = 0; i < TRAY_SIZE; i++) {
  const d = document.createElement("div");
  d.className = "slot";
  d.dataset.slot = String(i);
  trayEl.appendChild(d);
  slots.push(d);
}

let cellPx = 40;
let gapPx = 3;
let trayCellPx = 20;

function layout(): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const size = Math.floor(Math.min(vw - 24, 520, (vh - 140) / 1.45));
  document.documentElement.style.setProperty("--board", `${size}px`);
  const r0 = cells[0].getBoundingClientRect();
  const r1 = cells[1].getBoundingClientRect();
  cellPx = r0.width;
  gapPx = r1.left - r0.right;
  trayCellPx = Math.floor(Math.min(cellPx * 0.6, (size / 3 - 8) / 5));
  renderTray(false);
}

// ---------- Rendering ----------

interface BoardOverlay {
  ghost?: number[];
  clear?: number[];
  color?: number;
  placed?: number[];
}

function renderBoard(o: BoardOverlay = {}): void {
  const ghost = new Set(o.ghost);
  const clear = new Set(o.clear);
  const placed = new Set(o.placed);
  for (let i = 0; i < N * N; i++) {
    const v = state.board[i];
    let cls = "cell";
    let color = v;
    if (v) cls += " filled";
    if (ghost.has(i)) {
      cls += " ghost";
      color = o.color!;
    }
    if (clear.has(i)) {
      cls += " will-clear";
      color = o.color!;
    }
    if (placed.has(i)) cls += " placed";
    const el = cells[i];
    if (el.className !== cls) el.className = cls;
    const c = color ? String(color) : "";
    if ((el.dataset.c ?? "") !== c) {
      if (c) el.dataset.c = c;
      else delete el.dataset.c;
    }
  }
}

function pieceEl(piece: Piece, color: number, cell: number, gap: number): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "piece";
  el.style.gridTemplateColumns = `repeat(${piece.w}, ${cell}px)`;
  el.style.gridTemplateRows = `repeat(${piece.h}, ${cell}px)`;
  el.style.gap = `${gap}px`;
  const filled = new Set(piece.cells.map(([r, c]) => r * piece.w + c));
  for (let i = 0; i < piece.w * piece.h; i++) {
    const d = document.createElement("div");
    if (filled.has(i)) {
      d.className = "block";
      d.dataset.c = String(color);
    } else {
      d.className = "void";
    }
    el.appendChild(d);
  }
  return el;
}

function renderTray(dealAnimation: boolean): void {
  state.tray.forEach((item, i) => {
    const slot = slots[i];
    slot.replaceChildren();
    slot.className = "slot";
    if (!item) return;
    const piece = getPiece(item.pieceId);
    const el = pieceEl(piece, item.color, trayCellPx, Math.max(1, Math.round(gapPx * 0.6)));
    if (dealAnimation) {
      slot.classList.add("deal");
      el.style.animationDelay = `${i * 70}ms`;
    }
    if (!canPlaceAnywhere(state.board, piece)) slot.classList.add("disabled");
    slot.appendChild(el);
  });
}

function setBest(): void {
  if (state.score > best) {
    best = state.score;
    store.saveBest(best);
  }
  bestEl.textContent = String(best);
}

let scoreAnim = 0;
function animateScore(): void {
  cancelAnimationFrame(scoreAnim);
  const from = shownScore;
  const to = state.score;
  if (from === to) {
    scoreEl.textContent = String(to);
    return;
  }
  const start = performance.now();
  const dur = Math.min(700, 250 + (to - from) * 2);
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    shownScore = Math.round(from + (to - from) * eased);
    scoreEl.textContent = String(shownScore);
    if (t < 1) scoreAnim = requestAnimationFrame(step);
  };
  scoreAnim = requestAnimationFrame(step);
}

// ---------- Effekte ----------

function cellRect(i: number): { x: number; y: number; w: number; h: number } {
  const base = fxEl.getBoundingClientRect();
  const r = cells[i].getBoundingClientRect();
  return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height };
}

function centroid(indices: number[]): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (const i of indices) {
    const r = cellRect(i);
    x += r.x + r.w / 2;
    y += r.y + r.h / 2;
  }
  return { x: x / indices.length, y: y / indices.length };
}

function spawn(el: HTMLElement, ttl: number): void {
  fxEl.appendChild(el);
  window.setTimeout(() => el.remove(), ttl);
}

/** Zellen leuchten auf und poppen als Welle vom Ablageort weg. */
function clearEffect(indices: number[], colorOf: (i: number) => number, origin: number[]): void {
  const or = origin.reduce((s, i) => s + Math.floor(i / N), 0) / origin.length;
  const oc = origin.reduce((s, i) => s + (i % N), 0) / origin.length;
  for (const i of indices) {
    const r = cellRect(i);
    const dist = Math.hypot(Math.floor(i / N) - or, (i % N) - oc);
    const delay = Math.round(dist * 32);
    const d = document.createElement("div");
    d.className = "fx-cell";
    d.dataset.c = String(colorOf(i));
    Object.assign(d.style, {
      left: `${r.x}px`,
      top: `${r.y}px`,
      width: `${r.w}px`,
      height: `${r.h}px`,
      animationDelay: `${delay}ms`,
    });
    spawn(d, 400 + delay);
    sparks(r.x + r.w / 2, r.y + r.h / 2, colorOf(i), 1, delay);
  }
}

function sparks(x: number, y: number, color: number, count: number, delay = 0, spread = 70): void {
  for (let k = 0; k < count; k++) {
    const s = document.createElement("div");
    s.className = "spark";
    s.dataset.c = String(color);
    const a = Math.random() * Math.PI * 2;
    const dist = spread * (0.5 + Math.random());
    Object.assign(s.style, {
      left: `${x - 4}px`,
      top: `${y - 4}px`,
      animationDelay: `${delay}ms`,
    });
    s.style.setProperty("--dx", `${Math.cos(a) * dist}px`);
    s.style.setProperty("--dy", `${Math.sin(a) * dist}px`);
    s.style.setProperty("--rot", `${Math.round(Math.random() * 720 - 360)}deg`);
    spawn(s, 750 + delay);
  }
}

function popup(text: string, at: { x: number; y: number }): void {
  const p = document.createElement("div");
  p.className = "popup";
  p.textContent = text;
  p.style.left = `${at.x}px`;
  p.style.top = `${at.y}px`;
  spawn(p, 950);
}

function banner(text: string, variant = ""): void {
  fxEl.querySelectorAll(".banner").forEach((b) => b.remove());
  const b = document.createElement("div");
  b.className = `banner ${variant}`;
  b.textContent = text;
  spawn(b, variant === "allclear" ? 1850 : 1050);
}

function shake(): void {
  boardWrap.classList.remove("shake");
  void boardWrap.offsetWidth;
  boardWrap.classList.add("shake");
}

// ---------- Züge ----------

function commitMove(slot: number, row: number, col: number): void {
  const item = state.tray[slot]!;
  const before = state.board;
  const res = playMove(state, slot, row, col);
  state = res.state;
  store.saveGame(state);

  renderBoard({ placed: res.placedCells });

  if (res.linesCleared > 0) {
    const placed = new Set(res.placedCells);
    clearEffect(res.clearedCells, (i) => (placed.has(i) ? item.color : before[i]), res.placedCells);
    popup(`+${res.points}`, centroid(res.clearedCells));
    const label = comboLabel(res.combo);
    if (res.allClear) {
      banner("Alles weg! +300", "allclear");
      const c = centroid(res.clearedCells);
      for (let k = 1; k <= 8; k++) sparks(c.x, c.y, k, 6, 0, 160);
      sfx.playAllClear();
      sfx.vibrate([30, 40, 30, 40, 80]);
    } else {
      if (label) banner(label);
      else if (res.linesCleared >= 3) banner("Wow!");
      sfx.playClear(res.linesCleared, res.combo);
      sfx.vibrate(res.linesCleared > 1 ? [20, 30, 35] : 25);
    }
    if (res.linesCleared >= 3) shake();
  } else {
    sfx.playPlace();
    sfx.vibrate(8);
  }

  setBest();
  animateScore();
  renderTray(res.dealtNewTray);
  if (state.gameOver) scheduleGameOver();
}

function scheduleGameOver(): void {
  window.clearTimeout(gameOverTimer);
  gameOverTimer = window.setTimeout(() => {
    sfx.playGameOver();
    sfx.vibrate([60, 60, 120]);
    showGameOver();
  }, 750);
}

function showGameOver(): void {
  $("go-score").textContent = String(state.score);
  $("go-best").textContent = String(best);
  $("go-record").classList.toggle("hidden", !(state.score > bestAtStart && state.score > 0));
  $("btn-revive").classList.toggle("hidden", !canRevive(state));
  gameOverEl.classList.remove("hidden");
}

function startNewGame(): void {
  window.clearTimeout(gameOverTimer);
  state = newGame(randomSeed());
  bestAtStart = best;
  shownScore = 0;
  store.saveGame(state);
  gameOverEl.classList.add("hidden");
  settingsEl.classList.add("hidden");
  fxEl.replaceChildren();
  renderBoard();
  renderTray(true);
  animateScore();
}

function doRevive(): void {
  if (!canRevive(state)) return;
  const before = state.board;
  const res = revive(state);
  state = res.state;
  store.saveGame(state);
  gameOverEl.classList.add("hidden");
  if (res.clearedCells.length) clearEffect(res.clearedCells, (i) => before[i], res.clearedCells);
  renderBoard();
  renderTray(true);
  banner("Weiter geht's!");
  sfx.playRevive();
  sfx.vibrate([20, 40, 20]);
  if (state.gameOver) scheduleGameOver();
}

// ---------- Drag & Drop ----------

interface Drag {
  slot: number;
  piece: Piece;
  color: number;
  layer: HTMLDivElement;
  pointerId: number;
  lift: number;
  w: number;
  h: number;
  anchor: { r: number; c: number } | null;
}

let drag: Drag | null = null;

function findAnchor(piece: Piece, left: number, top: number): { r: number; c: number } | null {
  const r0 = cells[0].getBoundingClientRect();
  const pitch = cells[1].getBoundingClientRect().left - r0.left;
  const fc = (left - r0.left) / pitch;
  const fr = (top - r0.top) / pitch;
  const options: { r: number; c: number; d: number }[] = [];
  for (const r of [Math.floor(fr), Math.ceil(fr)]) {
    for (const c of [Math.floor(fc), Math.ceil(fc)]) {
      const dr = Math.abs(r - fr);
      const dc = Math.abs(c - fc);
      if (dr < 0.8 && dc < 0.8) options.push({ r, c, d: dr * dr + dc * dc });
    }
  }
  options.sort((a, b) => a.d - b.d);
  return options.find((o) => canPlace(state.board, piece, o.r, o.c)) ?? null;
}

function moveDrag(x: number, y: number): void {
  if (!drag) return;
  const left = x - drag.w / 2;
  const top = y - drag.lift - drag.h / 2;
  drag.layer.style.transform = `translate(${left}px, ${top}px)`;
  const anchor = findAnchor(drag.piece, left, top);
  const same = anchor && drag.anchor && anchor.r === drag.anchor.r && anchor.c === drag.anchor.c;
  if (same || (!anchor && !drag.anchor)) return;
  drag.anchor = anchor;
  if (anchor) {
    const res = place(state.board, drag.piece, anchor.r, anchor.c, drag.color);
    renderBoard({ ghost: res.placedCells, clear: res.clearedCells, color: drag.color });
  } else {
    renderBoard();
  }
}

function endDrag(): void {
  if (!drag) return;
  const d = drag;
  drag = null;
  if (d.anchor) {
    d.layer.remove();
    commitMove(d.slot, d.anchor.r, d.anchor.c);
    return;
  }
  renderBoard();
  // Stein fliegt zurück in den Tray.
  const slotRect = slots[d.slot].getBoundingClientRect();
  const scale = trayCellPx / cellPx;
  const x = slotRect.left + slotRect.width / 2 - (d.w * scale) / 2;
  const y = slotRect.top + slotRect.height / 2 - (d.h * scale) / 2;
  d.layer.classList.add("returning");
  d.layer.style.transformOrigin = "0 0";
  d.layer.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  window.setTimeout(() => {
    d.layer.remove();
    slots[d.slot].classList.remove("lifted");
  }, 180);
}

trayEl.addEventListener("pointerdown", (e) => {
  sfx.unlockAudio();
  const slotEl = (e.target as HTMLElement).closest<HTMLDivElement>(".slot");
  if (!slotEl || drag || state.gameOver) return;
  const slot = Number(slotEl.dataset.slot);
  const item = state.tray[slot];
  if (!item) return;
  e.preventDefault();

  const piece = getPiece(item.pieceId);
  const layer = document.createElement("div");
  layer.className = "drag-layer";
  layer.appendChild(pieceEl(piece, item.color, cellPx, gapPx));
  document.body.appendChild(layer);

  const w = piece.w * cellPx + (piece.w - 1) * gapPx;
  const h = piece.h * cellPx + (piece.h - 1) * gapPx;
  // Bei Touch schwebt der Stein über dem Finger, damit der Daumen nichts verdeckt.
  const lift = e.pointerType === "mouse" ? 0 : h / 2 + cellPx * 1.1;
  drag = { slot, piece, color: item.color, layer, pointerId: e.pointerId, lift, w, h, anchor: null };
  slotEl.classList.add("lifted");
  moveDrag(e.clientX, e.clientY);
  sfx.playPickup();
});

window.addEventListener("pointermove", (e) => {
  if (drag && e.pointerId === drag.pointerId) {
    e.preventDefault();
    moveDrag(e.clientX, e.clientY);
  }
}, { passive: false });

window.addEventListener("pointerup", (e) => {
  if (drag && e.pointerId === drag.pointerId) endDrag();
});

window.addEventListener("pointercancel", (e) => {
  if (drag && e.pointerId === drag.pointerId) {
    drag.anchor = null;
    endDrag();
  }
});

// ---------- Menüs ----------

$("btn-revive").addEventListener("click", doRevive);
$("btn-restart").addEventListener("click", startNewGame);

$("btn-settings").addEventListener("click", () => {
  sfx.unlockAudio();
  soundOpt.checked = settings.sound;
  hapticsOpt.checked = settings.haptics;
  newGameBtn.textContent = "Neues Spiel";
  newGameBtn.classList.remove("danger");
  settingsEl.classList.remove("hidden");
});

$("btn-close-settings").addEventListener("click", () => settingsEl.classList.add("hidden"));

settingsEl.addEventListener("click", (e) => {
  if (e.target === settingsEl) settingsEl.classList.add("hidden");
});

newGameBtn.addEventListener("click", () => {
  // Zweimal tippen, damit man nicht versehentlich die Runde verliert.
  if (!newGameBtn.classList.contains("danger") && !state.gameOver && state.score > 0) {
    newGameBtn.textContent = "Wirklich? Nochmal tippen";
    newGameBtn.classList.add("danger");
    return;
  }
  startNewGame();
});

function updateSettings(): void {
  settings = { sound: soundOpt.checked, haptics: hapticsOpt.checked };
  store.saveSettings(settings);
  sfx.setSoundEnabled(settings.sound);
  sfx.setHapticsEnabled(settings.haptics);
  if (settings.sound) sfx.playPickup();
  if (settings.haptics) sfx.vibrate(15);
}
soundOpt.addEventListener("change", updateSettings);
hapticsOpt.addEventListener("change", updateSettings);

// ---------- Start ----------

window.addEventListener("resize", layout);
document.addEventListener("contextmenu", (e) => e.preventDefault());

store.saveGame(state);
layout();
renderBoard();
renderTray(true);
setBest();
scoreEl.textContent = String(state.score);
if (state.gameOver) showGameOver();

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
