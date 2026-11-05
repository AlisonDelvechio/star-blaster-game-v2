import Phaser from "phaser";
import type { Stats } from "./stats";

export type Rarity = "common" | "rare" | "epic";

/** Mutable state of the current run that upgrades can touch. */
export interface RunState {
  stats: Stats;
  hp: number;
  shield: number;
  picks: Record<string, number>;
}

export interface Upgrade {
  id: string;
  name: string;
  desc: string;
  rarity: Rarity;
  max?: number;
  apply(run: RunState): void;
  available?(run: RunState): boolean;
}

export const UPGRADES: Upgrade[] = [
  {
    id: "damage",
    name: "Heavy Rounds",
    desc: "+20% damage",
    rarity: "common",
    apply: (r) => (r.stats.damage *= 1.2),
  },
  {
    id: "firerate",
    name: "Hair Trigger",
    desc: "+15% fire rate",
    rarity: "common",
    apply: (r) => (r.stats.fireRate *= 1.15),
  },
  {
    id: "speed",
    name: "Afterburners",
    desc: "+12% move speed",
    rarity: "common",
    max: 4,
    apply: (r) => (r.stats.speed *= 1.12),
  },
  {
    id: "hull",
    name: "Hull Plating",
    desc: "+1 max HP and heal 1",
    rarity: "common",
    max: 4,
    apply: (r) => {
      r.stats.maxHp += 1;
      r.hp = Math.min(r.stats.maxHp, r.hp + 1);
    },
  },
  {
    id: "repair",
    name: "Field Repair",
    desc: "Heal 2 HP",
    rarity: "common",
    apply: (r) => (r.hp = Math.min(r.stats.maxHp, r.hp + 2)),
    available: (r) => r.hp < r.stats.maxHp,
  },
  {
    id: "crit",
    name: "Targeting Chip",
    desc: "+10% crit chance",
    rarity: "common",
    max: 5,
    apply: (r) => (r.stats.critChance += 0.1),
  },
  {
    id: "magnet",
    name: "Tractor Beam",
    desc: "+60% pickup range",
    rarity: "common",
    max: 3,
    apply: (r) => (r.stats.magnet *= 1.6),
  },
  {
    id: "velocity",
    name: "Rail Accelerator",
    desc: "+25% bullet speed, +8% damage",
    rarity: "common",
    max: 3,
    apply: (r) => {
      r.stats.bulletSpeed *= 1.25;
      r.stats.damage *= 1.08;
    },
  },
  {
    id: "multishot",
    name: "Split Barrel",
    desc: "+1 projectile per shot",
    rarity: "rare",
    max: 4,
    apply: (r) => (r.stats.shots += 1),
  },
  {
    id: "pierce",
    name: "Phase Rounds",
    desc: "Bullets pierce +1 enemy",
    rarity: "rare",
    max: 3,
    apply: (r) => (r.stats.pierce += 1),
  },
  {
    id: "shield",
    name: "Energy Shield",
    desc: "Absorbs 1 hit, recharges",
    rarity: "rare",
    max: 3,
    apply: (r) => {
      if (r.stats.shieldMax > 0) r.stats.shieldRecharge *= 0.75;
      r.stats.shieldMax += 1;
      r.shield = r.stats.shieldMax;
    },
  },
  {
    id: "critdmg",
    name: "Overcharge",
    desc: "Crits deal +75% damage",
    rarity: "rare",
    max: 3,
    apply: (r) => (r.stats.critMult += 0.75),
  },
  {
    id: "pulse",
    name: "Panic Pulse",
    desc: "Getting hit releases a shockwave",
    rarity: "rare",
    max: 1,
    apply: (r) => (r.stats.pulse = true),
  },
  {
    id: "vampire",
    name: "Nanite Leech",
    desc: "4% chance to heal on kill",
    rarity: "rare",
    max: 3,
    apply: (r) => (r.stats.healOnKill += 0.04),
  },
  {
    id: "drone",
    name: "Wingman Drone",
    desc: "An orbiting drone fires with you",
    rarity: "epic",
    max: 3,
    apply: (r) => (r.stats.drones += 1),
  },
  {
    id: "missiles",
    name: "Seeker Missiles",
    desc: "Fire homing missiles",
    rarity: "epic",
    max: 3,
    apply: (r) => {
      r.stats.missiles += 1;
      r.stats.missileInterval *= 0.85;
    },
  },
  {
    id: "overdrive",
    name: "Overdrive Core",
    desc: "+30% fire rate, +15% damage",
    rarity: "epic",
    max: 2,
    apply: (r) => {
      r.stats.fireRate *= 1.3;
      r.stats.damage *= 1.15;
    },
  },
];

const RARITY_WEIGHT: Record<Rarity, number> = { common: 62, rare: 28, epic: 10 };

/** Picks `count` distinct upgrades, weighted by rarity. */
export function rollUpgrades(
  run: RunState,
  count: number,
  luck: number,
  minRarity: Rarity = "common",
): Upgrade[] {
  const order: Rarity[] = ["common", "rare", "epic"];
  const minIdx = order.indexOf(minRarity);
  const pool = UPGRADES.filter((u) => {
    if (order.indexOf(u.rarity) < minIdx) return false;
    if (u.max !== undefined && (run.picks[u.id] ?? 0) >= u.max) return false;
    return u.available ? u.available(run) : true;
  });

  const weight = (u: Upgrade) => {
    const w = RARITY_WEIGHT[u.rarity];
    if (u.rarity === "common") return Math.max(20, w - luck * 8);
    return w + luck * 4;
  };

  const picked: Upgrade[] = [];
  while (picked.length < count && pool.length > 0) {
    const total = pool.reduce((sum, u) => sum + weight(u), 0);
    let roll = Phaser.Math.FloatBetween(0, total);
    let idx = 0;
    for (; idx < pool.length - 1; idx++) {
      roll -= weight(pool[idx]);
      if (roll <= 0) break;
    }
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}
