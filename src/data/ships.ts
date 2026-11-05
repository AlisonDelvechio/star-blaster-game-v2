import { BASE_STATS, type Stats } from "./stats";
import { metaLevel } from "../systems/save";

export interface ShipDef {
  id: string;
  name: string;
  texture: string;
  tagline: string;
  cost: number;
  stats: Partial<Stats>;
}

export const SHIPS: ShipDef[] = [
  {
    id: "falcon",
    name: "FALCON",
    texture: "ship-falcon",
    tagline: "Balanced all-rounder",
    cost: 0,
    stats: {},
  },
  {
    id: "viper",
    name: "VIPER",
    texture: "ship-viper",
    tagline: "Fast, fragile, deadly crits",
    cost: 120,
    stats: { maxHp: 3, speed: 270, fireRate: 7, damage: 8, critChance: 0.15 },
  },
  {
    id: "bulwark",
    name: "BULWARK",
    texture: "ship-bulwark",
    tagline: "Heavy hull with a shield",
    cost: 250,
    stats: { maxHp: 6, speed: 175, fireRate: 4, damage: 14, shieldMax: 1 },
  },
  {
    id: "nova",
    name: "NOVA",
    texture: "ship-nova",
    tagline: "Triple spread shot",
    cost: 400,
    stats: { maxHp: 4, speed: 200, fireRate: 3.6, damage: 8, shots: 3, spread: 12 },
  },
];

export function getShip(id: string): ShipDef {
  return SHIPS.find((s) => s.id === id) ?? SHIPS[0];
}

/** Starting stats for a run: base + ship + permanent hangar upgrades. */
export function startingStats(ship: ShipDef): Stats {
  const s: Stats = { ...BASE_STATS, ...ship.stats };
  s.maxHp += metaLevel("hull");
  s.damage *= 1 + 0.08 * metaLevel("weapons");
  s.speed *= 1 + 0.06 * metaLevel("engines");
  s.creditMult *= 1 + 0.15 * metaLevel("salvage");
  s.magnet *= 1 + 0.25 * metaLevel("magnet");
  return s;
}
