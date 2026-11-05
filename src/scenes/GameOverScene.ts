import Phaser from "phaser";
import { COLORS, GAME_W } from "../config";
import { getShip } from "../data/ships";
import { loadSave } from "../systems/save";
import { ButtonList, Starfield, txt } from "../ui/ui";
import type { RunResult } from "./GameScene";

export class GameOverScene extends Phaser.Scene {
  private stars!: Starfield;

  constructor() {
    super("GameOver");
  }

  create(r: RunResult): void {
    this.stars = new Starfield(this);
    txt(this, GAME_W / 2, 100, "GAME OVER", 20, COLORS.danger).setStroke("#0d0b1a", 6);
    this.add.image(GAME_W / 2, 170, getShip(r.shipId).texture).setScale(2).setTint(0x555c7c);

    const lines: [string, string, string][] = [
      ["SCORE", `${r.score}`, COLORS.text],
      ["REACHED", `SECTOR ${r.sector}-${r.wave}`, COLORS.text],
      ["KILLS", `${r.kills}`, COLORS.text],
      ["CREDITS", `+${r.credits}`, COLORS.gold],
      ["BANK", `${loadSave().credits}`, COLORS.gold],
    ];
    lines.forEach(([k, v, c], i) => {
      txt(this, 60, 240 + i * 24, k, 8, COLORS.dim, 0);
      txt(this, GAME_W - 60, 240 + i * 24, v, 8, c, 1);
    });
    if (r.newHigh) {
      const hi = txt(this, GAME_W / 2, 375, "NEW HIGH SCORE!", 10, COLORS.gold);
      this.tweens.add({ targets: hi, alpha: 0.3, yoyo: true, repeat: -1, duration: 400 });
    }

    new ButtonList(this, GAME_W / 2, 430, [
      { label: "PLAY AGAIN", onSelect: () => this.scene.start("Game") },
      { label: "CHANGE SHIP", onSelect: () => this.scene.start("ShipSelect") },
      { label: "HANGAR", onSelect: () => this.scene.start("Hangar") },
      { label: "MENU", onSelect: () => this.scene.start("Menu") },
    ]);
    this.cameras.main.fadeIn(400);
  }

  update(_t: number, delta: number): void {
    this.stars.update(delta);
  }
}
