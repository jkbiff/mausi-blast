/**
 * Alle Themen (Blockdesign + Hintergrund + Partikel-Motiv). Aussehen: src/skins.css,
 * erzeugt von scripts/gen-skins.py. Reihenfolge = Wechsel-Reihenfolge bei „Alles weg!“.
 */
export interface SkinInfo {
  id: string;
  name: string;
}

export const SKINS: readonly SkinInfo[] = [
  { id: "klassik", name: "Klassik" },
  { id: "jade", name: "Jade" },
  { id: "strick", name: "Strick" },
  { id: "keramik", name: "Keramik" },
  { id: "herzkekse", name: "Herzkekse" },
  { id: "juwelen", name: "Juwelen" },
  { id: "gold", name: "Gold" },
  { id: "bunt", name: "Bunt" },
  { id: "melone", name: "Melone" },
  { id: "ziegel", name: "Ziegel" },
  { id: "pluesch", name: "Plüsch" },
  { id: "leder", name: "Leder" },
  { id: "kacheln", name: "Kacheln" },
  { id: "eiscreme", name: "Eiscreme" },
  { id: "gelee", name: "Gelee" },
  { id: "roboter", name: "Roboter" },
  { id: "kaese", name: "Käse" },
  { id: "marmor", name: "Marmor" },
  { id: "opal", name: "Opal" },
  { id: "matt", name: "Matt" },
  { id: "holz", name: "Holz" },
  { id: "papier", name: "Papier" },
  { id: "kekse", name: "Kekse" },
  { id: "ton", name: "Ton" },
  { id: "spiegelei", name: "Spiegelei" },
  { id: "karo", name: "Karo" },
  { id: "foto", name: "Foto" },
];

export const SKIN_IDS: readonly string[] = SKINS.map((s) => s.id);

export const DEFAULT_SKIN = "klassik";

export const skinName = (id: string): string => SKINS.find((s) => s.id === id)?.name ?? id;
