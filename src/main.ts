import Phaser from "phaser";
import { COLORS, GAME_H, GAME_W } from "./config";
import { BootScene } from "./scenes/BootScene";
import { GameOverScene } from "./scenes/GameOverScene";
import { GameScene } from "./scenes/GameScene";
import { HangarScene } from "./scenes/HangarScene";
import { MenuScene } from "./scenes/MenuScene";
import { PauseScene } from "./scenes/PauseScene";
import { ShipSelectScene } from "./scenes/ShipSelectScene";
import { UpgradeScene } from "./scenes/UpgradeScene";

async function waitForFont(): Promise<void> {
  try {
    await Promise.race([
      document.fonts.load('16px "Press Start 2P"'),
      new Promise((r) => setTimeout(r, 2000)),
    ]);
  } catch {
    // Fall back to monospace.
  }
}

waitForFont().then(() => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: GAME_W,
    height: GAME_H,
    backgroundColor: COLORS.bg,
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: "arcade", arcade: { debug: false } },
    scene: [BootScene, MenuScene, ShipSelectScene, HangarScene, GameScene, UpgradeScene, PauseScene, GameOverScene],
  });
  // Handy for debugging from the browser console during development.
  if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
});
