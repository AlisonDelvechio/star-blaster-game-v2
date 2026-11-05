import Phaser from "phaser";
import { GAME_H, GAME_W } from "../config";

export type EnemyKind = "drone" | "zigzag" | "gunner" | "diver" | "tank";

export interface EnemyDef {
  hp: number;
  score: number;
  credits: number;
  /** Cost in the wave budget. */
  cost: number;
  /** First difficulty level where this enemy can show up. */
  minLevel: number;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  drone: { hp: 20, score: 10, credits: 1, cost: 1, minLevel: 0 },
  zigzag: { hp: 18, score: 15, credits: 1, cost: 1.2, minLevel: 1 },
  gunner: { hp: 40, score: 25, credits: 2, cost: 2.2, minLevel: 2 },
  diver: { hp: 26, score: 20, credits: 2, cost: 1.6, minLevel: 3 },
  tank: { hp: 140, score: 60, credits: 5, cost: 5, minLevel: 5 },
};

/** What enemies need from the game scene. */
export interface EnemyHost {
  readonly player: Phaser.GameObjects.Components.Transform;
  readonly level: number;
  fireEnemyBullet(x: number, y: number, angleRad: number, speed: number, big?: boolean): void;
}

export interface SpawnOpts {
  kind: EnemyKind;
  x: number;
  y: number;
  /** Where the enemy settles (drones, gunners) or starts its dive. */
  targetY: number;
  hpMult: number;
  elite: boolean;
  /** Phase offset for sine movement so squads don't move in lockstep. */
  phase: number;
}

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  kind!: EnemyKind;
  hp = 0;
  maxHp = 0;
  elite = false;
  def!: EnemyDef;
  private host!: EnemyHost;
  private age = 0;
  private baseX = 0;
  private targetY = 0;
  private phase = 0;
  private fireTimer = 0;
  private mode: "enter" | "active" | "windup" | "dash" = "enter";
  private dir = 1;

  setup(host: EnemyHost, o: SpawnOpts): this {
    this.host = host;
    this.kind = o.kind;
    this.def = ENEMIES[o.kind];
    this.elite = o.elite;
    this.maxHp = this.hp = Math.round(this.def.hp * o.hpMult * (o.elite ? 2.5 : 1));
    this.baseX = o.x;
    this.targetY = o.targetY;
    this.phase = o.phase;
    this.age = 0;
    this.mode = "enter";
    this.dir = Phaser.Math.RND.sign();
    this.fireTimer = Phaser.Math.FloatBetween(1, 3);

    this.setTexture(o.kind);
    this.setPosition(o.x, o.y);
    this.setActive(true).setVisible(true);
    this.setScale(o.elite ? 1.25 : 1);
    this.clearTint();
    if (o.elite) this.setTint(0xffe066);
    this.setAngle(0);
    this.setVelocity(0, 0);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    // A slightly smaller hitbox than the art feels fairer.
    body.setSize(this.width * 0.8, this.height * 0.75);
    return this;
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active) return;
    const dt = delta / 1000;
    this.age += dt;
    this.behave(dt);

    if (this.y > GAME_H + 40 || this.x < -60 || this.x > GAME_W + 60) {
      this.despawn();
    }
  }

  private behave(dt: number): void {
    const lvl = this.host.level;
    const p = this.host.player;
    switch (this.kind) {
      case "drone": {
        if (this.mode === "enter") {
          this.y += 140 * dt;
          if (this.y >= this.targetY) this.mode = "active";
        } else {
          this.y += (5 + lvl * 0.6) * dt;
          this.x = this.baseX + Math.sin(this.age * 1.3 + this.phase) * 34;
          if (lvl >= 1) this.tickFire(dt, 3.4 - Math.min(1.6, lvl * 0.12), () => {
            this.host.fireEnemyBullet(this.x, this.y + 8, Math.PI / 2, 150 + lvl * 6);
          });
        }
        break;
      }
      case "zigzag": {
        this.y += (70 + lvl * 3) * dt;
        this.x = this.baseX + Math.sin(this.age * 2.4 + this.phase) * 70;
        this.setAngle(Math.cos(this.age * 2.4 + this.phase) * -18);
        break;
      }
      case "gunner": {
        if (this.mode === "enter") {
          this.y += 110 * dt;
          if (this.y >= this.targetY) this.mode = "active";
        } else {
          this.x += this.dir * 45 * dt;
          if (this.x < 30 || this.x > GAME_W - 30) this.dir *= -1;
          this.y += 4 * dt;
          this.tickFire(dt, 2.4 - Math.min(1, lvl * 0.06), () => {
            const a = Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y);
            const burst = this.elite ? 5 : 3;
            for (let i = 0; i < burst; i++) {
              this.scene.time.delayedCall(i * 120, () => {
                if (this.active) this.host.fireEnemyBullet(this.x, this.y + 10, a, 190 + lvl * 5);
              });
            }
          });
        }
        break;
      }
      case "diver": {
        if (this.mode === "enter") {
          this.y += 130 * dt;
          if (this.y >= this.targetY) {
            this.mode = "windup";
            this.age = 0;
          }
        } else if (this.mode === "windup") {
          this.x += Math.sin(this.age * 40) * 0.8;
          this.setTint(Math.floor(this.age * 12) % 2 ? 0xffffff : this.elite ? 0xffe066 : 0x8cff7a);
          if (this.age > 0.7) {
            this.mode = "dash";
            if (this.elite) this.setTint(0xffe066);
            else this.clearTint();
            const a = Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y);
            const spd = 330 + lvl * 6;
            this.setVelocity(Math.cos(a) * spd, Math.sin(a) * spd);
            this.setRotation(a - Math.PI / 2);
          }
        }
        break;
      }
      case "tank": {
        this.y += 22 * dt;
        this.x = this.baseX + Math.sin(this.age * 0.6 + this.phase) * 20;
        this.tickFire(dt, 2.8, () => {
          const n = this.elite ? 5 : 3;
          for (let i = 0; i < n; i++) {
            const a = Math.PI / 2 + (i - (n - 1) / 2) * 0.28;
            this.host.fireEnemyBullet(this.x, this.y + 14, a, 150 + lvl * 4, true);
          }
        });
        break;
      }
    }
  }

  private tickFire(dt: number, interval: number, fire: () => void): void {
    this.fireTimer -= dt;
    // Don't shoot from too low on the screen: it feels unfair.
    if (this.fireTimer <= 0 && this.y < GAME_H * 0.6) {
      this.fireTimer = interval * Phaser.Math.FloatBetween(0.8, 1.25);
      fire();
    }
  }

  despawn(): void {
    this.setActive(false).setVisible(false);
    this.setVelocity(0, 0);
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
  }
}
