import { describe, expect, it } from 'vitest';
import { SCROLL_TYPES } from '../config';
import type { ItemInstance, Rarity } from '../types';
import { canUpgrade, emptyScrolls, maxLevel, upgradeCost } from './upgrade';

const item = (level: number, rarity: Rarity = 'common'): ItemInstance => ({ uid: 'u', defId: 'arc', rarity, level });

describe('upgradeCost', () => {
  it('le coût ne baisse jamais quand le niveau monte', () => {
    for (let level = 1; level < 30; level++) {
      const a = upgradeCost(level);
      const b = upgradeCost(level + 1);
      expect(b.gold).toBeGreaterThanOrEqual(a.gold);
      expect(b.scrolls).toBeGreaterThanOrEqual(a.scrolls);
    }
  });

  it('coûte toujours au moins 1 parchemin et de l\'or', () => {
    const c = upgradeCost(1);
    expect(c.scrolls).toBeGreaterThanOrEqual(1);
    expect(c.gold).toBeGreaterThan(0);
  });
});

describe('maxLevel', () => {
  it('augmente avec la rareté', () => {
    expect(maxLevel('rare')).toBeGreaterThan(maxLevel('common'));
    expect(maxLevel('mythic')).toBeGreaterThan(maxLevel('legendary'));
  });
});

describe('canUpgrade', () => {
  const cost = upgradeCost(3);

  it('ok quand on a assez d\'or et de parchemins', () => {
    expect(canUpgrade(item(3), cost.gold, cost.scrolls)).toEqual({ ok: true });
  });

  it('indique la raison du refus', () => {
    expect(canUpgrade(item(3), cost.gold - 1, cost.scrolls)).toEqual({ ok: false, reason: 'gold' });
    expect(canUpgrade(item(3), cost.gold, cost.scrolls - 1)).toEqual({ ok: false, reason: 'scrolls' });
    expect(canUpgrade(item(maxLevel('common')), 99999, 999)).toEqual({ ok: false, reason: 'max' });
  });

  it('le niveau max passe avant le reste', () => {
    expect(canUpgrade(item(maxLevel('rare'), 'rare'), 0, 0)).toEqual({ ok: false, reason: 'max' });
  });
});

describe('emptyScrolls', () => {
  it('un compteur à zéro par type', () => {
    const s = emptyScrolls();
    expect(Object.keys(s).sort()).toEqual([...SCROLL_TYPES].sort());
    expect(Object.values(s).every((v) => v === 0)).toBe(true);
  });
});
