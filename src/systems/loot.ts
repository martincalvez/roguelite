// Tirage du butin de fin de run (pur, sans Phaser). Le hasard est injecté pour pouvoir tester.
import { SCROLL_TYPES } from '../config';
import type { ItemDef, ItemInstance, ItemSlotType, LootConfig, Rarity } from '../types';
import { emptyScrolls } from './upgrade';

/** Choisit un index selon des poids. */
export function weightedIndex(weights: number[], rng: () => number): number {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll < 0) return i;
  }
  return weights.length - 1;
}

let uidCounter = 0;
export function newUid(): string {
  uidCounter++;
  return `${Date.now().toString(36)}-${uidCounter}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Objets lâchés à la fin d'un run : nombre, objet et rareté tirés au sort. */
export function rollLoot(
  config: LootConfig,
  items: ItemDef[],
  victory: boolean,
  rng: () => number = Math.random,
  makeUid: () => string = newUid,
): ItemInstance[] {
  let count = weightedIndex(config.itemCountWeights, rng);
  if (victory) count = Math.max(count, config.victoryMinItems);

  const rarities = Object.keys(config.rarityWeights) as Rarity[];
  const rarityWeights = rarities.map((r) => config.rarityWeights[r]);
  const drops: ItemInstance[] = [];
  for (let i = 0; i < count; i++) {
    const def = items[Math.floor(rng() * items.length)];
    drops.push({ uid: makeUid(), defId: def.id, rarity: rarities[weightedIndex(rarityWeights, rng)], level: 1 });
  }
  return drops;
}

/** Parchemins lâchés à la fin d'un run : nombre au hasard (+ bonus de victoire), type au hasard. */
export function rollScrolls(config: LootConfig, victory: boolean, rng: () => number = Math.random): Record<ItemSlotType, number> {
  const out = emptyScrolls();
  const count = weightedIndex(config.scrollCountWeights, rng) + (victory ? config.victoryScrollBonus : 0);
  for (let i = 0; i < count; i++) out[SCROLL_TYPES[Math.floor(rng() * SCROLL_TYPES.length)]]++;
  return out;
}

/** Gemmes gagnées à la fin d'un run : par boss tué, plus un bonus de victoire. */
export function gemsForRun(config: LootConfig, bossesKilled: number, victory: boolean): number {
  return bossesKilled * config.gemsPerBoss + (victory ? config.gemsVictoryBonus : 0);
}
