// Talents (pur, sans Phaser).
import type { TalentDef } from '../types';

export type TalentState =
  | { kind: 'max' }
  | { kind: 'locked'; requiredLevel: number }
  | { kind: 'poor'; cost: number }
  | { kind: 'ok'; cost: number };

/** État d'un talent pour le joueur : niveau max, verrouillé par le niveau de compte, trop cher, ou achetable. */
export function talentState(def: TalentDef, level: number, gold: number, accountLevel: number): TalentState {
  if (level >= def.maxLevel) return { kind: 'max' };
  if (accountLevel < def.requiredAccountLevel) return { kind: 'locked', requiredLevel: def.requiredAccountLevel };
  const cost = def.costGold[level];
  return gold >= cost ? { kind: 'ok', cost } : { kind: 'poor', cost };
}
