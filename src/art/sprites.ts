/**
 * Pixel art for Star Blaster, drawn as character grids.
 *
 * Each character maps to a palette color ('.' is transparent). Sprites marked
 * `mirror` only store the left half: every row is reflected to build the right
 * half, which keeps ships perfectly symmetric.
 */

export const PALETTE: Record<string, string> = {
  k: "#0d0b1a", // outline
  w: "#f4f4f8", // white
  g: "#9aa3c0", // light gray
  G: "#555c7c", // dark gray
  c: "#a6f6ff", // cyan highlight
  b: "#3ec5ff", // blue
  B: "#2167d6", // dark blue
  r: "#ff5266", // red
  R: "#a8203a", // dark red
  o: "#ff9f3a", // orange
  O: "#c25a12", // dark orange
  y: "#ffe066", // yellow
  p: "#c77dff", // purple
  P: "#6b2fb3", // dark purple
  m: "#ff7ad9", // pink
  l: "#8cff7a", // lime
  L: "#2b9e4a", // green
  t: "#1f6b3a", // dark green
};

export interface SpriteDef {
  rows: string[];
  mirror?: boolean;
  /** Size of each art pixel in game pixels. */
  scale?: number;
}

export const SPRITES: Record<string, SpriteDef> = {
  // ───────────── Player ships (16×16) ─────────────
  "ship-falcon": {
    mirror: true,
    rows: [
      ".......k",
      "......kw",
      "......kb",
      ".....kbB",
      ".....kcw",
      ".....kcc",
      ".....kBb",
      "..k..kBb",
      ".kbk.kBb",
      ".kbkkBBb",
      "kbBkgBBb",
      "kBBggGBb",
      "kBkkGGgg",
      "kk..kGGk",
      "....kook",
      ".....kk.",
    ],
  },
  "ship-viper": {
    mirror: true,
    rows: [
      ".......k",
      "......kr",
      "......kr",
      "......kw",
      ".....kRc",
      ".....kRc",
      ".k...kRr",
      ".rk..kRr",
      ".krk.kRr",
      ".kRrkRrr",
      "kRRrrRrg",
      "kRkRRrgg",
      "kk.kRRgk",
      "k...kRk.",
      "....kok.",
      ".....k..",
    ],
  },
  "ship-bulwark": {
    mirror: true,
    rows: [
      "......kk",
      ".....kLl",
      ".....kLw",
      "....kLlc",
      ".kk.kLcc",
      "kgGkkLLl",
      "kgGkLLLl",
      "kgGLLgLl",
      "kgGLgglL",
      "kgGLgGGL",
      "kGGLLLLL",
      "kGGtLLLt",
      "kGktttkk",
      "kk.kook.",
      "....kk..",
      "........",
    ],
  },
  "ship-nova": {
    mirror: true,
    rows: [
      ".......k",
      "..k...kp",
      ".kmk..kp",
      ".kpk.kpw",
      ".kpk.kmc",
      ".kPk.kmc",
      ".kPkkPpp",
      "kPPpkPpp",
      "kPppPPpp",
      "kPpPPPpm",
      "kPPPkkPP",
      ".kPk.kPP",
      "..k..kPk",
      ".....kok",
      "......kk",
      "........",
    ],
  },

  // ───────────── Enemies ─────────────
  drone: {
    mirror: true,
    rows: [
      "..k...",
      "...k..",
      "..kkkk",
      ".krrrr",
      "krrkyr",
      "krrrrr",
      "kRrrRR",
      ".kRRkk",
      ".kRk..",
      "kRk...",
      "kk....",
    ],
  },
  zigzag: {
    mirror: true,
    rows: [
      "k......",
      "kpk....",
      "kppk...",
      ".kppk.k",
      ".kpPkkp",
      "..kPPpp",
      "..kPpyk",
      ".kPPppp",
      "kPkkPPp",
      "kk..kPk",
      ".....k.",
    ],
  },
  gunner: {
    mirror: true,
    rows: [
      ".kk...",
      "kook..",
      "kOok.k",
      "kOokko",
      ".kOooo",
      ".kooyk",
      "kOoooo",
      "kOOOOo",
      ".kkOkk",
      "..kgk.",
      "..kGk.",
      "...k..",
    ],
  },
  diver: {
    mirror: true,
    rows: [
      "kk....",
      "klk...",
      "kllk..",
      ".kLlkk",
      ".kLLll",
      "..kLLy",
      "..kLLk",
      "...kLL",
      "...ktL",
      "....kt",
      ".....k",
    ],
  },
  tank: {
    mirror: true,
    rows: [
      "..kkkkkk",
      ".kgggggg",
      "kgGGGGGG",
      "kgGkkGGG",
      "kgGkrGGg",
      "kgGGGGgw",
      "kGGgggGg",
      "kGkGGGGG",
      "kGkkkGkk",
      ".k..kgk.",
      "....kGk.",
      ".....k..",
    ],
  },
  boss: {
    mirror: true,
    rows: [
      "..............kkkkkk",
      "............kkGGGGGG",
      "..........kkGgggggGG",
      "........kkGGgkkkkkgG",
      ".......kGGgkkrrrrrkg",
      "......kGgggkrrRRRRrk",
      ".....kGgGGgkrRyyyyRr",
      "....kGgGkkGkrRywwyRr",
      "...kGgGkppkGkrRyyRRr",
      "..kGgGkpmpkGGkrRRrrk",
      "..kGGkkpppkGgGkkkkkG",
      ".kGgkk.kkkGgggGGGGGg",
      ".kGk....kGgGGGGgggGG",
      "kGGk...kGgGkkkkGGGkk",
      "kGk...kGgGk..kGGk...",
      "kGk..kGgGk...kGk....",
      "kk...kGGk...kGGk....",
      ".....kGk....kok.....",
      "......k.....kok.....",
      ".............k......",
    ],
  },

  // ───────────── Projectiles & pickups ─────────────
  "bullet-player": {
    rows: ["kk", "cc", "bb", "bb", "BB"],
  },
  "bullet-crit": {
    rows: ["kk", "ww", "yy", "yy", "oo"],
  },
  missile: {
    rows: [".k.", "kwk", "kgk", "kgk", "krk", ".o."],
  },
  "bullet-enemy": {
    rows: [".kk.", "kmmk", "kmwk", ".kk."],
  },
  "bullet-boss": {
    rows: [".kkk.", "krrrk", "krwrk", "krrrk", ".kkk."],
  },
  credit: {
    rows: [".kkk.", "kyyok", "kywok", "kyyok", ".kkk."],
  },
  heal: {
    rows: [".kkk.", ".klk.", "kklkk", "klllk", "kklkk", ".klk.", ".kkk."],
  },
  heart: {
    mirror: true,
    rows: [".kk.", "krrk", "krwr", "krrr", ".krr", "..kr", "...k"],
  },
  "heart-empty": {
    mirror: true,
    rows: [".kk.", "kGGk", "kGGG", "kGGG", ".kGG", "..kG", "...k"],
  },
  shield: {
    mirror: true,
    rows: [".kkk", "kccc", "kcbb", "kcbb", ".kcb", "..kc", "...k"],
  },
  flame: {
    rows: ["yy", "oo", "o.", ".r"],
  },
  "support-drone": {
    mirror: true,
    rows: [".kk", "kgc", "kGw", ".kG", "..k"],
  },
};

export const SHIP_KEYS = ["ship-falcon", "ship-viper", "ship-bulwark", "ship-nova"] as const;
