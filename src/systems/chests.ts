// Coffres (pur, sans Phaser).
import { RARITY_ORDER } from '../config';
import type { ChestDef, ItemDef, ItemInstance, Rarity } from '../types';
import { newUid, weightedIndex } from './loot';

/** Le joueur peut-il payer ce coffre ? */
export function canAffordChest(chest: ChestDef, gold: number, gems: number): boolean {
  return gold >= (chest.costGold ?? 0) && gems >= (chest.costGems ?? 0);
}

/** Raretés possibles et leurs poids, en retirant celles sous la rareté minimale du coffre. */
export function chestRarityWeights(chest: ChestDef): { rarity: Rarity; weight: number }[] {
  const min = chest.minRarity ? RARITY_ORDER.indexOf(chest.minRarity) : 0;
  return RARITY_ORDER.filter((_, i) => i >= min).map((rarity) => ({ rarity, weight: chest.rarityWeights[rarity] }));
}

/** Tire l'objet d'un coffre : objet uniforme parmi `items`, rareté pondérée (jamais sous la rareté minimale). */
export function openChest(
  chest: ChestDef,
  items: ItemDef[],
  rng: () => number = Math.random,
  makeUid: () => string = newUid,
): ItemInstance {
  const odds = chestRarityWeights(chest);
  const rarity = odds[weightedIndex(odds.map((o) => o.weight), rng)].rarity;
  const def = items[Math.floor(rng() * items.length)];
  return { uid: makeUid(), defId: def.id, rarity, level: 1 };
}
