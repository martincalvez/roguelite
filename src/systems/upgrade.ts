// Amélioration d'objet (pur, sans Phaser).
import { SCROLL_TYPES } from '../config';
import { UPGRADE } from '../data';
import type { ItemInstance, ItemSlotType, Rarity } from '../types';

export function emptyScrolls(): Record<ItemSlotType, number> {
  const out = {} as Record<ItemSlotType, number>;
  for (const t of SCROLL_TYPES) out[t] = 0;
  return out;
}

export function maxLevel(rarity: Rarity): number {
  return UPGRADE.maxLevelByRarity[rarity];
}

/** Coût du passage du niveau `level` au suivant. */
export function upgradeCost(level: number): { gold: number; scrolls: number } {
  return {
    gold: Math.round(UPGRADE.goldBase * Math.pow(UPGRADE.goldGrowth, level - 1)),
    scrolls: Math.ceil(UPGRADE.scrollBase + UPGRADE.scrollPerLevel * (level - 1)),
  };
}

export type UpgradeCheck = { ok: true } | { ok: false; reason: 'max' | 'gold' | 'scrolls' };

export function canUpgrade(item: ItemInstance, gold: number, scrollsOfType: number): UpgradeCheck {
  if (item.level >= maxLevel(item.rarity)) return { ok: false, reason: 'max' };
  const cost = upgradeCost(item.level);
  if (gold < cost.gold) return { ok: false, reason: 'gold' };
  if (scrollsOfType < cost.scrolls) return { ok: false, reason: 'scrolls' };
  return { ok: true };
}
