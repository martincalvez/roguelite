// Équipement : règles de slots et calcul des différences de stats (pur, sans Phaser).
import type { EquipSlot, ItemSlotType, StatKey, StatModifier, Stats } from '../types';
import { STAT_KEYS } from './stats';

export const EQUIP_SLOTS: EquipSlot[] = ['weapon', 'armor', 'ring1', 'ring2', 'amulet', 'pet'];

/** Un objet de type `itemSlot` peut-il aller dans le slot `slot` ? (un anneau va dans ring1 ou ring2) */
export function slotAccepts(slot: EquipSlot, itemSlot: ItemSlotType): boolean {
  return slot === itemSlot || (itemSlot === 'ring' && (slot === 'ring1' || slot === 'ring2'));
}

/** Slot où équiper un objet : le premier anneau libre, sinon ring1 (qui sera remplacé). */
export function targetSlot(itemSlot: ItemSlotType, equipped: Partial<Record<EquipSlot, string>>): EquipSlot {
  if (itemSlot !== 'ring') return itemSlot;
  if (!equipped.ring1) return 'ring1';
  if (!equipped.ring2) return 'ring2';
  return 'ring1';
}

export interface StatChange {
  stat: StatKey;
  before: number;
  after: number;
}

/** Stats qui changent entre deux jeux de stats. */
export function statDiff(before: Stats, after: Stats): StatChange[] {
  return STAT_KEYS.filter((k) => Math.abs(after[k] - before[k]) > 1e-4).map((k) => ({
    stat: k,
    before: before[k],
    after: after[k],
  }));
}

export const STAT_LABEL: Record<StatKey, string> = {
  maxHp: 'PV',
  attack: 'Attaque',
  attackSpeed: 'Vitesse d\'attaque',
  moveSpeed: 'Vitesse',
  critChance: 'Chance critique',
  critDamage: 'Dégâts critiques',
  projectileSpeed: 'Vitesse des tirs',
  dodge: 'Esquive',
};

const trim = (n: number, digits: number): string => String(Number(n.toFixed(digits)));

/** Valeur d'une stat lisible : % pour critChance et esquive, x pour les dégâts critiques. */
export function formatStat(stat: StatKey, value: number): string {
  if (stat === 'critChance' || stat === 'dodge') return `${trim(value * 100, 1)} %`;
  if (stat === 'critDamage') return `x${trim(value, 2)}`;
  if (stat === 'attackSpeed') return trim(value, 2);
  return String(Math.round(value));
}

/** « +60 PV », « +8 % Attaque », « -25 % Vitesse d'attaque »… */
export function describeModifier(m: StatModifier): string {
  const sign = m.value < 0 ? '-' : '+';
  const abs = Math.abs(m.value);
  const amount = m.type === 'percent' ? `${trim(abs * 100, 1)} %` : formatStat(m.stat, abs);
  return `${sign}${amount} ${STAT_LABEL[m.stat]}`;
}
