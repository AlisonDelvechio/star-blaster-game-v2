export const GAME_W = 360;
export const GAME_H = 640;

export const FONT = '"Press Start 2P", monospace';

export const COLORS = {
  bg: 0x07060f,
  text: "#f4f4f8",
  dim: "#9aa3c0",
  muted: "#555c7c",
  accent: "#3ec5ff",
  gold: "#ffe066",
  danger: "#ff5266",
  good: "#8cff7a",
  purple: "#c77dff",
};

export const RARITY_COLORS = {
  common: { text: "#f4f4f8", border: 0x9aa3c0 },
  rare: { text: "#3ec5ff", border: 0x3ec5ff },
  epic: { text: "#c77dff", border: 0xc77dff },
} as const;
