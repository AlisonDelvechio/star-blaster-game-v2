import Phaser from "phaser";
import { COLORS, GAME_H, GAME_W, RARITY_COLORS } from "../config";
import type { Upgrade } from "../data/upgrades";
import { txt } from "../ui/ui";
import type { UpgradeSceneData } from "./GameScene";

/** Overlay shown between waves: pick 1 of 3 upgrades (keys 1-3, arrows + Enter, or click). */
export class UpgradeScene extends Phaser.Scene {
  private data_!: UpgradeSceneData;
  private cards: Phaser.GameObjects.Container[] = [];
  private index = 0;
  private rerollText!: Phaser.GameObjects.Text;
  private picked = false;

  constructor() {
    super("Upgrade");
  }

  create(data: UpgradeSceneData): void {
    this.data_ = data;
    this.index = 0;
    this.picked = false;

    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x07060f, 0.82).setOrigin(0);
    txt(this, GAME_W / 2, 110, data.title, 12, COLORS.gold);
    txt(this, GAME_W / 2, 134, `HP ${data.run.hp}/${data.run.stats.maxHp}`, 6, COLORS.dim);

    this.rerollText = txt(this, GAME_W / 2, 560, "", 8, COLORS.accent).setInteractive({ useHandCursor: true });
    this.rerollText.on("pointerdown", () => this.reroll());

    this.buildCards(data.choices);

    const kb = this.input.keyboard!;
    kb.on("keydown-ONE", () => this.pick(0));
    kb.on("keydown-TWO", () => this.pick(1));
    kb.on("keydown-THREE", () => this.pick(2));
    kb.on("keydown-UP", () => this.focus(this.index - 1));
    kb.on("keydown-W", () => this.focus(this.index - 1));
    kb.on("keydown-DOWN", () => this.focus(this.index + 1));
    kb.on("keydown-S", () => this.focus(this.index + 1));
    kb.on("keydown-ENTER", () => this.pick(this.index));
    kb.on("keydown-SPACE", () => this.pick(this.index));
    kb.on("keydown-R", () => this.reroll());
  }

  private buildCards(choices: Upgrade[]): void {
    this.cards.forEach((c) => c.destroy());
    this.cards = choices.map((u, i) => {
      const y = 210 + i * 110;
      const col = RARITY_COLORS[u.rarity];
      const box = this.add.rectangle(0, 0, 300, 92, 0x14122a).setStrokeStyle(2, col.border);
      const key = txt(this, -136, -30, `${i + 1}`, 8, COLORS.muted, 0);
      const rarity = txt(this, 136, -30, u.rarity.toUpperCase(), 6, col.text, 1);
      const count = this.data_.run.picks[u.id] ?? 0;
      const name = txt(this, 0, -6, u.name.toUpperCase(), 10, col.text);
      const lvl = u.max ? `  ${count}/${u.max}` : count ? `  x${count}` : "";
      const desc = txt(this, 0, 20, u.desc.toUpperCase() + lvl, 6, COLORS.text);
      desc.setWordWrapWidth(270);
      const card = this.add.container(GAME_W / 2, y, [box, key, rarity, name, desc]);
      card.setSize(300, 92).setInteractive({ useHandCursor: true });
      card.on("pointerover", () => this.focus(i));
      card.on("pointerdown", () => this.pick(i));
      card.setAlpha(0).setX(GAME_W / 2 + 40);
      this.tweens.add({ targets: card, alpha: 1, x: GAME_W / 2, duration: 220, delay: i * 70, ease: "Back.easeOut" });
      return card;
    });
    this.focus(0);
    this.updateReroll();
  }

  private updateReroll(): void {
    const n = this.data_.rerolls;
    this.rerollText.setText(n > 0 ? `REROLL [R]  (${n} LEFT)` : "");
  }

  private focus(i: number): void {
    if (this.cards.length === 0) return;
    this.index = Phaser.Math.Wrap(i, 0, this.cards.length);
    this.cards.forEach((c, j) => c.setScale(j === this.index ? 1.04 : 1));
  }

  private reroll(): void {
    if (this.picked) return;
    const next = this.data_.reroll();
    if (!next) return;
    this.data_.rerolls--;
    this.data_.choices = next;
    this.sound.play("hit", { volume: 0.2 });
    this.buildCards(next);
  }

  private pick(i: number): void {
    if (this.picked || !this.cards[i]) return;
    this.picked = true;
    const u = this.data_.choices[i];
    this.sound.play("next_level", { volume: 0.35 });
    this.tweens.add({
      targets: this.cards[i],
      scale: 1.15,
      alpha: 0,
      duration: 250,
      onComplete: () => {
        this.scene.stop();
        this.scene.resume("Game");
        this.data_.onPick(u);
      },
    });
  }
}
