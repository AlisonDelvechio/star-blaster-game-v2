import Phaser from "phaser";
import { GAME_W } from "../config";
import { ENEMIES, type EnemyKind } from "../objects/Enemy";

export const WAVES_PER_SECTOR = 5; // the last one is the boss

export interface SquadSpawn {
  kind: EnemyKind;
  x: number;
  y: number;
  targetY: number;
  phase: number;
}

/** A squad is a group of enemies that arrives together. */
export type Squad = SquadSpawn[];

/** Overall difficulty level for a sector/wave pair (0-based, grows forever). */
export function difficulty(sector: number, wave: number): number {
  return (sector - 1) * (WAVES_PER_SECTOR - 1) + (wave - 1);
}

export function isBossWave(wave: number): boolean {
  return wave === WAVES_PER_SECTOR;
}

/** Builds the squads for a normal wave, spending a budget that grows with difficulty. */
export function buildWave(level: number): Squad[] {
  let budget = 7 + level * 2.4;
  const kinds = (Object.keys(ENEMIES) as EnemyKind[]).filter((k) => ENEMIES[k].minLevel <= level);
  const squads: Squad[] = [];

  while (budget > 0.9) {
    const kind = Phaser.Math.RND.pick(kinds);
    const squad = makeSquad(kind, level);
    budget -= squad.length * ENEMIES[kind].cost;
    squads.push(squad);
  }
  return squads;
}

function makeSquad(kind: EnemyKind, level: number): Squad {
  const rnd = Phaser.Math.RND;
  switch (kind) {
    case "drone": {
      const count = Math.min(6, 3 + Math.floor(level / 3));
      const gap = 46;
      const startX = GAME_W / 2 - ((count - 1) * gap) / 2 + rnd.between(-20, 20);
      const targetY = rnd.between(70, 190);
      return Array.from({ length: count }, (_, i) => ({
        kind,
        x: startX + i * gap,
        y: -20 - (i % 2) * 14,
        targetY: targetY + (i % 2) * 14,
        phase: 0,
      }));
    }
    case "zigzag": {
      const count = 3 + Math.min(3, Math.floor(level / 4));
      const x = rnd.between(90, GAME_W - 90);
      return Array.from({ length: count }, (_, i) => ({
        kind,
        x,
        y: -20 - i * 34,
        targetY: 0,
        phase: i * 0.5,
      }));
    }
    case "gunner": {
      const count = level >= 8 ? 3 : 2;
      return Array.from({ length: count }, (_, i) => ({
        kind,
        x: ((i + 1) * GAME_W) / (count + 1),
        y: -20,
        targetY: rnd.between(60, 150),
        phase: 0,
      }));
    }
    case "diver": {
      const count = 2 + Math.min(3, Math.floor(level / 5));
      return Array.from({ length: count }, () => ({
        kind,
        x: rnd.between(30, GAME_W - 30),
        y: rnd.between(-60, -20),
        targetY: rnd.between(70, 160),
        phase: 0,
      }));
    }
    case "tank":
      return [{ kind, x: rnd.between(80, GAME_W - 80), y: -30, targetY: 0, phase: rnd.frac() * 6 }];
  }
}
