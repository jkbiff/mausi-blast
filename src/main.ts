import "./styles.css";
import { BOARD_SIZE as N, COMBO_MISS_LIMIT, TRAY_SIZE } from "./config";
import { canPlace, canPlaceAnywhere, place } from "./core/board";
import { praiseLabel } from "./core/combo";
import { modeOf, newGame, playMove, type GameState, type MoveResult } from "./core/game";
import type { GameMode } from "./config";
import { getPiece, type Piece } from "./core/pieces";
import { randomSeed } from "./core/rng";
import * as store from "./state/storage";
import * as fx from "./ui/effects";
import { SKINS, skinName } from "./ui/skins";
import * as sfx from "./ui/sound";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const boardWrap = $("board-wrap");
const boardEl = $("board");
const fxEl = $("fx");
const noSpaceEl = $("no-space");
const scoreGem = $("score-gem");
const trayEl = $("tray");
const scoreEl = $("score");
const bestEl = $("best");
const gameOverEl = $("overlay-gameover");
const settingsEl = $("overlay-settings");
const soundOpt = $<HTMLInputElement>("opt-sound");
const newGameBtn = $("btn-newgame");
const comboMeter = $("combo-meter");
const comboMeterText = $("combo-meter-text");
const skinsEl = $("skins");
const skinCycleOpt = $<HTMLInputElement>("opt-skin-cycle");
const photoBtn = $("btn-photo");
const photoInput = $<HTMLInputElement>("photo-input");

// ---------- Zustand ----------

let settings = store.loadSettings();
// Hinter dem Startbildschirm liegt die zuletzt gespielte Runde; die eigentliche Wahl trifft man dort.
let state: GameState = store.loadGame(settings.lastMode) ?? newGame(randomSeed(), settings.lastMode);
let best = Math.max(store.loadBest(modeOf(state)), state.score);
/** Rekord zu Beginn der Runde – für „Neuer Rekord!“. */
let bestAtStart = store.loadRoundBest(modeOf(state)) ?? store.loadBest(modeOf(state));
/** „Neuer Rekord!“ wird pro Runde nur einmal gefeiert. */
let recordCelebrated = bestAtStart > 0 && state.score > bestAtStart;
let stats = store.loadStats(modeOf(state));
let shownScore = state.score;
let gameOverTimer = 0;
/** Beim Game Over werden die leeren Felder mit bunten Blöcken aufgefüllt (Feld → Farbe). */
let deadFill: Map<number, number> | null = null;

sfx.setSoundEnabled(settings.sound);
document.body.dataset.skin = settings.skin;
// auch am <html>, damit dessen Grundfarbe (--page-end) zum Thema passt
document.documentElement.dataset.skin = settings.skin;
let photo = store.loadPhoto();
setPhoto(photo);

// ---------- DOM-Aufbau ----------

const cells: HTMLDivElement[] = [];
for (let i = 0; i < N * N; i++) {
  const d = document.createElement("div");
  d.className = "cell";
  // Verzögerung für das Auffüllen beim Game Over (von oben nach unten, ca. 0,3 s)
  d.style.setProperty("--d", `${Math.floor(i / N) * 35 + (i % N) * 4}ms`);
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

/**
 * Feldgröße und Fuge aus dem echten Spielfeld messen. Ist das Stylesheet noch nicht angewendet
 * (Safari lädt es manchmal erst nach dem Skript), wäre ein „Feld“ so breit wie das ganze Brett –
 * dann wird aus der Brettgröße gerechnet und später neu gemessen.
 */
function measureCells(size = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--board")) || 360): boolean {
  const r0 = cells[0].getBoundingClientRect();
  const r1 = cells[1].getBoundingClientRect();
  const pitch = r1.left - r0.left;
  const plausible = r0.width > 4 && r0.width < size / 6 && pitch > r0.width && pitch < size / 6;
  if (plausible) {
    cellPx = r0.width;
    gapPx = pitch - r0.width;
  } else {
    gapPx = 2;
    cellPx = Math.max(10, (size * 0.95 - 7 * gapPx) / 8);
  }
  return plausible;
}

function layout(): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Platzbedarf: Kopfzeile + Punktestand (0,3 × Brett) + Brett + Tray (0,4 × Brett) + Ränder
  const size = Math.floor(Math.min(vw - 26, 520, (vh - 90) / 1.72));
  document.documentElement.style.setProperty("--board", `${size}px`);
  measureCells(size);
  // Tray-Steine wie im Original knapp halb so groß wie die Felder
  trayCellPx = Math.floor(Math.min(cellPx * 0.46, (size / 3 - 8) / 5));
  boardWrap.style.setProperty("--bsz", `${cellPx}px`);
  fx.invalidateGeometry();
  renderTray(false);
}

// ---------- Rendering ----------

interface BoardOverlay {
  ghost?: number[];
  color?: number;
  /** Linien, die durch die Vorschau voll würden (bekommen einen Regenbogenrand). */
  clearRows?: number[];
  clearCols?: number[];
  placed?: number[];
}

function renderBoard(o: BoardOverlay = {}): void {
  const ghost = new Set(o.ghost);
  const placed = new Set(o.placed);
  const rows = new Set(o.clearRows);
  const cols = new Set(o.clearCols);
  // Mitte des Geist-Steins: von dort läuft die Umfärbe-Welle durch die Linien
  const gr = o.ghost?.length ? o.ghost.reduce((s, i) => s + Math.floor(i / N), 0) / o.ghost.length : 0;
  const gc = o.ghost?.length ? o.ghost.reduce((s, i) => s + (i % N), 0) / o.ghost.length : 0;
  for (let i = 0; i < N * N; i++) {
    const v = state.board[i];
    const r = Math.floor(i / N);
    const c = i % N;
    let cls = "cell";
    let color = v;
    if (v) cls += " filled";
    const fill = !v ? deadFill?.get(i) : undefined;
    if (fill) {
      cls += " filled fill-in";
      color = fill;
    }
    if (ghost.has(i)) {
      cls += " ghost";
      color = o.color!;
    }
    if (rows.has(r) || cols.has(c)) {
      // Wie im Original: die Linie färbt sich als Welle vom Stein aus in dessen Farbe um
      cls += " will-clear";
      const dist = Math.min(rows.has(r) ? Math.abs(c - gc) : 99, cols.has(c) ? Math.abs(r - gr) : 99);
      cells[i].style.setProperty("--wd", `${Math.round(dist * 40)}ms`);
      cells[i].style.setProperty("--pc", `var(--p${o.color})`);
    }
    if (placed.has(i)) cls += " placed";
    const el = cells[i];
    if (el.className !== cls) el.className = cls;
    const cs = color ? String(color) : "";
    if ((el.dataset.c ?? "") !== cs) {
      if (cs) el.dataset.c = cs;
      else delete el.dataset.c;
    }
  }
}

function pieceEl(piece: Piece, color: number, cell: number, gap: number): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "piece";
  el.style.setProperty("--bsz", `${cell}px`);
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
    store.saveBest(modeOf(state), best);
  }
  bestEl.textContent = String(best);
  if (!recordCelebrated && bestAtStart > 0 && state.score > bestAtStart) {
    recordCelebrated = true;
    window.setTimeout(() => {
      fx.banner([fx.text3d("New Best!", "gold")], "record", 1500);
      bestEl.parentElement!.classList.add("record");
      window.setTimeout(() => bestEl.parentElement!.classList.remove("record"), 1900);
      sfx.playRecord();
    }, 900);
  }
}

function renderComboMeter(bump = false): void {
  const active = state.combo >= 2 && !state.gameOver;
  // Goldener Rahmen, solange eine Combo läuft
  boardWrap.classList.toggle("combo-hot", active);
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
/**
 * Wie im Original zählt der Punktestand gleichmäßig hoch: kleine Gewinne in ~0,3 s,
 * große (z. B. Bonus) über bis zu 2,5 s. Neue Punkte während des Zählens laufen einfach weiter.
 */
function animateScore(): void {
  cancelAnimationFrame(scoreAnim);
  const from = shownScore;
  const to = state.score;
  const scoreWrap = scoreEl.parentElement!;
  if (from >= to) {
    shownScore = to;
    scoreEl.textContent = String(to);
    scoreWrap.classList.remove("counting");
    return;
  }
  const start = performance.now();
  const dur = Math.min(2500, Math.max(300, ((to - from) / 60) * 1000));
  scoreEl.classList.remove("bump");
  void scoreEl.offsetWidth;
  scoreEl.classList.add("bump");
  scoreWrap.classList.add("counting");
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / dur);
    shownScore = Math.round(from + (to - from) * t);
    scoreEl.textContent = String(shownScore);
    if (t < 1) scoreAnim = requestAnimationFrame(step);
    else scoreWrap.classList.remove("counting");
  };
  scoreAnim = requestAnimationFrame(step);
}

// ---------- Effekte ----------

function shake(): void {
  boardWrap.classList.remove("shake");
  void boardWrap.offsetWidth;
  boardWrap.classList.add("shake");
}

function pulseScoreGem(): void {
  scoreGem.classList.remove("pulse");
  void scoreGem.offsetWidth;
  scoreGem.classList.add("pulse");
  const r = scoreGem.getBoundingClientRect();
  fx.sparksAt(r.left + r.width / 2, r.top + r.height / 2, 6);
}

function praiseVariant(lines: number): string {
  return lines >= 4 ? "rainbow" : lines === 3 ? "cyan" : "green";
}

// ---------- Züge ----------

function commitMove(slot: number, row: number, col: number): void {
  const item = state.tray[slot]!;
  const before = state.board;
  const res = playMove(state, slot, row, col);
  state = res.state;
  store.saveGame(state);
  updateStats(res);

  renderBoard({ placed: res.placedCells });
  fx.placeSparkles(res.placedCells);

  if (res.allClear) {
    allClearSequence(res, item.color);
  } else if (res.linesCleared > 0) {
    // Sofort: zerspringende Blöcke an der Stelle der abgeräumten Felder (sonst blitzt das leere Feld auf).
    fx.shatter(res.clearedCells, () => String(item.color), res.clearedRows, res.placedCells);
    fx.streaks(res.clearedRows, res.clearedCols);
    sfx.playClear(res.linesCleared, res.combo);
    if (res.linesCleared >= 3) shake();
    // Ein Bild später: Zahlen, Lob und Banner – so verteilt sich die Arbeit auf zwei Bilder.
    requestAnimationFrame(() => clearTexts(res, item.color, before));
  } else {
    sfx.playPlace();
  }

  setBest();
  animateScore();
  renderComboMeter(res.linesCleared > 0);
  // Tray erst im nächsten Bild neu aufbauen, nicht im selben wie das Abräumen
  if (res.dealtNewTray) requestAnimationFrame(() => renderTray(true));
  else renderTray(false);
  if (state.gameOver) scheduleGameOver();
}

function clearTexts(res: MoveResult, color: number, before: number[]): void {
  {
    if (res.combo >= 2) fx.cellNumbers(res.clearedCells, res.combo);
    fx.points(res.points, fx.centroid(res.clearedCells), res.combo >= 4 ? "green" : "gold");
    pulseScoreGem();

    // Eine Reihe: Herz mit Lobwort; mehrere Reihen: „×L“ mit Mäusen (ab 4 zusätzlich großes Lob)
    const parts: HTMLElement[] = [];
    if (res.linesCleared === 1) {
      if (res.combo < 2) fx.heartPraise(res.clearedRows, res.clearedCols);
    } else {
      // Lob wie auf block-blast.gg: 2 Good, 3 Great, 4 Excellent, 5+ Fantastic
      parts.push(fx.text3d(praiseLabel(res.linesCleared)!, praiseVariant(res.linesCleared)));
      parts.push(...fx.linesContent(res.linesCleared));
    }
    if (res.combo >= 2) parts.push(...fx.comboContent(res.combo));
    if (parts.length) fx.banner(parts, res.linesCleared >= 4 || res.combo >= 8 ? "huge" : "");
    // „Farbe weg!“: eine Farbe, die vorher auf dem Feld war, ist durch das Abräumen ganz verschwunden
    const colorsBefore = new Set([...before.filter(Boolean), color]);
    const colorsAfter = new Set(res.state.board.filter(Boolean));
    if ([...colorsBefore].some((c) => !colorsAfter.has(c))) window.setTimeout(fx.colorGone, 150);
  }
}

/**
 * „Alles weg!“ wie im Original: Flackern → Zersplittern mit Leuchtkugeln und Combo →
 * Themenwechsel, Feld füllt sich von unten, Ballons → Feld leert sich von oben, Lichtstreifen →
 * Motive des neuen Themas fliegen übers leere Feld.
 */
function allClearSequence(res: MoveResult, color: number): void {
  sfx.playAllClear();
  // Kompakt (≈ 1 s), damit das neue Thema steht, bevor man den nächsten Stein legt.
  fx.flicker(res.clearedCells, 160);

  window.setTimeout(() => {
    fx.shatter(res.clearedCells, () => String(color), res.clearedRows, res.placedCells);
    fx.streaks(res.clearedRows, res.clearedCols);
    fx.lightRockets(res.clearedRows, res.clearedCols);
    if (res.combo >= 2) fx.cellNumbers(res.clearedCells, res.combo);
    fx.points(res.points, fx.centroid(res.clearedCells), "gold");
    pulseScoreGem();
    // Kurz genug, dass es vor dem Themenwechsel verschwindet (Name des neuen Themas folgt)
    const parts = [fx.text3d("All Clear!", "rainbow")];
    if (res.combo >= 2) parts.push(...fx.comboContent(res.combo));
    fx.banner(parts, "huge", 900);
  }, 160);

  window.setTimeout(() => {
    let title: string | null = null;
    if (settings.skinCycle) {
      const next = nextSkinId();
      applySkin(next);
      title = skinName(next);
    }
    boardWrap.classList.add("neon");
    fx.curtain();
    fx.celebrate(title);
  }, 300);
  window.setTimeout(fx.shine, 750);
  window.setTimeout(fx.themeIntro, 950);
  window.setTimeout(() => boardWrap.classList.remove("neon"), 1900);
}

/** Wie im Original: Band „Kein Platz mehr“ über dem Tray, leere Felder füllen sich bunt, dann das Ergebnis. */
function showNoSpace(): void {
  deadFill = new Map();
  state.board.forEach((v, i) => {
    if (!v) deadFill!.set(i, 1 + Math.floor(Math.random() * 8));
  });
  renderBoard();
  noSpaceEl.classList.remove("hidden");
  boardWrap.classList.remove("combo-hot");
}

function scheduleGameOver(): void {
  window.clearTimeout(gameOverTimer);
  gameOverTimer = window.setTimeout(() => {
    showNoSpace();
    sfx.playGameOver();
    gameOverTimer = window.setTimeout(showGameOver, 2200);
  }, 450);
}

function updateStats(res: MoveResult): void {
  const next = {
    bestCombo: Math.max(stats.bestCombo, res.combo),
    allClears: stats.allClears + (res.allClear ? 1 : 0),
  };
  if (next.bestCombo !== stats.bestCombo || next.allClears !== stats.allClears) {
    stats = next;
    store.saveStats(modeOf(state), stats);
  }
}

function showGameOver(): void {
  $("go-best-combo").textContent = String(stats.bestCombo);
  $("go-all-clears").textContent = String(stats.allClears);
  $("go-score").textContent = String(state.score);
  $("go-best").textContent = String(best);
  $("go-mode").textContent = modeOf(state) === "hard" ? "Hard" : "Standard";
  $("go-record").classList.toggle("hidden", !(state.score > bestAtStart && state.score > 0));
  gameOverEl.classList.remove("hidden");
}

/** Macht `next` zur aktiven Runde (neu oder fortgesetzt) und lädt Highscore/Statistik ihres Modus. */
function activate(next: GameState, fresh: boolean): void {
  window.clearTimeout(gameOverTimer);
  state = next;
  const mode = modeOf(state);
  best = Math.max(store.loadBest(mode), state.score);
  stats = store.loadStats(mode);
  bestAtStart = fresh ? best : (store.loadRoundBest(mode) ?? best);
  store.saveRoundBest(mode, bestAtStart);
  recordCelebrated = bestAtStart > 0 && state.score > bestAtStart;
  deadFill = null;
  noSpaceEl.classList.add("hidden");
  shownScore = state.score;
  scoreEl.textContent = String(state.score);
  store.saveGame(state);
  settings = { ...settings, lastMode: mode };
  store.saveSettings(settings);
  gameOverEl.classList.add("hidden");
  settingsEl.classList.add("hidden");
  fxEl.replaceChildren();
  bestEl.textContent = String(best);
  renderModeBadge();
  renderBoard();
  renderComboMeter();
  renderTray(true);
}

function startNewGame(mode: GameMode = modeOf(state)): void {
  activate(newGame(randomSeed(), mode), true);
}

// ---------- Startbildschirm ----------

const startEl = $("start");

function showStart(): void {
  store.saveGame(state);
  for (const mode of ["standard", "hard"] as const) {
    $(`start-best-${mode}`).textContent = String(store.loadBest(mode));
    const saved = mode === modeOf(state) ? state : store.loadGame(mode);
    $(`start-cta-${mode}`).textContent = saved && !saved.gameOver && saved.score > 0 ? "Continue" : "Play";
  }
  settingsEl.classList.add("hidden");
  gameOverEl.classList.add("hidden");
  startEl.classList.remove("hidden");
}

/** Modus gewählt: laufende Runde dieses Modus fortsetzen, sonst neu starten. */
startEl.addEventListener("click", (e) => {
  const mode = (e.target as HTMLElement).closest<HTMLButtonElement>(".mode-card")?.dataset.mode as GameMode | undefined;
  if (!mode) return;
  sfx.unlockAudio();
  sfx.playPickup();
  const saved = mode === modeOf(state) ? state : store.loadGame(mode);
  if (saved && !saved.gameOver) activate(saved, false);
  else startNewGame(mode);
  startEl.classList.add("hidden");
});

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
  /** Spielfeld-Geometrie, einmal beim Aufnehmen gemessen (kein Layout-Lesen während des Ziehens). */
  originX: number;
  originY: number;
  pitch: number;
  /** Letzte Fingerposition; angewendet wird einmal pro Bild (requestAnimationFrame). */
  x: number;
  y: number;
  frame: number;
}

let drag: Drag | null = null;

/** Abstand der Stein-Unterkante über dem Finger, in Feldern (wie im Original). */
const LIFT_CELLS = 1.8;

/**
 * Nächste gültige Position für die linke obere Ecke des Steins. Sucht rund um die gerundete
 * Position (bis knapp eine Feldbreite entfernt) und bleibt bei der bisherigen Position, solange
 * der Finger nicht deutlich weiterzieht – so springt die Vorschau nicht hin und her.
 */
function findAnchor(d: Drag, left: number, top: number): { r: number; c: number } | null {
  const fc = (left - d.originX) / d.pitch;
  const fr = (top - d.originY) / d.pitch;
  const cur = d.anchor;
  if (cur && Math.abs(cur.r - fr) < 0.65 && Math.abs(cur.c - fc) < 0.65 && canPlace(state.board, d.piece, cur.r, cur.c)) return cur;
  let best: { r: number; c: number; d: number } | null = null;
  const r0 = Math.round(fr);
  const c0 = Math.round(fc);
  for (let r = r0 - 1; r <= r0 + 1; r++) {
    for (let c = c0 - 1; c <= c0 + 1; c++) {
      const dr = Math.abs(r - fr);
      const dc = Math.abs(c - fc);
      if (dr >= 0.95 || dc >= 0.95) continue;
      const dist = dr * dr + dc * dc;
      if ((!best || dist < best.d) && canPlace(state.board, d.piece, r, c)) best = { r, c, d: dist };
    }
  }
  return best && { r: best.r, c: best.c };
}

function applyDrag(): void {
  const d = drag;
  if (!d) return;
  d.frame = 0;
  const left = d.x - d.w / 2;
  const top = d.y - d.lift - d.h / 2;
  d.layer.style.transform = `translate3d(${left}px, ${top}px, 0)`;
  const anchor = findAnchor(d, left, top);
  const same = anchor && d.anchor && anchor.r === d.anchor.r && anchor.c === d.anchor.c;
  if (same || (!anchor && !d.anchor)) return;
  d.anchor = anchor;
  if (anchor) {
    const res = place(state.board, d.piece, anchor.r, anchor.c, d.color);
    renderBoard({ ghost: res.placedCells, color: d.color, clearRows: res.clearedRows, clearCols: res.clearedCols });
  } else {
    renderBoard();
  }
}

function moveDrag(x: number, y: number): void {
  if (!drag) return;
  drag.x = x;
  drag.y = y;
  if (!drag.frame) drag.frame = requestAnimationFrame(applyDrag);
}

function endDrag(): void {
  if (!drag) return;
  const d = drag;
  // letzte Fingerposition noch anwenden, damit genau dort abgelegt wird, wo die Vorschau war
  cancelAnimationFrame(d.frame);
  applyDrag();
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
  // Spielfeld frisch vermessen, damit der Stein exakt Feldgröße hat (auch für die Effekte beim Abräumen)
  measureCells();
  fx.invalidateGeometry(true);
  const layer = document.createElement("div");
  layer.className = "drag-layer";
  const el = pieceEl(piece, item.color, cellPx, gapPx);
  layer.appendChild(el);
  document.body.appendChild(layer);

  const w = piece.w * cellPx + (piece.w - 1) * gapPx;
  const h = piece.h * cellPx + (piece.h - 1) * gapPx;
  // Bei Touch springt der Stein über den Finger, damit der Daumen nichts verdeckt.
  const lift = e.pointerType === "mouse" ? 0 : h / 2 + cellPx * LIFT_CELLS;
  // Sprung startet in Tray-Größe am Finger (siehe @keyframes grab)
  el.style.setProperty("--lift", `${lift}px`);
  el.style.setProperty("--s0", String(trayCellPx / cellPx));
  const c0 = cells[0].getBoundingClientRect();
  const pitch = cells[1].getBoundingClientRect().left - c0.left;
  drag = {
    slot, piece, color: item.color, layer, pointerId: e.pointerId, lift, w, h, anchor: null,
    originX: c0.left, originY: c0.top, pitch, x: e.clientX, y: e.clientY, frame: 0,
  };
  slotEl.classList.add("lifted");
  applyDrag();
  const sr = slotEl.getBoundingClientRect();
  fx.motifBurst(sr.left + sr.width / 2, sr.top + sr.height / 2);
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

$("btn-restart").addEventListener("click", () => startNewGame());
$("btn-home").addEventListener("click", showStart);
$("btn-home-go").addEventListener("click", showStart);

$("btn-settings").addEventListener("click", () => {
  sfx.unlockAudio();
  soundOpt.checked = settings.sound;
  skinCycleOpt.checked = settings.skinCycle;
  renderSkins();
  newGameBtn.textContent = "New Game";
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
    newGameBtn.textContent = "Sure? Tap again";
    newGameBtn.classList.add("danger");
    return;
  }
  startNewGame();
});

// ---------- Modus ----------

function renderModeBadge(): void {
  const hard = modeOf(state) === "hard";
  const badge = $("mode-badge");
  badge.textContent = hard ? "Hard" : "Standard";
  badge.classList.toggle("hard", hard);
}

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
    alert("Sorry, this photo could not be loaded.");
  }
});

photoBtn.addEventListener("click", () => photoInput.click());

function applySkin(skin: string): void {
  settings = { ...settings, skin };
  store.saveSettings(settings);
  document.body.dataset.skin = skin;
  document.documentElement.dataset.skin = skin;
  renderSkins();
}

/** Nächstes Thema für „Alles weg!“ (Foto nur, wenn eins gewählt ist). */
function nextSkinId(): string {
  const ids = SKINS.map((s) => s.id).filter((id) => id !== "foto" || photo);
  return ids[(ids.indexOf(settings.skin) + 1) % ids.length];
}

/** Album-Karte: Themenhintergrund mit 3×3-Vorschau der Blöcke. */
function renderSkins(): void {
  skinsEl.replaceChildren(
    ...SKINS.map((s) => {
      const btn = document.createElement("button");
      btn.dataset.skin = s.id;
      btn.classList.toggle("active", s.id === settings.skin);
      const mini = document.createElement("div");
      mini.className = "mini";
      if (s.id === "foto" && photo) {
        mini.classList.add("photo-thumb");
      } else {
        for (const c of [1, 2, 3, 4, 5, 6, 7, 8, 1]) {
          const b = document.createElement("b");
          b.className = "block";
          b.dataset.c = String(c);
          mini.appendChild(b);
        }
      }
      btn.append(mini, s.name);
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
  settings = { ...settings, sound: soundOpt.checked, skinCycle: skinCycleOpt.checked };
  store.saveSettings(settings);
  sfx.setSoundEnabled(settings.sound);
  if (settings.sound) sfx.playPickup();
}
soundOpt.addEventListener("change", updateSettings);
skinCycleOpt.addEventListener("change", updateSettings);

// ---------- Start ----------

window.addEventListener("resize", layout);
// Nochmals messen, wenn Stylesheet und Schriften sicher geladen sind bzw. die Seite aus dem Cache zurückkommt
window.addEventListener("load", layout);
window.addEventListener("pageshow", layout);
document.fonts?.ready.then(layout);
document.addEventListener("contextmenu", (e) => e.preventDefault());

fx.initEffects(fxEl, $("fx-global"), cells);
layout();
renderBoard();
renderTray(true);
renderModeBadge();
setBest();
renderComboMeter();
scoreEl.textContent = String(state.score);
// Wie im Original: beim Öffnen zuerst den Modus wählen.
showStart();

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
