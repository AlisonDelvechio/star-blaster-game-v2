import Phaser from "phaser";
import { COLORS, FONT, GAME_H, GAME_W } from "../config";

export function txt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size = 8,
  color: string = COLORS.text,
  originX = 0.5,
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, value, { fontFamily: FONT, fontSize: `${size}px`, color, align: "center", lineSpacing: 4 })
    .setOrigin(originX, 0.5);
}

/** Scrolling three-layer starfield shared by every screen. */
export class Starfield {
  private layers: Phaser.GameObjects.TileSprite[];
  private speeds = [12, 30, 70];
  speedMult = 1;

  constructor(scene: Phaser.Scene) {
    scene.add.rectangle(0, 0, GAME_W, GAME_H, COLORS.bg).setOrigin(0);
    this.layers = ["stars-far", "stars-mid", "stars-near"].map((key) =>
      scene.add.tileSprite(0, 0, GAME_W, GAME_H, key).setOrigin(0),
    );
  }

  update(delta: number): void {
    const dt = delta / 1000;
    this.layers.forEach((l, i) => (l.tilePositionY -= this.speeds[i] * dt * this.speedMult));
  }
}

export interface MenuItem {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}

/** Vertical list of buttons usable with keyboard (arrows/WASD + Enter/Space), mouse or touch. */
export class ButtonList {
  private items: { box: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; item: MenuItem }[] = [];
  private index = 0;

  constructor(
    private scene: Phaser.Scene,
    x: number,
    y: number,
    entries: MenuItem[],
    width = 200,
    gap = 34,
  ) {
    entries.forEach((item, i) => {
      const by = y + i * gap;
      const box = scene.add
        .rectangle(x, by, width, 26, 0x14122a)
        .setStrokeStyle(2, 0x555c7c)
        .setInteractive({ useHandCursor: true });
      const label = txt(scene, x, by + 1, item.label, 10, item.disabled ? COLORS.muted : COLORS.text);
      box.on("pointerover", () => this.focus(i));
      box.on("pointerdown", () => this.activate(i));
      this.items.push({ box, label, item });
    });

    const kb = scene.input.keyboard;
    kb?.on("keydown-UP", () => this.move(-1));
    kb?.on("keydown-W", () => this.move(-1));
    kb?.on("keydown-DOWN", () => this.move(1));
    kb?.on("keydown-S", () => this.move(1));
    kb?.on("keydown-ENTER", () => this.activate(this.index));
    kb?.on("keydown-SPACE", () => this.activate(this.index));
    this.focus(0);
  }

  setLabel(i: number, label: string, disabled = false): void {
    const it = this.items[i];
    it.item.label = label;
    it.item.disabled = disabled;
    it.label.setText(label).setColor(disabled ? COLORS.muted : COLORS.text);
    this.focus(this.index);
  }

  private move(d: number): void {
    this.focus(Phaser.Math.Wrap(this.index + d, 0, this.items.length));
  }

  private focus(i: number): void {
    this.index = i;
    this.items.forEach((it, j) => {
      const on = j === i;
      it.box.setStrokeStyle(2, on ? 0x3ec5ff : 0x555c7c).setFillStyle(on ? 0x1d2a4a : 0x14122a);
      it.label.setText((on ? "> " : "") + it.item.label);
    });
  }

  private activate(i: number): void {
    const it = this.items[i];
    if (!it || it.item.disabled) return;
    this.scene.sound.play("hit", { volume: 0.2 });
    it.item.onSelect();
  }
}
