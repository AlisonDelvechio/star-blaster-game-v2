/** Permanent upgrades bought in the hangar with credits. */
export interface MetaUpgrade {
  id: string;
  name: string;
  desc: string;
  max: number;
  baseCost: number;
}

export const META_UPGRADES: MetaUpgrade[] = [
  { id: "hull", name: "REINFORCED HULL", desc: "+1 starting HP", max: 3, baseCost: 60 },
  { id: "weapons", name: "WEAPON TUNING", desc: "+8% damage", max: 5, baseCost: 40 },
  { id: "engines", name: "ENGINE TUNING", desc: "+6% speed", max: 3, baseCost: 35 },
  { id: "salvage", name: "SALVAGE RIGS", desc: "+15% credits", max: 4, baseCost: 50 },
  { id: "magnet", name: "WIDE COLLECTOR", desc: "+25% pickup range", max: 2, baseCost: 30 },
  { id: "reroll", name: "TACTICAL UPLINK", desc: "+1 upgrade reroll", max: 3, baseCost: 70 },
  { id: "luck", name: "LUCKY STARS", desc: "Rarer upgrades", max: 3, baseCost: 80 },
];

export function metaCost(m: MetaUpgrade, level: number): number {
  return Math.round(m.baseCost * (1 + level * 0.9));
}
