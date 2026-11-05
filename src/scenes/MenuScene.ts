import Phaser from "phaser";
import { COLORS, GAME_H, GAME_W } from "../config";
import { SHIPS } from "../data/ships";
import { loadSave } from "../systems/save";
import { ButtonList, Starfield, txt } from "../ui/ui";

export class MenuScene extends Phaser.Scene {
  private stars!: Starfield;
  private ships: Phaser.GameObjects.Image[] = [];

  constructor() {
    super("Menu");
  }

  create(): void {
    const save = loadSave();
    this.stars = new Starfield(this);

    // Fleet flying in formation behind the title.
    this.ships = SHIPS.map((s, i) =>
      this.add.image(70 + i * 73, 300, s.texture).setAlpha(0.9),
    );

    const title = txt(this, GAME_W / 2, 120, "STAR\nBLASTER", 32, COLORS.accent);
    title.setStroke("#0d0b1a", 8).setShadow(4, 4, "#2167d6", 0, true, true);
    this.tweens.add({ targets: title, y: 126, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    txt(this, GAME_W / 2, 200, "ROGUELITE EDITION", 8, COLORS.gold);

    new ButtonList(this, GAME_W / 2, 380, [
      { label: "PLAY", onSelect: () => this.scene.start("ShipSelect") },
      { label: "HANGAR", onSelect: () => this.scene.start("Hangar") },
    ]);

    txt(this, GAME_W / 2, 470, `HIGH SCORE  ${save.highScore}`, 8, COLORS.text);
    txt(this, GAME_W / 2, 488, `BEST SECTOR ${save.bestSector}`, 8, COLORS.dim);
    txt(this, GAME_W / 2, 506, `CREDITS     ${save.credits}`, 8, COLORS.gold);

    txt(
      this,
      GAME_W / 2,
      560,
      "MOVE  ARROWS / WASD / DRAG\nFIRE  AUTO  (F TOGGLES, SPACE)\nPAUSE ESC",
      6,
      COLORS.muted,
    );
    const credit = txt(this, GAME_W / 2, GAME_H - 16, "ALISON DELVECHIO VERSION", 6, COLORS.dim).setInteractive({
      useHandCursor: true,
    });
    credit.on("pointerdown", () => window.open("https://github.com/AlisonDelvechio", "_blank"));

    this.cameras.main.fadeIn(300);
  }

  update(time: number, delta: number): void {
    this.stars.update(delta);
    this.ships.forEach((s, i) => (s.y = 300 + Math.sin(time / 500 + i) * 6));
  }
}
