import { describe, expect, it } from 'vitest';
import type { TalentDef } from '../types';
import { talentState } from './talents';

const def: TalentDef = {
  id: 't',
  name: 'T',
  maxLevel: 3,
  requiredAccountLevel: 2,
  costGold: [100, 200, 300],
  perLevel: { stat: 'maxHp', type: 'flat', value: 10 },
};

describe('talentState', () => {
  it('verrouillé tant que le niveau de compte est insuffisant', () => {
    expect(talentState(def, 0, 9999, 1)).toEqual({ kind: 'locked', requiredLevel: 2 });
  });

  it('achetable avec assez d\'or, au prix du niveau suivant', () => {
    expect(talentState(def, 0, 100, 2)).toEqual({ kind: 'ok', cost: 100 });
    expect(talentState(def, 1, 200, 2)).toEqual({ kind: 'ok', cost: 200 });
  });

  it('trop cher quand l\'or manque', () => {
    expect(talentState(def, 1, 199, 2)).toEqual({ kind: 'poor', cost: 200 });
  });

  it('niveau maximum', () => {
    expect(talentState(def, 3, 9999, 5)).toEqual({ kind: 'max' });
  });
});
