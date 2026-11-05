import { describe, expect, it } from 'vitest';
import { ITEM_GROWTH_PER_LEVEL, RARITY_MULTIPLIER } from '../config';
import { getItem, getTalent } from '../data';
import type { ItemInstance, Stats } from '../types';
import { computeStats, itemModifiers, talentModifiers } from './stats';

const base: Stats = {
  maxHp: 100,
  attack: 20,
  attackSpeed: 1,
  moveSpeed: 200,
  critChance: 0.1,
  critDamage: 2,
  projectileSpeed: 500,
  dodge: 0,
};

describe('computeStats', () => {
  it('formule : (base + flats) × (1 + pourcentages)', () => {
    const out = computeStats(base, [
      { stat: 'attack', type: 'flat', value: 10 },
      { stat: 'attack', type: 'percent', value: 0.1 },
      { stat: 'attack', type: 'percent', value: 0.1 },
    ]);
    expect(out.attack).toBeCloseTo((20 + 10) * 1.2);
  });

  it('les pourcentages s\'additionnent entre eux (pas de produit)', () => {
    const out = computeStats(base, [
      { stat: 'maxHp', type: 'percent', value: 0.5 },
      { stat: 'maxHp', type: 'percent', value: 0.5 },
    ]);
    expect(out.maxHp).toBeCloseTo(200);
  });

  it('sans modificateur, renvoie la base', () => {
    expect(computeStats(base, [])).toEqual(base);
  });

  it('plafonne le critique à 100 % et l\'esquive à 60 %', () => {
    const out = computeStats(base, [
      { stat: 'critChance', type: 'flat', value: 5 },
      { stat: 'dodge', type: 'flat', value: 5 },
    ]);
    expect(out.critChance).toBe(1);
    expect(out.dodge).toBe(0.6);
  });

  it('un malus de pourcentage ne passe jamais sous zéro', () => {
    expect(computeStats(base, [{ stat: 'attack', type: 'percent', value: -5 }]).attack).toBe(0);
  });
});

describe('itemModifiers', () => {
  const ring = (rarity: ItemInstance['rarity'], level: number): ItemInstance => ({ uid: 'u', defId: 'anneau_loup', rarity, level });

  it('commun niveau 1 : valeur de base', () => {
    const def = getItem('anneau_loup').modifiers[0];
    expect(itemModifiers(ring('common', 1))[0].value).toBeCloseTo(def.value);
  });

  it('la rareté et le niveau multiplient la valeur', () => {
    const def = getItem('anneau_loup').modifiers[0];
    const expected = def.value * RARITY_MULTIPLIER.epic * (1 + ITEM_GROWTH_PER_LEVEL * 4);
    expect(itemModifiers(ring('epic', 5))[0].value).toBeCloseTo(expected);
  });

  it('les malus ne grossissent pas avec la rareté', () => {
    const baton = (rarity: ItemInstance['rarity']): ItemInstance => ({ uid: 'u', defId: 'baton_runique', rarity, level: 1 });
    const malus = (r: ItemInstance['rarity']) => itemModifiers(baton(r)).find((m) => m.value < 0)?.value;
    expect(malus('common')).toBeDefined();
    expect(malus('legendary')).toBe(malus('common'));
  });
});

describe('talentModifiers', () => {
  it('valeur par niveau × niveau, ignore les talents à 0', () => {
    const per = getTalent('t_vigueur').perLevel;
    const mods = talentModifiers({ t_vigueur: 3, t_puissance: 0 });
    expect(mods).toHaveLength(1);
    expect(mods[0].value).toBeCloseTo(per.value * 3);
  });
});
