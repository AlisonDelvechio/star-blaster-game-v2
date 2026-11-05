import Phaser from "phaser";
import { COLORS, GAME_W } from "../config";
import { META_UPGRADES, metaCost } from "../data/meta";
import { loadSave, writeSave } from "../systems/save";
import { Starfield, txt } from "../ui/ui";

export class HangarScene extends Phaser.Scene {
  private stars!: Starfield;
  private index = 0;
  private rows: { box: Phaser.GameObjects.Rectangle; name: Phaser.GameObjects.Text; info: Phaser.GameObjects.Text }[] = [];
  private creditsText!: Phaser.GameObjects.Text;
  private pips!: Phaser.GameObjects.Graphics;

  constructor() {
    super("Hangar");
  }

  create(): void {
    this.stars = new Starfield(this);
    this.index = 0;
    txt(this, GAME_W / 2, 44, "HANGAR", 16, COLORS.accent);
    txt(this, GAME_W / 2, 68, "PERMANENT UPGRADES", 6, COLORS.dim);
    this.creditsText = txt(this, GAME_W / 2, 92, "", 8, COLORS.gold);

    this.rows = META_UPGRADES.map((_m, i) => {
      const y = 140 + i * 58;
      const box = this.add.rectangle(GAME_W / 2, y, 320, 48, 0x14122a).setInteractive({ useHandCursor: true });
      const name = txt(this, 30, y - 10, "", 8, COLORS.text, 0);
      const info = txt(this, 30, y + 10, "", 6, COLORS.dim, 0);
      box.on("pointerover", () => this.focus(i));
      box.on("pointerdown", () => this.buy(i));
      return { box, name, info };
    });

    this.pips = this.add.graphics();

    const back = txt(this, GAME_W / 2, 610, "< BACK [ESC]", 8, COLORS.dim).setInteractive({ useHandCursor: true });
    back.on("pointerdown", () => this.scene.start("Menu"));

    const kb = this.input.keyboard!;
    kb.on("keydown-UP", () => this.focus(Phaser.Math.Wrap(this.index - 1, 0, this.rows.length)));
    kb.on("keydown-W", () => this.focus(Phaser.Math.Wrap(this.index - 1, 0, this.rows.length)));
    kb.on("keydown-DOWN", () => this.focus(Phaser.Math.Wrap(this.index + 1, 0, this.rows.length)));
    kb.on("keydown-S", () => this.focus(Phaser.Math.Wrap(this.index + 1, 0, this.rows.length)));
    kb.on("keydown-ENTER", () => this.buy(this.index));
    kb.on("keydown-SPACE", () => this.buy(this.index));
    kb.on("keydown-ESC", () => this.scene.start("Menu"));

    this.refresh();
  }

  private focus(i: number): void {
    this.index = i;
    this.refresh();
  }

  private refresh(): void {
    const save = loadSave();
    this.creditsText.setText(`CREDITS ${save.credits}`);
    this.pips.clear();
    META_UPGRADES.forEach((m, i) => {
      const lvl = save.meta[m.id] ?? 0;
      const maxed = lvl >= m.max;
      const cost = metaCost(m, lvl);
      const row = this.rows[i];
      const on = i === this.index;
      row.box.setStrokeStyle(2, on ? 0x3ec5ff : 0x555c7c).setFillStyle(on ? 0x1d2a4a : 0x14122a);
      row.name.setText(m.name);
      for (let k = 0; k < m.max; k++) {
        this.pips.fillStyle(k < lvl ? 0x8cff7a : 0x2a2f4a);
        this.pips.fillRect(GAME_W - 40 - (m.max - k) * 12, row.box.y - 14, 8, 8);
      }
      row.info.setText(`${m.desc.toUpperCase()}   ${maxed ? "MAX" : `${cost} CR`}`);
      row.info.setColor(maxed ? COLORS.good : save.credits >= cost ? COLORS.gold : COLORS.muted);
    });
  }

  private buy(i: number): void {
    const save = loadSave();
    const m = META_UPGRADES[i];
    const lvl = save.meta[m.id] ?? 0;
    const cost = metaCost(m, lvl);
    if (lvl >= m.max || save.credits < cost) {
      this.cameras.main.shake(100, 0.004);
      return;
    }
    save.credits -= cost;
    save.meta[m.id] = lvl + 1;
    writeSave();
    this.sound.play("next_level", { volume: 0.3 });
    this.refresh();
  }

  update(_t: number, delta: number): void {
    this.stars.update(delta);
  }
}
