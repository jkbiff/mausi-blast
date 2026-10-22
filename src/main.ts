import "./styles.css";
import { BOARD_SIZE as N, COMBO_MISS_LIMIT, TRAY_SIZE } from "./config";
import { canPlace, canPlaceAnywhere, place } from "./core/board";
import { comboLabel, praiseLabel } from "./core/combo";
import { canRevive, newGame, playMove, revive, type GameState } from "./core/game";
import { getPiece, type Piece } from "./core/pieces";
import { randomSeed } from "./core/rng";
import * as store from "./state/storage";
import { SKINS } from "./ui/skins";
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
const comboMeter = $("combo-meter");
const comboMeterText = $("combo-meter-text");
const skinsEl = $("skins");
const skinCycleOpt = $<HTMLInputElement>("opt-skin-cycle");
const photoBtn = $("btn-photo");
const photoInput = $<HTMLInputElement>("photo-input");

// ---------- Zustand ----------

let state: GameState = store.loadGame() ?? newGame(randomSeed());
let best = Math.max(store.loadBest(), state.score);
/** Rekord zu Beginn der Runde – für „Neuer Rekord!“. */
let bestAtStart = store.loadRoundBest() ?? store.loadBest();
store.saveRoundBest(bestAtStart);
/** „Neuer Rekord!“ wird pro Runde nur einmal gefeiert. */
let recordCelebrated = bestAtStart > 0 && state.score > bestAtStart;
let settings = store.loadSettings();
let shownScore = state.score;
let gameOverTimer = 0;
/** Blöcke grau färben, sobald das Game Over feststeht. */
let showDead = state.gameOver;

sfx.setSoundEnabled(settings.sound);
sfx.setHapticsEnabled(settings.haptics);
document.body.dataset.skin = settings.skin;
let photo = store.loadPhoto();
setPhoto(photo);

// ---------- DOM-Aufbau ----------

const cells: HTMLDivElement[] = [];
for (let i = 0; i < N * N; i++) {
  const d = document.createElement("div");
  d.className = "cell";
  // Verzögerung für das zeilenweise Ergrauen beim Game Over
  d.style.setProperty("--d", `${Math.floor(i / N) * 70}ms`);
  // Position für den Bildausschnitt im Foto-Design
  d.style.setProperty("--row", String(Math.floor(i / N)));
  d.style.setProperty("--col", String(i % N));
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
    if (v && showDead) cls += " dead";
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
  if (!recordCelebrated && bestAtStart > 0 && state.score > bestAtStart) {
    recordCelebrated = true;
    window.setTimeout(() => {
      banner([["praise", "Neuer Rekord!"]], "record");
      bestEl.parentElement!.classList.add("record");
      window.setTimeout(() => bestEl.parentElement!.classList.remove("record"), 1900);
      sfx.playRecord();
      sfx.vibrate([20, 40, 20, 40, 20]);
    }, 900);
  }
}

function renderComboMeter(bump = false): void {
  const active = state.combo >= 2 && !state.gameOver;
  comboMeter.classList.toggle("hidden", !active);
  if (!active) return;
  comboMeterText.textContent = `Combo ×${state.combo}`;
  // Leuchtende Punkte = Züge, die die Combo ohne Clear noch überlebt.
  const left = COMBO_MISS_LIMIT - state.missStreak;
  comboMeter.querySelectorAll("i").forEach((dot, k) => dot.classList.toggle("on", k < left));
  if (bump) {
    comboMeter.classList.remove("bump");
    void comboMeter.offsetWidth;
    comboMeter.classList.add("bump");
  }
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

/** Lichtstrahl, der durch jede geschaffte Zeile/Spalte fegt. */
function beams(rows: number[], cols: number[], color: number): void {
  const line = (from: number, to: number, cls: string) => {
    const a = cellRect(from);
    const b = cellRect(to);
    const d = document.createElement("div");
    d.className = `beam ${cls}`;
    d.dataset.c = String(color);
    Object.assign(d.style, {
      left: `${a.x}px`,
      top: `${a.y}px`,
      width: `${b.x + b.w - a.x}px`,
      height: `${b.y + b.h - a.y}px`,
    });
    spawn(d, 420);
  };
  for (const r of rows) line(r * N, r * N + N - 1, "row");
  for (const c of cols) line(c, (N - 1) * N + c, "col");
}

function flash(): void {
  const f = document.createElement("div");
  f.className = "flash";
  spawn(f, 480);
}

/** Zellen leuchten auf und poppen als Welle vom Ablageort weg. */
function clearEffect(indices: number[], colorOf: (i: number) => number, origin: number[], sparksPerCell = 1): void {
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
    sparks(r.x + r.w / 2, r.y + r.h / 2, colorOf(i), sparksPerCell, delay, 60 + sparksPerCell * 20);
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

/** Großer Text über dem Feld; jede Zeile ist [CSS-Klasse, Text]. */
function banner(lines: [string, string][], variant = ""): void {
  fxEl.querySelectorAll(`.banner${variant === "record" ? ".record" : ":not(.record)"}`).forEach((b) => b.remove());
  const b = document.createElement("div");
  b.className = `banner ${variant}`;
  for (const [cls, text] of lines) {
    const span = document.createElement("span");
    span.className = cls;
    span.textContent = text;
    b.appendChild(span);
  }
  spawn(b, variant === "allclear" ? 1850 : 1150);
}

function shake(): void {
  boardWrap.classList.remove("shake");
  void boardWrap.offsetWidth;
  boardWrap.classList.add("shake");
}

// ---------- Züge ----------

function commitMove(slot: number, row: number, col: number): void {
  const item = state.tray[slot]!;
  const res = playMove(state, slot, row, col);
  state = res.state;
  store.saveGame(state);

  renderBoard({ placed: res.placedCells });

  if (res.linesCleared > 0) {
    // Wie bei Block Blast: die geschafften Linien nehmen die Farbe des gelegten Steins an.
    clearEffect(res.clearedCells, () => item.color, res.placedCells, res.linesCleared >= 2 ? 2 : 1);
    beams(res.clearedRows, res.clearedCols, item.color);
    if (res.linesCleared >= 2) flash();
    popup(`+${res.points}`, centroid(res.clearedCells));
    const praise = praiseLabel(res.linesCleared);
    const combo = comboLabel(res.combo);
    if (res.allClear) {
      banner([["praise", "Alles weg!"], ["sub", "+300"]], "allclear");
      if (settings.skinCycle) window.setTimeout(nextSkin, 700);
      const c = centroid(res.clearedCells);
      for (let k = 1; k <= 8; k++) sparks(c.x, c.y, k, 6, 0, 160);
      sfx.playAllClear();
      sfx.vibrate([30, 40, 30, 40, 80]);
    } else {
      const lines: [string, string][] = [];
      if (praise) lines.push(["praise", praise]);
      if (combo) lines.push([praise ? "sub" : "praise", combo]);
      if (lines.length) banner(lines, `t${Math.min(res.linesCleared, 6)}`);
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
  renderComboMeter(res.linesCleared > 0);
  renderTray(res.dealtNewTray);
  if (state.gameOver) scheduleGameOver();
}

function scheduleGameOver(): void {
  window.clearTimeout(gameOverTimer);
  gameOverTimer = window.setTimeout(() => {
    // Erst ergrauen die Blöcke zeilenweise, dann kommt der Game-Over-Dialog.
    showDead = true;
    renderBoard();
    sfx.playGameOver();
    sfx.vibrate([60, 60, 120]);
    gameOverTimer = window.setTimeout(showGameOver, 900);
  }, 500);
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
  store.saveRoundBest(bestAtStart);
  recordCelebrated = false;
  showDead = false;
  shownScore = 0;
  store.saveGame(state);
  gameOverEl.classList.add("hidden");
  settingsEl.classList.add("hidden");
  fxEl.replaceChildren();
  renderBoard();
  renderComboMeter();
  renderTray(true);
  animateScore();
}

function doRevive(): void {
  if (!canRevive(state)) return;
  const before = state.board;
  const res = revive(state);
  state = res.state;
  store.saveGame(state);
  showDead = false;
  gameOverEl.classList.add("hidden");
  if (res.clearedCells.length) clearEffect(res.clearedCells, (i) => before[i], res.clearedCells);
  renderBoard();
  renderComboMeter();
  renderTray(true);
  banner([["praise", "Weiter geht's!"]]);
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
  skinCycleOpt.checked = settings.skinCycle;
  renderSkins();
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

function setPhoto(dataUrl: string | null): void {
  photo = dataUrl;
  document.body.classList.toggle("has-photo", !!dataUrl);
  if (dataUrl) document.body.style.setProperty("--photo", `url("${dataUrl}")`);
}

/** Bild quadratisch zuschneiden und verkleinern, damit es in den lokalen Speicher passt. */
async function readPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const size = Math.min(640, side);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    canvas.getContext("2d")!.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

photoInput.addEventListener("change", async () => {
  const file = photoInput.files?.[0];
  photoInput.value = "";
  if (!file) return;
  try {
    const dataUrl = await readPhoto(file);
    if (!store.savePhoto(dataUrl)) throw new Error("Speicher voll");
    setPhoto(dataUrl);
    applySkin("foto");
  } catch {
    alert("Das Foto konnte leider nicht geladen werden.");
  }
});

photoBtn.addEventListener("click", () => photoInput.click());

function applySkin(skin: string): void {
  settings = { ...settings, skin };
  store.saveSettings(settings);
  document.body.dataset.skin = skin;
  renderSkins();
}

/** Belohnung für „Alles weg!“: das nächste Blockdesign (Foto nur, wenn eins gewählt ist). */
function nextSkin(): void {
  const ids = SKINS.map((s) => s.id).filter((id) => id !== "foto" || photo);
  applySkin(ids[(ids.indexOf(settings.skin) + 1) % ids.length]);
  boardEl.classList.remove("skin-swap");
  void boardEl.offsetWidth;
  boardEl.classList.add("skin-swap");
}

function renderSkins(): void {
  skinsEl.replaceChildren(
    ...SKINS.map((s) => {
      const btn = document.createElement("button");
      btn.dataset.skin = s.id;
      btn.classList.toggle("active", s.id === settings.skin);
      const block = document.createElement("b");
      block.className = s.id === "foto" && photo ? "block photo-thumb" : "block";
      block.dataset.c = String(s.preview);
      btn.append(block, s.name);
      return btn;
    }),
  );
  photoBtn.classList.toggle("hidden", settings.skin !== "foto" || !photo);
}

skinsEl.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-skin]");
  const skin = btn?.dataset.skin;
  if (!skin) return;
  // Foto-Design ohne Foto: erst eins auswählen lassen.
  if (skin === "foto" && !photo) {
    photoInput.click();
    return;
  }
  applySkin(skin);
  sfx.playPickup();
});

function updateSettings(): void {
  settings = { ...settings, sound: soundOpt.checked, haptics: hapticsOpt.checked, skinCycle: skinCycleOpt.checked };
  store.saveSettings(settings);
  sfx.setSoundEnabled(settings.sound);
  sfx.setHapticsEnabled(settings.haptics);
  if (settings.sound) sfx.playPickup();
  if (settings.haptics) sfx.vibrate(15);
}
soundOpt.addEventListener("change", updateSettings);
hapticsOpt.addEventListener("change", updateSettings);
skinCycleOpt.addEventListener("change", updateSettings);

// ---------- Start ----------

window.addEventListener("resize", layout);
document.addEventListener("contextmenu", (e) => e.preventDefault());

store.saveGame(state);
layout();
renderBoard();
renderTray(true);
setBest();
renderComboMeter();
scoreEl.textContent = String(state.score);
if (state.gameOver) showGameOver();

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
