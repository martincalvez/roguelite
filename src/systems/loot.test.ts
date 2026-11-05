import { describe, expect, it } from 'vitest';
import { fixedRng, seededRng } from '../test/rng';
import type { ItemDef, LootConfig } from '../types';
import { gemsForRun, rollLoot, rollScrolls, weightedIndex } from './loot';

const config: LootConfig = {
  itemCountWeights: [1, 0, 0],
  victoryMinItems: 1,
  rarityWeights: { common: 1, rare: 0, epic: 0, legendary: 0, mythic: 0 },
  scrollCountWeights: [1],
  victoryScrollBonus: 3,
  gemsPerBoss: 8,
  gemsVictoryBonus: 30,
};
const items = [{ id: 'x' }, { id: 'y' }] as ItemDef[];
const uids = () => {
  let n = 0;
  return () => `uid${n++}`;
};

describe('weightedIndex', () => {
  it('choisit selon les poids', () => {
    expect(weightedIndex([1, 1, 2], () => 0)).toBe(0);
    expect(weightedIndex([1, 1, 2], () => 0.3)).toBe(1);
    expect(weightedIndex([1, 1, 2], () => 0.9)).toBe(2);
  });

  it('un poids nul n\'est jamais choisi', () => {
    const rng = seededRng(7);
    for (let i = 0; i < 500; i++) expect(weightedIndex([1, 0, 1], rng)).not.toBe(1);
  });
});

describe('rollLoot', () => {
  it("défaite : peut ne rien lâcher", () => {
    expect(rollLoot(config, items, false, () => 0, uids())).toEqual([]);
  });

  it('victoire : au moins victoryMinItems objets', () => {
    const drops = rollLoot(config, items, true, () => 0, uids());
    expect(drops).toHaveLength(1);
    expect(drops[0]).toMatchObject({ rarity: 'common', level: 1 });
  });

  it('les objets ont des identifiants uniques et un niveau 1', () => {
    const many: LootConfig = { ...config, itemCountWeights: [0, 0, 1] };
    const drops = rollLoot(many, items, false, seededRng(3), uids());
    expect(drops).toHaveLength(2);
    expect(new Set(drops.map((d) => d.uid)).size).toBe(2);
  });

  it('respecte les raretés pondérées sur un grand nombre de tirages', () => {
    const cfg: LootConfig = { ...config, itemCountWeights: [0, 1], rarityWeights: { common: 3, rare: 1, epic: 0, legendary: 0, mythic: 0 } };
    const rng = seededRng(11);
    let rare = 0;
    for (let i = 0; i < 4000; i++) if (rollLoot(cfg, items, false, rng, uids())[0].rarity === 'rare') rare++;
    expect(rare / 4000).toBeGreaterThan(0.2);
    expect(rare / 4000).toBeLessThan(0.3);
  });
});

describe('rollScrolls', () => {
  const total = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

  it('défaite sans parchemin si le tirage donne 0', () => {
    expect(total(rollScrolls(config, false, () => 0))).toBe(0);
  });

  it('victoire : le bonus s\'ajoute', () => {
    expect(total(rollScrolls(config, true, seededRng(5)))).toBe(config.victoryScrollBonus);
  });

  it('couvre tous les types de parchemins', () => {
    expect(Object.keys(rollScrolls(config, true, seededRng(1))).sort()).toEqual(['amulet', 'armor', 'pet', 'ring', 'weapon']);
  });
});

describe('gemsForRun', () => {
  it('compte les boss tués et le bonus de victoire', () => {
    expect(gemsForRun(config, 0, false)).toBe(0);
    expect(gemsForRun(config, 2, false)).toBe(16);
    expect(gemsForRun(config, 2, true)).toBe(46);
  });
});

describe('fixedRng', () => {
  it('répète la dernière valeur', () => {
    const r = fixedRng(0.1, 0.9);
    expect([r(), r(), r()]).toEqual([0.1, 0.9, 0.9]);
  });
});
