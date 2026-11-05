// Calcul des stats en couches : base du héros + équipement + talents + compétences du run.
// Formule : final = (base + somme des flats) * (1 + somme des percents)
import type { ItemInstance, StatKey, StatModifier, Stats } from '../types';
import { getItem, getTalent } from '../data';
import { ITEM_GROWTH_PER_LEVEL, RARITY_MULTIPLIER } from '../config';

export const STAT_KEYS: StatKey[] = [
  'maxHp',
  'attack',
  'attackSpeed',
  'moveSpeed',
  'critChance',
  'critDamage',
  'projectileSpeed',
  'dodge',
];

/** Modificateurs d'un objet possédé, en tenant compte de sa rareté et de son niveau */
export function itemModifiers(item: ItemInstance): StatModifier[] {
  const def = getItem(item.defId);
  const scale = RARITY_MULTIPLIER[item.rarity] * (1 + ITEM_GROWTH_PER_LEVEL * (item.level - 1));
  return def.modifiers.map((m) =>
    // les malus (valeurs négatives) ne grossissent pas avec la rareté
    m.value < 0 ? m : { ...m, value: m.value * scale },
  );
}

export function talentModifiers(talents: Record<string, number>): StatModifier[] {
  return Object.entries(talents)
    .filter(([, level]) => level > 0)
    .map(([id, level]) => {
      const per = getTalent(id).perLevel;
      return { ...per, value: per.value * level };
    });
}

export function computeStats(base: Stats, modifiers: StatModifier[]): Stats {
  const flat = {} as Stats;
  const percent = {} as Stats;
  for (const k of STAT_KEYS) {
    flat[k] = 0;
    percent[k] = 0;
  }
  for (const m of modifiers) {
    if (m.type === 'flat') flat[m.stat] += m.value;
    else percent[m.stat] += m.value;
  }
  const out = {} as Stats;
  for (const k of STAT_KEYS) {
    out[k] = (base[k] + flat[k]) * Math.max(0, 1 + percent[k]);
  }
  out.critChance = Math.min(out.critChance, 1);
  out.dodge = Math.min(out.dodge, 0.6);
  return out;
}
