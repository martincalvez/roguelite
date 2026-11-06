// Fusion d'objets (pur, sans Phaser).
import { FUSION_COUNT, RARITY_ORDER } from '../config';
import type { ItemInstance, Rarity } from '../types';

export interface FusionTarget {
  defId: string;
  rarity: Rarity;
}

/** Rareté au-dessus, ou null si c'est déjà la dernière. */
export function nextRarity(rarity: Rarity): Rarity | null {
  return RARITY_ORDER[RARITY_ORDER.indexOf(rarity) + 1] ?? null;
}

/**
 * Les FUSION_COUNT objets à consommer (même objet, même rareté), ou null si la fusion est impossible.
 * On consomme d'abord les objets non équipés, puis les moins améliorés.
 */
export function pickFusionInputs(
  inventory: ItemInstance[],
  defId: string,
  rarity: Rarity,
  equippedUids: Set<string>,
): ItemInstance[] | null {
  if (nextRarity(rarity) === null) return null;
  const same = inventory.filter((i) => i.defId === defId && i.rarity === rarity);
  if (same.length < FUSION_COUNT) return null;
  same.sort((a, b) => Number(equippedUids.has(a.uid)) - Number(equippedUids.has(b.uid)) || a.level - b.level);
  return same.slice(0, FUSION_COUNT);
}

/** Toutes les combinaisons immédiatement fusionnables, triées de la rareté la plus basse à la plus haute. */
export function fusionTargets(inventory: ItemInstance[], equippedUids: Set<string>): FusionTarget[] {
  const seen = new Set<string>();
  const targets: FusionTarget[] = [];
  for (const item of inventory) {
    const key = `${item.defId}:${item.rarity}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (pickFusionInputs(inventory, item.defId, item.rarity, equippedUids)) {
      targets.push({ defId: item.defId, rarity: item.rarity });
    }
  }
  return targets.sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity) || a.defId.localeCompare(b.defId));
}

/** L'objet obtenu : même objet, rareté supérieure, niveau 1. */
export function fusionResult(inputs: ItemInstance[], makeUid: () => string): ItemInstance {
  const next = nextRarity(inputs[0].rarity);
  if (next === null) throw new Error('Rareté maximale : fusion impossible');
  return { uid: makeUid(), defId: inputs[0].defId, rarity: next, level: 1 };
}
