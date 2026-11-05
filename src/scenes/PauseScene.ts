import Phaser from "phaser";
import { COLORS, GAME_H, GAME_W } from "../config";
import { ButtonList, txt } from "../ui/ui";
import type { GameScene } from "./GameScene";

export class PauseScene extends Phaser.Scene {
  constructor() {
    super("Pause");
  }

  create(): void {
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x07060f, 0.75).setOrigin(0);
    txt(this, GAME_W / 2, 220, "PAUSED", 16, COLORS.accent);
    const resume = () => {
      this.scene.stop();
      this.scene.resume("Game");
    };
    new ButtonList(this, GAME_W / 2, 300, [
      { label: "RESUME", onSelect: resume },
      { label: "QUIT RUN", onSelect: () => (this.scene.get("Game") as GameScene).endRun() },
    ]);
    txt(this, GAME_W / 2, 400, "QUITTING KEEPS THE CREDITS\nYOU COLLECTED", 6, COLORS.dim);
    this.input.keyboard!.on("keydown-ESC", resume);
    this.input.keyboard!.on("keydown-P", resume);
  }
}
