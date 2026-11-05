# ⭐ Star Blaster — Roguelite Edition

A rewrite of my original [Star Blaster](https://github.com/AlisonDelvechio/star-blaster-game) (a vanilla JS shoot'em up made while studying) as a **vertical roguelite shooter**, built with **Phaser 3 + TypeScript + Vite** and all-new **pixel art**.

## 🎮 Gameplay
- Fight through **sectors** of 4 waves, each ending with a **Guardian boss** that cycles bullet patterns and gets angrier at half HP.
- After every wave, **choose 1 of 3 upgrades** (common / rare / epic): multishot, piercing rounds, shields, homing missiles, wingman drones, crits, and more. Every run builds differently.
- Enemies drop **credits**. Spend them in the **Hangar** on permanent upgrades, or unlock new ships.
- **4 ships**, each with its own playstyle: Falcon (balanced), Viper (fast and crit-heavy), Bulwark (tanky with a shield), Nova (spread shot).
- Elite enemies (gold) are tougher but drop more loot.

## 🕹️ Controls
| Action | Keys |
| --- | --- |
| Move | Arrows / WASD / drag (touch or mouse) |
| Fire | Automatic (toggle with **F**) or hold **Space** |
| Pick upgrade | **1 / 2 / 3**, arrows + Enter, or click |
| Reroll upgrades | **R** (unlocked in the Hangar) |
| Pause | **Esc** / **P** |

## 🛠️ Tech
- [Phaser 3](https://phaser.io/) (Arcade Physics, scenes, particles)
- TypeScript
- Vite

All sprites are drawn as pixel grids in [`src/art/sprites.ts`](src/art/sprites.ts) and turned into textures at startup, so no image files are needed.

## 🚀 Running locally
```bash
npm install
npm run dev
```
Build for production with `npm run build` (output in `dist/`). The `netlify.toml` is already set up for Netlify deploys.

## 📁 Structure
```
src/
  art/       pixel art definitions + texture generation
  data/      ships, upgrades, hangar upgrades, waves, stats
  objects/   Enemy and Boss behaviour
  scenes/    Boot, Menu, ShipSelect, Hangar, Game, Upgrade, Pause, GameOver
  systems/   save (localStorage) and sound helpers
  ui/        text, buttons, starfield
```

## ✔️ Credits
The original version was based on a tutorial from [Manual do Dev](https://www.youtube.com/@ManualdoDev) ([playlist](https://www.youtube.com/playlist?list=PLdtmpu_1ITQLMiPRtuAZEN8BpRvMiFa_r)). Sound effects come from that original project.
