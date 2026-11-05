import Phaser from "phaser";
import { COLORS, GAME_H, GAME_W } from "../config";
import { getShip, startingStats } from "../data/ships";
import { rollUpgrades, type Rarity, type RunState, type Upgrade } from "../data/upgrades";
import { buildWave, difficulty, isBossWave, WAVES_PER_SECTOR, type Squad } from "../data/waves";
import { Boss, type BossHost } from "../objects/Boss";
import { Enemy, type SpawnOpts } from "../objects/Enemy";
import { loadSave, metaLevel, writeSave } from "../systems/save";
import { sfx } from "../systems/sfx";
import { Starfield, txt } from "../ui/ui";

type Body = Phaser.Physics.Arcade.Body;

/** Extra fields stored on pooled projectile images. */
interface Shot extends Phaser.Physics.Arcade.Image {
  dmg: number;
  pierce: number;
  crit: boolean;
  homing: boolean;
  life: number;
  hits: Set<object>;
}

interface Pickup extends Phaser.Physics.Arcade.Image {
  kind: "credit" | "heal";
  value: number;
}

export interface RunResult {
  score: number;
  sector: number;
  wave: number;
  credits: number;
  kills: number;
  shipId: string;
  newHigh: boolean;
}

export interface UpgradeSceneData {
  title: string;
  choices: Upgrade[];
  run: RunState;
  rerolls: number;
  reroll: () => Upgrade[] | null;
  onPick: (u: Upgrade) => void;
}

export class GameScene extends Phaser.Scene implements BossHost {
  player!: Phaser.Physics.Arcade.Sprite;
  private flame!: Phaser.GameObjects.Image;
  private shieldGfx!: Phaser.GameObjects.Graphics;
  private wingmen: Phaser.GameObjects.Image[] = [];
  private stars!: Starfield;

  private playerShots!: Phaser.Physics.Arcade.Group;
  private enemyShots!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.Physics.Arcade.Group;
  private boss: Boss | null = null;

  private boom!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;

  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private dragFrom: { px: number; py: number; sx: number; sy: number } | null = null;

  private run!: RunState;
  private shipId = "falcon";
  private sector = 1;
  private wave = 1;
  private score = 0;
  private credits = 0;
  private kills = 0;
  private rerolls = 0;
  private autoFire = true;

  private fireCd = 0;
  private droneCd = 0;
  private missileCd = 0;
  private shieldTimer = 0;
  private invuln = 0;
  private vacuum = 0;
  private dead = false;

  private squads: Squad[] = [];
  private squadTimer = 0;
  private waveRunning = false;

  private hud!: {
    hearts: Phaser.GameObjects.Image[];
    shields: Phaser.GameObjects.Image[];
    score: Phaser.GameObjects.Text;
    credits: Phaser.GameObjects.Text;
    wave: Phaser.GameObjects.Text;
    auto: Phaser.GameObjects.Text;
    bossBar: Phaser.GameObjects.Rectangle;
    bossBarBg: Phaser.GameObjects.Rectangle;
    bossLabel: Phaser.GameObjects.Text;
  };

  constructor() {
    super("Game");
  }

  get level(): number {
    return difficulty(this.sector, this.wave);
  }

  create(): void {
    const save = loadSave();
    this.shipId = save.selectedShip;
    const ship = getShip(this.shipId);
    const stats = startingStats(ship);
    this.run = { stats, hp: stats.maxHp, shield: stats.shieldMax, picks: {} };
    this.sector = 1;
    this.wave = 1;
    this.score = 0;
    this.credits = 0;
    this.kills = 0;
    this.rerolls = metaLevel("reroll");
    this.dead = false;
    this.boss = null;
    this.wingmen = [];
    this.squads = [];
    this.waveRunning = false;
    this.invuln = 0;

    this.stars = new Starfield(this);

    this.playerShots = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 300 });
    this.enemyShots = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 400 });
    this.enemies = this.physics.add.group({ classType: Enemy, maxSize: 120 });
    this.pickups = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 200 });

    this.flame = this.add.image(0, 0, "flame").setScale(2, 2);
    this.player = this.physics.add.sprite(GAME_W / 2, GAME_H - 80, ship.texture);
    this.player.setCollideWorldBounds(true);
    (this.player.body as Body).setSize(8, 8);
    this.shieldGfx = this.add.graphics();

    this.boom = this.add.particles(0, 0, "px", {
      speed: { min: 40, max: 200 },
      lifespan: { min: 250, max: 600 },
      scale: { start: 2, end: 0 },
      tint: [0xff5266, 0xff9f3a, 0xffe066, 0xf4f4f8],
      emitting: false,
    });
    this.sparks = this.add.particles(0, 0, "px", {
      speed: { min: 30, max: 110 },
      lifespan: 220,
      scale: { start: 1.2, end: 0 },
      tint: [0xa6f6ff, 0xf4f4f8],
      emitting: false,
    });

    this.physics.add.overlap(this.playerShots, this.enemies, (a, b) =>
      this.onShotHitEnemy(a as Shot, b as Enemy),
    );
    this.physics.add.overlap(this.player, this.enemyShots, (_p, b) => {
      this.killObj(this.enemyShots, b as Phaser.Physics.Arcade.Image);
      this.hurtPlayer();
    });
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => {
      const enemy = e as Enemy;
      if (this.invuln > 0) return;
      this.damageEnemy(enemy, 60, false);
      this.hurtPlayer();
    });
    this.physics.add.overlap(this.player, this.pickups, (_p, pk) => this.collect(pk as Pickup));

    this.setupInput();
    this.buildHud();
    this.syncWingmen();

    this.events.on("resume", () => this.input.keyboard?.resetKeys());
    this.cameras.main.fadeIn(300);
    this.startWave();
  }

  // ───────────────────────── Input ─────────────────────────

  private setupInput(): void {
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys("UP,DOWN,LEFT,RIGHT,W,A,S,D,SPACE") as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on("keydown-F", () => {
      this.autoFire = !this.autoFire;
      this.updateHud();
    });
    const pause = () => {
      if (this.dead) return;
      this.scene.pause();
      this.scene.launch("Pause");
    };
    kb.on("keydown-ESC", pause);
    kb.on("keydown-P", pause);

    // Touch / mouse: drag anywhere to move the ship relative to where you started.
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.dragFrom = { px: p.x, py: p.y, sx: this.player.x, sy: this.player.y };
    });
    this.input.on("pointerup", () => (this.dragFrom = null));
  }

  private movePlayer(dt: number): void {
    const s = this.run.stats;
    const k = this.keys;
    let vx = 0;
    let vy = 0;
    if (k.LEFT.isDown || k.A.isDown) vx -= 1;
    if (k.RIGHT.isDown || k.D.isDown) vx += 1;
    if (k.UP.isDown || k.W.isDown) vy -= 1;
    if (k.DOWN.isDown || k.S.isDown) vy += 1;

    const p = this.input.activePointer;
    if (this.dragFrom && p.isDown) {
      const tx = this.dragFrom.sx + (p.x - this.dragFrom.px) * 1.3;
      const ty = this.dragFrom.sy + (p.y - this.dragFrom.py) * 1.3;
      const dx = tx - this.player.x;
      const dy = ty - this.player.y;
      const maxStep = s.speed * 1.6 * dt;
      const dist = Math.hypot(dx, dy);
      const step = Math.min(dist, maxStep);
      if (dist > 0.5) {
        this.player.x += (dx / dist) * step;
        this.player.y += (dy / dist) * step;
      }
      this.player.setVelocity(0, 0);
    } else {
      const len = Math.hypot(vx, vy) || 1;
      this.player.setVelocity((vx / len) * s.speed, (vy / len) * s.speed);
    }

    this.player.y = Phaser.Math.Clamp(this.player.y, GAME_H * 0.3, GAME_H - 20);
    this.player.x = Phaser.Math.Clamp(this.player.x, 14, GAME_W - 14);
    // Lean the ship slightly when strafing.
    const lean = this.player.body!.velocity.x / s.speed;
    this.player.setAngle(lean * 8);
  }

  // ───────────────────────── Main loop ─────────────────────────

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    this.stars.update(delta);
    if (this.dead) return;

    this.movePlayer(dt);
    this.updateShip(dt);
    this.updateWeapons(dt);
    this.updateShots(dt);
    this.updatePickups(dt);
    this.updateWave(dt);
    this.updateHud();
  }

  private updateShip(dt: number): void {
    const s = this.run.stats;
    this.flame.setPosition(this.player.x - 1, this.player.y + 18);
    this.flame.setScale(2, 1.5 + Math.random() * 1.2);

    if (this.invuln > 0) {
      this.invuln -= dt;
      this.player.setAlpha(Math.floor(this.invuln * 14) % 2 ? 0.3 : 1);
    } else {
      this.player.setAlpha(1);
    }

    if (this.run.shield < s.shieldMax) {
      this.shieldTimer += dt;
      if (this.shieldTimer >= s.shieldRecharge) {
        this.shieldTimer = 0;
        this.run.shield++;
        this.sparks.explode(10, this.player.x, this.player.y);
      }
    }

    this.shieldGfx.clear();
    if (this.run.shield > 0) {
      const pulse = 0.35 + Math.sin(this.time.now / 150) * 0.15;
      this.shieldGfx.lineStyle(2, 0x3ec5ff, pulse + 0.3);
      this.shieldGfx.strokeCircle(this.player.x, this.player.y, 22);
      this.shieldGfx.fillStyle(0x3ec5ff, pulse * 0.25);
      this.shieldGfx.fillCircle(this.player.x, this.player.y, 22);
    }

    const t = this.time.now / 1000;
    this.wingmen.forEach((w, i) => {
      const a = t * 2.2 + (i * Math.PI * 2) / this.wingmen.length;
      w.setPosition(this.player.x + Math.cos(a) * 30, this.player.y + Math.sin(a) * 18);
    });
  }

  private updateWeapons(dt: number): void {
    const s = this.run.stats;
    this.fireCd -= dt;
    const firing = this.autoFire || this.keys.SPACE.isDown;
    if (firing && this.fireCd <= 0) {
      this.fireCd = 1 / s.fireRate;
      const n = s.shots;
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * s.spread;
        const xOff = (i - (n - 1) / 2) * 4;
        this.firePlayerShot(this.player.x + xOff, this.player.y - 14, -90 + off, s.damage);
      }
      sfx(this, "shoot", 0.12, 70);
    }

    if (s.drones > 0) {
      this.droneCd -= dt;
      if (this.droneCd <= 0) {
        this.droneCd = 0.5;
        this.wingmen.forEach((w) => this.firePlayerShot(w.x, w.y - 6, -90, s.damage * 0.5));
      }
    }

    if (s.missiles > 0 && this.hasTargets()) {
      this.missileCd -= dt;
      if (this.missileCd <= 0) {
        this.missileCd = s.missileInterval;
        for (let i = 0; i < s.missiles; i++) {
          const side = i % 2 === 0 ? -1 : 1;
          const m = this.firePlayerShot(this.player.x + side * 10, this.player.y, -90 + side * 50, s.damage * 2.2, true);
          if (m) m.setTexture("missile");
        }
      }
    }
  }

  private firePlayerShot(x: number, y: number, angleDeg: number, dmg: number, homing = false): Shot | null {
    const s = this.run.stats;
    const shot = this.playerShots.get(x, y, "bullet-player") as Shot | null;
    if (!shot) return null;
    shot.setActive(true).setVisible(true);
    (shot.body as Body).enable = true;
    shot.crit = Math.random() < s.critChance;
    shot.dmg = dmg * (shot.crit ? s.critMult : 1);
    shot.pierce = homing ? 0 : s.pierce;
    shot.homing = homing;
    shot.life = homing ? 3 : 2;
    shot.hits = new Set();
    shot.setTexture(shot.crit && !homing ? "bullet-crit" : "bullet-player");
    const spd = homing ? 260 : s.bulletSpeed;
    const rad = Phaser.Math.DegToRad(angleDeg);
    shot.setVelocity(Math.cos(rad) * spd, Math.sin(rad) * spd);
    shot.setRotation(rad + Math.PI / 2);
    return shot;
  }

  fireEnemyBullet(x: number, y: number, angleRad: number, speed: number, big = false): void {
    if (this.dead) return;
    const b = this.enemyShots.get(x, y, big ? "bullet-boss" : "bullet-enemy") as Phaser.Physics.Arcade.Image | null;
    if (!b) return;
    b.setTexture(big ? "bullet-boss" : "bullet-enemy");
    b.setActive(true).setVisible(true);
    const body = b.body as Body;
    body.enable = true;
    body.setCircle(big ? 3 : 2, big ? 2 : 2, big ? 2 : 2);
    b.setVelocity(Math.cos(angleRad) * speed, Math.sin(angleRad) * speed);
  }

  private updateShots(dt: number): void {
    const target = this.nearestTarget();
    for (const obj of this.playerShots.getChildren()) {
      const s = obj as Shot;
      if (!s.active) continue;
      s.life -= dt;
      if (s.homing && target) {
        const body = s.body as Body;
        const cur = Math.atan2(body.velocity.y, body.velocity.x);
        const want = Phaser.Math.Angle.Between(s.x, s.y, target.x, target.y);
        const next = Phaser.Math.Angle.RotateTo(cur, want, 5 * dt);
        const spd = Math.min(480, body.velocity.length() + 400 * dt);
        s.setVelocity(Math.cos(next) * spd, Math.sin(next) * spd);
        s.setRotation(next + Math.PI / 2);
      }
      if (s.life <= 0 || s.y < -20 || s.y > GAME_H + 20 || s.x < -20 || s.x > GAME_W + 20) {
        this.killObj(this.playerShots, s);
      }
    }
    for (const obj of this.enemyShots.getChildren()) {
      const b = obj as Phaser.Physics.Arcade.Image;
      if (b.active && (b.y > GAME_H + 20 || b.y < -40 || b.x < -20 || b.x > GAME_W + 20)) {
        this.killObj(this.enemyShots, b);
      }
    }

    // Boss collisions are checked by hand (it's a single sprite outside the enemy pool).
    if (this.boss?.active) {
      const bb = this.boss.getBounds();
      Phaser.Geom.Rectangle.Inflate(bb, -12, -14);
      for (const obj of this.playerShots.getChildren()) {
        const s = obj as Shot;
        if (s.active && bb.contains(s.x, s.y)) {
          this.sparks.explode(4, s.x, s.y);
          this.damageBoss(s.dmg, s.crit);
          this.killObj(this.playerShots, s);
        }
      }
      if (this.invuln <= 0 && bb.contains(this.player.x, this.player.y)) this.hurtPlayer();
    }
  }

  private killObj(group: Phaser.Physics.Arcade.Group, obj: Phaser.Physics.Arcade.Image): void {
    group.killAndHide(obj);
    (obj.body as Body).enable = false;
    obj.setVelocity(0, 0);
  }

  private hasTargets(): boolean {
    return this.enemies.countActive() > 0 || !!this.boss?.active;
  }

  private nearestTarget(): Phaser.GameObjects.Components.Transform | null {
    let best: Phaser.GameObjects.Components.Transform | null = null;
    let bestD = Infinity;
    for (const obj of this.enemies.getChildren()) {
      const e = obj as Enemy;
      if (!e.active || e.y < 0) continue;
      const d = Phaser.Math.Distance.Squared(e.x, e.y, this.player.x, this.player.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (!best && this.boss?.active) best = this.boss;
    return best;
  }

  // ───────────────────────── Combat ─────────────────────────

  private onShotHitEnemy(shot: Shot, enemy: Enemy): void {
    if (!shot.active || !enemy.active || shot.hits.has(enemy)) return;
    shot.hits.add(enemy);
    this.sparks.explode(4, shot.x, shot.y);
    this.damageEnemy(enemy, shot.dmg, shot.crit);
    if (shot.pierce-- <= 0) this.killObj(this.playerShots, shot);
  }

  private damageEnemy(enemy: Enemy, dmg: number, crit: boolean): void {
    enemy.hp -= dmg;
    enemy.setTintFill(0xffffff);
    this.time.delayedCall(50, () => {
      if (!enemy.active) return;
      if (enemy.elite) enemy.setTint(0xffe066);
      else enemy.clearTint();
    });
    if (crit) this.popText(enemy.x, enemy.y - 10, `${Math.round(dmg)}!`, COLORS.gold);
    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  private killEnemy(enemy: Enemy): void {
    const { x, y } = enemy;
    const def = enemy.def;
    enemy.despawn();
    this.kills++;
    this.score += Math.round(def.score * (enemy.elite ? 3 : 1) * (1 + 0.1 * (this.sector - 1)));
    this.boom.explode(enemy.elite ? 24 : 14, x, y);
    sfx(this, "explosion", 0.22, 60);
    this.cameras.main.shake(70, 0.003);

    const drops = def.credits * (enemy.elite ? 3 : 1);
    for (let i = 0; i < drops; i++) this.spawnPickup(x, y, "credit");
    if (Math.random() < (enemy.elite ? 0.25 : 0.025)) this.spawnPickup(x, y, "heal");
    if (Math.random() < this.run.stats.healOnKill) this.heal(1);
  }

  private damageBoss(dmg: number, crit: boolean): void {
    const boss = this.boss;
    if (!boss || !boss.active) return;
    boss.hp -= dmg;
    boss.setTintFill(0xffffff);
    this.time.delayedCall(40, () => boss.active && boss.clearTint());
    if (crit) this.popText(boss.x + Phaser.Math.Between(-30, 30), boss.y + 20, `${Math.round(dmg)}!`, COLORS.gold);
    if (boss.hp <= 0) this.killBoss();
  }

  private killBoss(): void {
    const boss = this.boss!;
    const { x, y } = boss;
    boss.setActive(false);
    (boss.body as Body).enable = false;
    this.boss = null;
    this.score += 500 * this.sector;
    this.kills++;
    this.cameras.main.shake(600, 0.012);
    for (let i = 0; i < 8; i++) {
      this.time.delayedCall(i * 110, () => {
        this.boom.explode(30, x + Phaser.Math.Between(-40, 40), y + Phaser.Math.Between(-25, 25));
        sfx(this, "explosion", 0.4, 0);
      });
    }
    this.time.delayedCall(900, () => {
      boss.destroy();
      for (let i = 0; i < 12 + this.sector * 4; i++) this.spawnPickup(x, y, "credit");
      this.spawnPickup(x, y, "heal");
    });
    this.hud.bossBar.setVisible(false);
    this.hud.bossBarBg.setVisible(false);
    this.hud.bossLabel.setVisible(false);
  }

  private hurtPlayer(): void {
    if (this.invuln > 0 || this.dead) return;
    const s = this.run.stats;
    this.invuln = s.invuln;

    if (s.pulse) this.releasePulse();

    if (this.run.shield > 0) {
      this.run.shield--;
      this.shieldTimer = 0;
      this.sparks.explode(20, this.player.x, this.player.y);
      sfx(this, "hit", 0.3);
      this.cameras.main.shake(100, 0.004);
      return;
    }

    this.run.hp--;
    sfx(this, "hit", 0.5);
    this.cameras.main.shake(220, 0.01);
    this.cameras.main.flash(120, 255, 60, 80);
    if (this.run.hp <= 0) this.playerDies();
  }

  private releasePulse(): void {
    const ring = this.add.circle(this.player.x, this.player.y, 10).setStrokeStyle(3, 0xa6f6ff);
    this.tweens.add({ targets: ring, radius: 130, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
    for (const obj of this.enemyShots.getChildren()) {
      const b = obj as Phaser.Physics.Arcade.Image;
      if (b.active && Phaser.Math.Distance.Between(b.x, b.y, this.player.x, this.player.y) < 130) {
        this.sparks.explode(2, b.x, b.y);
        this.killObj(this.enemyShots, b);
      }
    }
    for (const obj of this.enemies.getChildren()) {
      const e = obj as Enemy;
      if (e.active && Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y) < 130) {
        this.damageEnemy(e, this.run.stats.damage * 3, false);
      }
    }
  }

  private heal(n: number): void {
    if (this.run.hp >= this.run.stats.maxHp) return;
    this.run.hp = Math.min(this.run.stats.maxHp, this.run.hp + n);
    this.popText(this.player.x, this.player.y - 24, `+${n} HP`, COLORS.good);
  }

  private playerDies(): void {
    this.dead = true;
    this.player.setVelocity(0, 0);
    this.boom.explode(60, this.player.x, this.player.y);
    sfx(this, "explosion", 0.7, 0);
    this.player.setVisible(false);
    this.flame.setVisible(false);
    this.shieldGfx.clear();
    this.wingmen.forEach((w) => w.setVisible(false));
    this.time.delayedCall(1500, () => this.endRun());
  }

  /** Saves progress and moves to the results screen. Also used when quitting from pause. */
  endRun(): void {
    const save = loadSave();
    const newHigh = this.score > save.highScore;
    save.credits += this.credits;
    save.highScore = Math.max(save.highScore, this.score);
    save.bestSector = Math.max(save.bestSector, this.sector);
    save.runs++;
    writeSave();
    const result: RunResult = {
      score: this.score,
      sector: this.sector,
      wave: this.wave,
      credits: this.credits,
      kills: this.kills,
      shipId: this.shipId,
      newHigh,
    };
    this.scene.stop("Pause");
    this.scene.stop("Upgrade");
    this.scene.start("GameOver", result);
  }

  // ───────────────────────── Pickups ─────────────────────────

  private spawnPickup(x: number, y: number, kind: Pickup["kind"]): void {
    const p = this.pickups.get(x, y, kind) as Pickup | null;
    if (!p) return;
    p.setTexture(kind).setActive(true).setVisible(true);
    (p.body as Body).enable = true;
    p.kind = kind;
    p.value = 1;
    p.setVelocity(Phaser.Math.Between(-70, 70), Phaser.Math.Between(-110, -30));
  }

  private updatePickups(dt: number): void {
    const s = this.run.stats;
    const radius = this.vacuum > 0 ? 9999 : s.magnet;
    if (this.vacuum > 0) this.vacuum -= dt;
    for (const obj of this.pickups.getChildren()) {
      const p = obj as Pickup;
      if (!p.active) continue;
      const body = p.body as Body;
      const d = Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y);
      if (d < radius) {
        const a = Phaser.Math.Angle.Between(p.x, p.y, this.player.x, this.player.y);
        const spd = 380;
        body.velocity.x = Phaser.Math.Linear(body.velocity.x, Math.cos(a) * spd, 0.2);
        body.velocity.y = Phaser.Math.Linear(body.velocity.y, Math.sin(a) * spd, 0.2);
      } else {
        // Drift down slowly.
        body.velocity.x *= 0.95;
        body.velocity.y = Math.min(60, body.velocity.y + 200 * dt);
      }
      if (p.y > GAME_H + 10) this.killObj(this.pickups, p);
    }
  }

  private collect(p: Pickup): void {
    if (!p.active) return;
    this.killObj(this.pickups, p);
    if (p.kind === "credit") {
      this.credits += Math.max(1, Math.round(p.value * this.run.stats.creditMult));
      sfx(this, "hit", 0.08, 30);
    } else {
      this.heal(1);
    }
  }

  // ───────────────────────── Waves ─────────────────────────

  private startWave(): void {
    const boss = isBossWave(this.wave);
    const title = boss ? "WARNING" : `SECTOR ${this.sector}`;
    const sub = boss ? "GUARDIAN APPROACHING" : `WAVE ${this.wave}/${WAVES_PER_SECTOR - 1}`;
    this.banner(title, sub, boss ? COLORS.danger : COLORS.accent);
    this.stars.speedMult = boss ? 0.6 : 1;

    this.time.delayedCall(1600, () => {
      if (this.dead) return;
      this.waveRunning = true;
      if (boss) {
        this.boss = new Boss(this, this, this.sector);
        this.hud.bossBar.setVisible(true);
        this.hud.bossBarBg.setVisible(true);
        this.hud.bossLabel.setVisible(true);
        this.squads = [];
      } else {
        this.squads = buildWave(this.level);
        this.squadTimer = 0;
      }
    });
  }

  private updateWave(dt: number): void {
    if (!this.waveRunning) return;

    if (this.squads.length > 0) {
      this.squadTimer -= dt;
      // Send the next squad on a timer, or right away if the screen is empty.
      if (this.squadTimer <= 0 || this.enemies.countActive() === 0) {
        this.spawnSquad(this.squads.shift()!);
        this.squadTimer = Math.max(1.3, 3.2 - this.level * 0.1);
      }
      return;
    }

    if (this.enemies.countActive() === 0 && !this.boss) {
      this.waveRunning = false;
      this.waveCleared();
    }
  }

  private spawnSquad(squad: Squad): void {
    const lvl = this.level;
    const hpMult = 1 + lvl * 0.17;
    const eliteChance = lvl >= 2 ? Math.min(0.2, 0.02 * lvl) : 0;
    for (const s of squad) {
      this.spawnEnemy({ ...s, hpMult, elite: Math.random() < eliteChance });
    }
  }

  private spawnEnemy(o: SpawnOpts): void {
    const e = this.enemies.get(o.x, o.y, o.kind) as Enemy | null;
    e?.setup(this, o);
  }

  summonDrones(count: number): void {
    if (!this.boss) return;
    for (let i = 0; i < count; i++) {
      this.spawnEnemy({
        kind: "drone",
        x: Phaser.Math.Clamp(this.boss.x + (i - (count - 1) / 2) * 40, 30, GAME_W - 30),
        y: this.boss.y,
        targetY: this.boss.y + 60 + (i % 2) * 20,
        hpMult: 1 + this.level * 0.12,
        elite: false,
        phase: i,
      });
    }
  }

  private waveCleared(): void {
    const wasBoss = isBossWave(this.wave);
    for (const obj of this.enemyShots.getChildren()) {
      const b = obj as Phaser.Physics.Arcade.Image;
      if (b.active) {
        this.sparks.explode(2, b.x, b.y);
        this.killObj(this.enemyShots, b);
      }
    }
    this.vacuum = 2;
    sfx(this, "next_level", 0.4, 0);
    this.banner(wasBoss ? "SECTOR CLEAR" : "WAVE CLEAR", wasBoss ? "+1 HP" : "", COLORS.good);
    if (wasBoss) this.run.hp = Math.min(this.run.stats.maxHp, this.run.hp + 1);

    this.time.delayedCall(wasBoss ? 2200 : 1400, () => {
      if (this.dead) return;
      this.offerUpgrade(wasBoss ? "rare" : "common", wasBoss ? "GUARDIAN REWARD" : "CHOOSE AN UPGRADE");
    });
  }

  private offerUpgrade(minRarity: Rarity, title: string): void {
    const luck = metaLevel("luck");
    const choices = rollUpgrades(this.run, 3, luck, minRarity);
    if (choices.length === 0) {
      this.nextWave();
      return;
    }
    const data: UpgradeSceneData = {
      title,
      choices,
      run: this.run,
      rerolls: this.rerolls,
      reroll: () => {
        if (this.rerolls <= 0) return null;
        this.rerolls--;
        return rollUpgrades(this.run, 3, luck, minRarity);
      },
      onPick: (u) => {
        u.apply(this.run);
        this.run.picks[u.id] = (this.run.picks[u.id] ?? 0) + 1;
        this.syncWingmen();
        this.nextWave();
      },
    };
    this.scene.pause();
    this.scene.launch("Upgrade", data);
  }

  private nextWave(): void {
    this.wave++;
    if (this.wave > WAVES_PER_SECTOR) {
      this.wave = 1;
      this.sector++;
    }
    this.startWave();
  }

  private syncWingmen(): void {
    while (this.wingmen.length < this.run.stats.drones) {
      this.wingmen.push(this.add.image(this.player.x, this.player.y, "support-drone"));
    }
  }

  // ───────────────────────── HUD & FX ─────────────────────────

  private buildHud(): void {
    this.add.rectangle(0, 0, GAME_W, 40, 0x07060f, 0.65).setOrigin(0).setDepth(10);
    this.hud = {
      hearts: [],
      shields: [],
      score: txt(this, GAME_W - 8, 13, "0", 8, COLORS.text, 1).setDepth(11),
      credits: txt(this, GAME_W - 8, 29, "0", 8, COLORS.gold, 1).setDepth(11),
      wave: txt(this, 8, 31, "", 6, COLORS.dim, 0).setDepth(11),
      auto: txt(this, 8, GAME_H - 10, "", 6, COLORS.muted, 0).setDepth(11),
      bossBarBg: this.add.rectangle(GAME_W / 2, 52, 300, 8, 0x2a1020).setStrokeStyle(2, 0x0d0b1a).setDepth(11).setVisible(false),
      bossBar: this.add.rectangle(GAME_W / 2 - 150, 52, 300, 8, 0xff5266).setOrigin(0, 0.5).setDepth(11).setVisible(false),
      bossLabel: txt(this, GAME_W / 2, 64, "GUARDIAN", 6, COLORS.danger).setDepth(11).setVisible(false),
    };
  }

  private updateHud(): void {
    const h = this.hud;
    const s = this.run.stats;
    while (h.hearts.length < s.maxHp) {
      h.hearts.push(this.add.image(14 + h.hearts.length * 18, 14, "heart").setDepth(11));
    }
    h.hearts.forEach((img, i) => img.setTexture(i < this.run.hp ? "heart" : "heart-empty"));
    while (h.shields.length < s.shieldMax) {
      h.shields.push(this.add.image(0, 14, "shield").setDepth(11));
    }
    h.shields.forEach((img, i) => {
      img.setX(14 + (s.maxHp + i) * 18 + 4);
      img.setAlpha(i < this.run.shield ? 1 : 0.25);
    });
    h.score.setText(`${this.score}`);
    h.credits.setText(`${this.credits} CR`);
    h.wave.setText(isBossWave(this.wave) ? `SECTOR ${this.sector} - BOSS` : `SECTOR ${this.sector} - WAVE ${this.wave}`);
    h.auto.setText(`AUTO-FIRE ${this.autoFire ? "ON" : "OFF"} [F]   PAUSE [ESC]`);
    if (this.boss) h.bossBar.width = 300 * Math.max(0, this.boss.hp / this.boss.maxHp);
  }

  private banner(title: string, sub: string, color: string): void {
    const t1 = txt(this, GAME_W / 2, GAME_H / 2 - 40, title, 16, color).setDepth(20).setAlpha(0);
    const t2 = txt(this, GAME_W / 2, GAME_H / 2 - 14, sub, 8, COLORS.text).setDepth(20).setAlpha(0);
    this.tweens.add({
      targets: [t1, t2],
      alpha: 1,
      duration: 200,
      yoyo: true,
      hold: 1000,
      onComplete: () => {
        t1.destroy();
        t2.destroy();
      },
    });
  }

  private popText(x: number, y: number, value: string, color: string): void {
    const t = txt(this, x, y, value, 6, color).setDepth(15);
    this.tweens.add({ targets: t, y: y - 18, alpha: 0, duration: 600, onComplete: () => t.destroy() });
  }
}
