import { describe, expect, it } from 'vitest';
import { RARITY_ORDER } from '../config';
import { seededRng } from '../test/rng';
import type { ChestDef, ItemDef } from '../types';
import { canAffordChest, chestRarityWeights, openChest } from './chests';

const items = [{ id: 'x' }, { id: 'y' }, { id: 'z' }] as ItemDef[];
const wood: ChestDef = {
  id: 'bois',
  name: 'Bois',
  costGold: 500,
  rarityWeights: { common: 80, rare: 15, epic: 4, legendary: 1, mythic: 0 },
};
const golden: ChestDef = {
  id: 'dore',
  name: 'Doré',
  costGems: 50,
  minRarity: 'rare',
  rarityWeights: { common: 50, rare: 40, epic: 8, legendary: 2, mythic: 0 },
};

describe('canAffordChest', () => {
  it('compare l\'or ou les gemmes au prix', () => {
    expect(canAffordChest(wood, 500, 0)).toBe(true);
    expect(canAffordChest(wood, 499, 999)).toBe(false);
    expect(canAffordChest(golden, 0, 50)).toBe(true);
    expect(canAffordChest(golden, 99999, 49)).toBe(false);
  });
});

describe('chestRarityWeights', () => {
  it('toutes les raretés sans minimum', () => {
    expect(chestRarityWeights(wood).map((o) => o.rarity)).toEqual(RARITY_ORDER);
  });

  it('retire les raretés sous le minimum', () => {
    expect(chestRarityWeights(golden).map((o) => o.rarity)).toEqual(['rare', 'epic', 'legendary', 'mythic']);
  });
});

describe('openChest', () => {
  it('un coffre avec minimum ne donne jamais une rareté inférieure', () => {
    const rng = seededRng(99);
    for (let i = 0; i < 3000; i++) {
      const item = openChest(golden, items, rng, () => 'u');
      expect(RARITY_ORDER.indexOf(item.rarity)).toBeGreaterThanOrEqual(RARITY_ORDER.indexOf('rare'));
    }
  });

  it('une rareté de poids nul n\'apparaît jamais', () => {
    const rng = seededRng(5);
    for (let i = 0; i < 3000; i++) expect(openChest(wood, items, rng).rarity).not.toBe('mythic');
  });

  it('renvoie un objet niveau 1 de l\'inventaire possible', () => {
    const item = openChest(wood, items, seededRng(1), () => 'abc');
    expect(item).toMatchObject({ uid: 'abc', level: 1 });
    expect(['x', 'y', 'z']).toContain(item.defId);
  });

  it('les raretés fréquentes sortent plus souvent que les rares', () => {
    const rng = seededRng(21);
    const counts: Record<string, number> = {};
    for (let i = 0; i < 4000; i++) {
      const r = openChest(wood, items, rng).rarity;
      counts[r] = (counts[r] ?? 0) + 1;
    }
    expect(counts.common).toBeGreaterThan(counts.rare);
    expect(counts.rare).toBeGreaterThan(counts.epic);
  });
});
