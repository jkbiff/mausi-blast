/**
 * Alle Themen (Blockdesign + Hintergrund + Partikel-Motiv). Aussehen: src/skins.css,
 * erzeugt von scripts/gen-skins.py. Reihenfolge = Wechsel-Reihenfolge bei „Alles weg!“.
 */
export interface SkinInfo {
  id: string;
  name: string;
}

export const SKINS: readonly SkinInfo[] = [
  { id: "klassik", name: "Classic" },
  { id: "jade", name: "Jade" },
  { id: "strick", name: "Knit" },
  { id: "keramik", name: "Ceramic" },
  { id: "herzkekse", name: "Heart Cookies" },
  { id: "juwelen", name: "Jewels" },
  { id: "gold", name: "Gold" },
  { id: "bunt", name: "Vivid" },
  { id: "melone", name: "Melon" },
  { id: "ziegel", name: "Brick" },
  { id: "pluesch", name: "Plush" },
  { id: "leder", name: "Leather" },
  { id: "kacheln", name: "Tiles" },
  { id: "eiscreme", name: "Ice Cream" },
  { id: "gelee", name: "Jelly" },
  { id: "roboter", name: "Robot" },
  { id: "kaese", name: "Cheese" },
  { id: "marmor", name: "Marble" },
  { id: "opal", name: "Opal" },
  { id: "matt", name: "Matte" },
  { id: "holz", name: "Wood" },
  { id: "papier", name: "Paper" },
  { id: "kekse", name: "Crackers" },
  { id: "ton", name: "Clay" },
  { id: "spiegelei", name: "Fried Egg" },
  { id: "karo", name: "Gingham" },
  { id: "foto", name: "Photo" },
];

export const SKIN_IDS: readonly string[] = SKINS.map((s) => s.id);

export const DEFAULT_SKIN = "klassik";

export const skinName = (id: string): string => SKINS.find((s) => s.id === id)?.name ?? id;
