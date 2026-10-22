/** Alle Blockdesigns. Reihenfolge = Wechsel-Reihenfolge bei „Alles weg!“. */
export interface SkinInfo {
  id: string;
  name: string;
  /** Farbindex für die Vorschau im Menü. */
  preview: number;
}

export const SKINS: readonly SkinInfo[] = [
  { id: "glanz", name: "Glanz", preview: 1 },
  { id: "mausi", name: "Mausi", preview: 2 },
  { id: "neon", name: "Neon", preview: 4 },
  { id: "holz", name: "Holz", preview: 7 },
  { id: "edelstein", name: "Edelstein", preview: 3 },
  { id: "herzen", name: "Herzen", preview: 1 },
  { id: "eis", name: "Eis", preview: 3 },
  { id: "lava", name: "Lava", preview: 7 },
  { id: "bonbon", name: "Bonbon", preview: 8 },
  { id: "gold", name: "Gold", preview: 6 },
  { id: "galaxie", name: "Galaxie", preview: 2 },
  { id: "marmor", name: "Marmor", preview: 2 },
  { id: "kaese", name: "Käse", preview: 6 },
  { id: "metall", name: "Metall", preview: 3 },
  { id: "pfoten", name: "Pfoten", preview: 7 },
  { id: "glas", name: "Glas", preview: 4 },
  { id: "stein", name: "Stein", preview: 5 },
  { id: "sterne", name: "Sterne", preview: 2 },
  { id: "pixel", name: "Pixel", preview: 5 },
  { id: "blasen", name: "Blasen", preview: 3 },
  { id: "ziegel", name: "Ziegel", preview: 8 },
  { id: "pastell", name: "Pastell", preview: 5 },
  { id: "foto", name: "Foto", preview: 1 },
];

export const SKIN_IDS: readonly string[] = SKINS.map((s) => s.id);

export const DEFAULT_SKIN = "glanz";
