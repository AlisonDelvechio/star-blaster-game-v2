import Phaser from "phaser";
import { PALETTE, SPRITES, type SpriteDef } from "./sprites";

/** Default size (in game pixels) of one art pixel. */
export const ART_SCALE = 2;

/** Expands a mirrored sprite into its full rows. */
export function expandRows(def: SpriteDef): string[] {
  if (!def.mirror) return def.rows;
  return def.rows.map((row) => row + row.split("").reverse().join(""));
}

/** Paints a sprite onto a 2D canvas context. */
export function paintSprite(
  ctx: CanvasRenderingContext2D,
  def: SpriteDef,
  scale: number,
  ox = 0,
  oy = 0,
  colorOverride?: string,
): void {
  const rows = expandRows(def);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === "." || ch === " ") continue;
      const color = colorOverride ?? PALETTE[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    }
  });
}

export function spriteSize(def: SpriteDef, scale: number): { w: number; h: number } {
  const rows = expandRows(def);
  const w = Math.max(...rows.map((r) => r.length));
  return { w: w * scale, h: rows.length * scale };
}

/** Registers every pixel-art sprite as a Phaser texture. */
export function generateTextures(scene: Phaser.Scene): void {
  for (const [key, def] of Object.entries(SPRITES)) {
    const scale = def.scale ?? ART_SCALE;
    const { w, h } = spriteSize(def, scale);
    const tex = scene.textures.createCanvas(key, w, h);
    if (!tex) continue;
    paintSprite(tex.getContext(), def, scale);
    tex.refresh();
  }

  // Square particle used for explosions and sparks.
  const px = scene.textures.createCanvas("px", 2, 2);
  if (px) {
    const ctx = px.getContext();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 2, 2);
    px.refresh();
  }

  makeStarLayer(scene, "stars-far", 360, 640, 90, ["#3a3f66", "#555c7c"], 1);
  makeStarLayer(scene, "stars-mid", 360, 640, 45, ["#9aa3c0", "#6e77a3"], 2);
  makeStarLayer(scene, "stars-near", 360, 640, 14, ["#f4f4f8", "#a6f6ff", "#ffe066"], 2);
}

function makeStarLayer(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  count: number,
  colors: string[],
  size: number,
): void {
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  const ctx = tex.getContext();
  const rng = new Phaser.Math.RandomDataGenerator([key]);
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = rng.pick(colors);
    const x = rng.between(0, w - size);
    const y = rng.between(0, h - size);
    ctx.fillRect(x, y, size, size);
    // A few stars get a tiny cross sparkle.
    if (size > 1 && rng.frac() < 0.15) {
      ctx.fillRect(x - size, y, size, size);
      ctx.fillRect(x + size, y, size, size);
      ctx.fillRect(x, y - size, size, size);
      ctx.fillRect(x, y + size, size, size);
    }
  }
  tex.refresh();
}
