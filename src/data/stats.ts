export interface Stats {
  maxHp: number;
  /** Movement speed in px/s. */
  speed: number;
  /** Shots per second. */
  fireRate: number;
  damage: number;
  bulletSpeed: number;
  /** Projectiles per volley. */
  shots: number;
  /** Degrees between projectiles in a volley. */
  spread: number;
  /** Extra enemies a bullet can pass through. */
  pierce: number;
  critChance: number;
  critMult: number;
  /** Hits the shield absorbs before breaking. */
  shieldMax: number;
  /** Seconds for one shield charge to come back. */
  shieldRecharge: number;
  drones: number;
  /** Missiles per volley (0 = none). */
  missiles: number;
  missileInterval: number;
  /** Pickup attraction radius. */
  magnet: number;
  creditMult: number;
  /** Chance of healing 1 HP on kill. */
  healOnKill: number;
  /** Shockwave when taking damage. */
  pulse: boolean;
  /** Invulnerability seconds after a hit. */
  invuln: number;
}

export const BASE_STATS: Stats = {
  maxHp: 4,
  speed: 210,
  fireRate: 5,
  damage: 10,
  bulletSpeed: 520,
  shots: 1,
  spread: 8,
  pierce: 0,
  critChance: 0.05,
  critMult: 2,
  shieldMax: 0,
  shieldRecharge: 10,
  drones: 0,
  missiles: 0,
  missileInterval: 2.6,
  magnet: 60,
  creditMult: 1,
  healOnKill: 0,
  pulse: false,
  invuln: 1.2,
};
