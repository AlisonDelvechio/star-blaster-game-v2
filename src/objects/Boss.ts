import Phaser from "phaser";
import { GAME_W } from "../config";
import type { EnemyHost } from "./Enemy";

export interface BossHost extends EnemyHost {
  summonDrones(count: number): void;
}

type Pattern = "fan" | "spiral" | "rain" | "summon";

/** The sector guardian: cycles through bullet patterns and gets angrier at half HP. */
export class Boss extends Phaser.Physics.Arcade.Sprite {
  hp: number;
  maxHp: number;
  private host: BossHost;
  private age = 0;
  private entering = true;
  private patternIdx = 0;
  private patternTime = 0;
  private shotTimer = 0;
  private spiralAngle = 0;
  private readonly sector: number;
  private readonly patterns: Pattern[];

  constructor(scene: Phaser.Scene, host: BossHost, sector: number) {
    super(scene, GAME_W / 2, -60, "boss");
    this.host = host;
    this.sector = sector;
    this.maxHp = this.hp = Math.round(1400 * (1 + 0.75 * (sector - 1)));
    this.patterns = sector >= 2 ? ["fan", "spiral", "summon", "rain"] : ["fan", "spiral", "summon"];
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(1.5);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.width * 0.8, this.height * 0.6);
  }

  get enraged(): boolean {
    return this.hp < this.maxHp / 2;
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const dt = delta / 1000;
    this.age += dt;

    if (this.entering) {
      this.y += 50 * dt;
      if (this.y >= 120) this.entering = false;
      return;
    }

    const sway = this.enraged ? 0.9 : 0.6;
    this.x = GAME_W / 2 + Math.sin(this.age * sway) * 100;
    this.y = 120 + Math.sin(this.age * 1.7) * 10;

    this.patternTime += dt;
    if (this.patternTime > 4.5) {
      this.patternTime = 0;
      this.patternIdx = (this.patternIdx + 1) % this.patterns.length;
      this.shotTimer = 0.6;
      if (this.patterns[this.patternIdx] === "summon") {
        this.host.summonDrones(this.enraged ? 5 : 3);
      }
    }

    this.shotTimer -= dt;
    if (this.shotTimer > 0) return;
    const speedUp = this.enraged ? 0.7 : 1;
    const bulletSpd = 160 + this.sector * 12;

    switch (this.patterns[this.patternIdx]) {
      case "fan": {
        const p = this.host.player;
        const aim = Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y);
        const n = this.enraged ? 7 : 5;
        for (let i = 0; i < n; i++) {
          this.host.fireEnemyBullet(this.x, this.y + 30, aim + (i - (n - 1) / 2) * 0.18, bulletSpd, true);
        }
        this.shotTimer = 1.1 * speedUp;
        break;
      }
      case "spiral": {
        const arms = this.enraged ? 4 : 3;
        for (let i = 0; i < arms; i++) {
          const a = this.spiralAngle + (i * Math.PI * 2) / arms;
          this.host.fireEnemyBullet(this.x, this.y + 10, a, bulletSpd * 0.8);
        }
        this.spiralAngle += 0.32;
        this.shotTimer = 0.14 * speedUp;
        break;
      }
      case "rain": {
        for (let i = 0; i < 3; i++) {
          const x = Phaser.Math.Between(20, GAME_W - 20);
          this.host.fireEnemyBullet(x, -10, Math.PI / 2, bulletSpd * 0.9, true);
        }
        this.shotTimer = 0.35 * speedUp;
        break;
      }
      case "summon":
        // Drones were summoned at pattern start; just fire slow aimed shots.
        {
          const p = this.host.player;
          this.host.fireEnemyBullet(this.x, this.y + 30, Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y), bulletSpd, true);
          this.shotTimer = 0.9 * speedUp;
        }
        break;
    }
  }
}
