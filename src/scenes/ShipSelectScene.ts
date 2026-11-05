import Phaser from "phaser";
import { COLORS, GAME_W } from "../config";
import { SHIPS, startingStats } from "../data/ships";
import { loadSave, writeSave } from "../systems/save";
import { Starfield, txt } from "../ui/ui";

export class ShipSelectScene extends Phaser.Scene {
  private stars!: Starfield;
  private index = 0;
  private preview!: Phaser.GameObjects.Image;
  private name!: Phaser.GameObjects.Text;
  private tagline!: Phaser.GameObjects.Text;
  private statsGfx!: Phaser.GameObjects.Graphics;
  private special!: Phaser.GameObjects.Text;
  private action!: Phaser.GameObjects.Text;
  private creditsText!: Phaser.GameObjects.Text;
  private thumbs: Phaser.GameObjects.Image[] = [];
  private frame!: Phaser.GameObjects.Rectangle;

  constructor() {
    super("ShipSelect");
  }

  create(): void {
    const save = loadSave();
    this.stars = new Starfield(this);
    this.index = Math.max(0, SHIPS.findIndex((s) => s.id === save.selectedShip));

    txt(this, GAME_W / 2, 50, "SELECT YOUR SHIP", 12, COLORS.accent);
    this.creditsText = txt(this, GAME_W / 2, 74, "", 8, COLORS.gold);

    this.add.rectangle(GAME_W / 2, 190, 140, 140, 0x14122a).setStrokeStyle(2, 0x555c7c);
    this.preview = this.add.image(GAME_W / 2, 190, SHIPS[0].texture).setScale(3);
    this.tweens.add({ targets: this.preview, y: 182, yoyo: true, repeat: -1, duration: 900, ease: "Sine.easeInOut" });

    const left = txt(this, 40, 190, "<", 16, COLORS.text).setInteractive({ useHandCursor: true });
    const right = txt(this, GAME_W - 40, 190, ">", 16, COLORS.text).setInteractive({ useHandCursor: true });
    left.on("pointerdown", () => this.move(-1));
    right.on("pointerdown", () => this.move(1));

    this.name = txt(this, GAME_W / 2, 286, "", 14, COLORS.text);
    this.tagline = txt(this, GAME_W / 2, 310, "", 6, COLORS.dim);
    ["HULL", "SPEED", "DAMAGE", "SPECIAL"].forEach((label, i) => txt(this, 60, 350 + i * 22, label, 8, COLORS.dim, 0));
    this.statsGfx = this.add.graphics();
    this.special = txt(this, 160, 350 + 3 * 22, "", 8, COLORS.gold, 0);

    this.frame = this.add.rectangle(0, 470, 50, 50).setStrokeStyle(2, 0x3ec5ff);
    this.thumbs = SHIPS.map((s, i) => {
      const img = this.add.image(GAME_W / 2 + (i - 1.5) * 64, 470, s.texture).setInteractive({ useHandCursor: true });
      img.on("pointerdown", () => {
        if (this.index === i) this.confirm();
        else this.show(i);
      });
      return img;
    });

    this.action = txt(this, GAME_W / 2, 540, "", 10, COLORS.good).setInteractive({ useHandCursor: true });
    this.action.on("pointerdown", () => this.confirm());
    const back = txt(this, GAME_W / 2, 590, "< BACK [ESC]", 8, COLORS.dim).setInteractive({ useHandCursor: true });
    back.on("pointerdown", () => this.scene.start("Menu"));

    const kb = this.input.keyboard!;
    kb.on("keydown-LEFT", () => this.move(-1));
    kb.on("keydown-A", () => this.move(-1));
    kb.on("keydown-RIGHT", () => this.move(1));
    kb.on("keydown-D", () => this.move(1));
    kb.on("keydown-ENTER", () => this.confirm());
    kb.on("keydown-SPACE", () => this.confirm());
    kb.on("keydown-ESC", () => this.scene.start("Menu"));

    this.show(this.index);
  }

  private move(d: number): void {
    this.show(Phaser.Math.Wrap(this.index + d, 0, SHIPS.length));
  }

  private show(i: number): void {
    const save = loadSave();
    this.index = i;
    const ship = SHIPS[i];
    const owned = save.unlocked.includes(ship.id);
    this.preview.setTexture(ship.texture).setTint(owned ? 0xffffff : 0x333344);
    this.name.setText(ship.name);
    this.tagline.setText(ship.tagline.toUpperCase());

    const s = startingStats(ship);
    const values = [s.maxHp / 7, s.speed / 300, (s.damage * s.fireRate * s.shots) / 160];
    this.statsGfx.clear();
    values.forEach((v, row) => {
      const filled = Phaser.Math.Clamp(Math.round(v * 10), 1, 10);
      for (let k = 0; k < 10; k++) {
        this.statsGfx.fillStyle(k < filled ? 0x3ec5ff : 0x2a2f4a);
        this.statsGfx.fillRect(160 + k * 14, 345 + row * 22, 10, 10);
      }
    });
    this.special.setText(s.shieldMax ? "SHIELD" : s.shots > 1 ? "SPREAD" : s.critChance > 0.1 ? "CRITS" : "-");

    this.thumbs.forEach((t, j) => t.setTint(save.unlocked.includes(SHIPS[j].id) ? 0xffffff : 0x333344));
    this.frame.setX(this.thumbs[i].x);
    this.creditsText.setText(`CREDITS ${save.credits}`);

    if (owned) {
      this.action.setText("> LAUNCH <").setColor(COLORS.good);
    } else if (save.credits >= ship.cost) {
      this.action.setText(`BUY ${ship.cost} CR`).setColor(COLORS.gold);
    } else {
      this.action.setText(`LOCKED ${ship.cost} CR`).setColor(COLORS.muted);
    }
  }

  private confirm(): void {
    const save = loadSave();
    const ship = SHIPS[this.index];
    if (save.unlocked.includes(ship.id)) {
      save.selectedShip = ship.id;
      writeSave();
      this.sound.play("next_level", { volume: 0.3 });
      this.scene.start("Game");
    } else if (save.credits >= ship.cost) {
      save.credits -= ship.cost;
      save.unlocked.push(ship.id);
      writeSave();
      this.sound.play("next_level", { volume: 0.3 });
      this.show(this.index);
    } else {
      this.cameras.main.shake(120, 0.005);
    }
  }

  update(_t: number, delta: number): void {
    this.stars.update(delta);
  }
}
