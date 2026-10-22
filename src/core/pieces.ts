/** Steinkatalog: 42 Formen mit fester Orientierung. "X" = belegt, "." = leer. */
export const PIECE_SHAPES: Record<string, string[]> = {
  // Einzel
  "1x1": ["X"],
  // Balken horizontal
  "1x2": ["XX"], "1x3": ["XXX"], "1x4": ["XXXX"], "1x5": ["XXXXX"],
  // Balken vertikal
  "2x1": ["X", "X"], "3x1": ["X", "X", "X"], "4x1": ["X", "X", "X", "X"], "5x1": ["X", "X", "X", "X", "X"],
  // Quadrate & Rechtecke
  "2x2": ["XX", "XX"], "3x3": ["XXX", "XXX", "XXX"],
  "2x3": ["XXX", "XXX"], "3x2": ["XX", "XX", "XX"],
  // Kleine Ecken (3 Zellen)
  "L2_a": ["XX", "X."], "L2_b": ["XX", ".X"], "L2_c": ["X.", "XX"], "L2_d": [".X", "XX"],
  // L / J (4 Zellen)
  "L3_a": ["XXX", "X.."], "L3_b": ["XXX", "..X"], "L3_c": ["X..", "XXX"], "L3_d": ["..X", "XXX"],
  "L3_e": ["X.", "X.", "XX"], "L3_f": [".X", ".X", "XX"], "L3_g": ["XX", "X.", "X."], "L3_h": ["XX", ".X", ".X"],
  // Große Ecken (5 Zellen)
  "L5_a": ["XXX", "X..", "X.."], "L5_b": ["XXX", "..X", "..X"], "L5_c": ["X..", "X..", "XXX"], "L5_d": ["..X", "..X", "XXX"],
  // S / Z
  "S_h": [".XX", "XX."], "Z_h": ["XX.", ".XX"], "S_v": ["X.", "XX", ".X"], "Z_v": [".X", "XX", "X."],
  // T
  "T_up": [".X.", "XXX"], "T_down": ["XXX", ".X."], "T_left": ["X.", "XX", "X."], "T_right": [".X", "XX", ".X"],
  // Plus
  "PLUS": [".X.", "XXX", ".X."],
  // Diagonalen (nur Ecken berühren sich)
  "D2_a": ["X.", ".X"], "D2_b": [".X", "X."],
  "D3_a": ["X..", ".X.", "..X"], "D3_b": ["..X", ".X.", "X.."],
};

export interface Piece {
  id: string;
  /** Belegte Zellen als [zeile, spalte] relativ zur linken oberen Ecke. */
  cells: ReadonlyArray<readonly [number, number]>;
  w: number;
  h: number;
  size: number;
}

function parsePiece(id: string, rows: string[]): Piece {
  const cells: [number, number][] = [];
  rows.forEach((line, r) => {
    for (let c = 0; c < line.length; c++) if (line[c] === "X") cells.push([r, c]);
  });
  return { id, cells, w: Math.max(...rows.map((l) => l.length)), h: rows.length, size: cells.length };
}

export const PIECES: readonly Piece[] = Object.entries(PIECE_SHAPES).map(([id, rows]) => parsePiece(id, rows));

export const PIECE_BY_ID: Readonly<Record<string, Piece>> = Object.fromEntries(PIECES.map((p) => [p.id, p]));

export function getPiece(id: string): Piece {
  const p = PIECE_BY_ID[id];
  if (!p) throw new Error(`Unbekannter Stein: ${id}`);
  return p;
}

/** Gerader Balken der Länge len (1–5), horizontal oder vertikal. */
export function barPiece(len: number, horizontal: boolean): Piece {
  if (len === 1) return getPiece("1x1");
  return getPiece(horizontal ? `1x${len}` : `${len}x1`);
}
