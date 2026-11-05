export interface SaveData {
  credits: number;
  highScore: number;
  bestSector: number;
  unlocked: string[];
  meta: Record<string, number>;
  selectedShip: string;
  runs: number;
}

const KEY = "star-blaster-v2-save";

const defaults = (): SaveData => ({
  credits: 0,
  highScore: 0,
  bestSector: 0,
  unlocked: ["falcon"],
  meta: {},
  selectedShip: "falcon",
  runs: 0,
});

let cache: SaveData | null = null;

/** Loads the save from localStorage, falling back to defaults when unavailable. */
export function loadSave(): SaveData {
  if (cache) return cache;
  let data = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) data = { ...data, ...JSON.parse(raw) };
  } catch {
    // Storage blocked or corrupted: play with a fresh save.
  }
  cache = data;
  return data;
}

export function writeSave(): void {
  if (!cache) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Ignore: progress just won't persist in this browser.
  }
}

export function metaLevel(id: string): number {
  return loadSave().meta[id] ?? 0;
}
