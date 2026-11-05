import { describe, expect, it } from 'vitest';
import { PROGRESSION } from '../data';
import { accountXpForRun, accountXpToNext, xpToNextLevel } from './progression';

describe('XP du run', () => {
  const table = PROGRESSION.xpPerLevel;

  it('le niveau 1 demande la première valeur de la table', () => {
    expect(xpToNextLevel(1)).toBe(table[0]);
    expect(xpToNextLevel(table.length)).toBe(table[table.length - 1]);
  });

  it('au-delà de la table, la dernière valeur se répète', () => {
    expect(xpToNextLevel(table.length + 5)).toBe(table[table.length - 1]);
  });

  it('la courbe ne baisse jamais', () => {
    for (let i = 1; i < table.length; i++) expect(table[i]).toBeGreaterThanOrEqual(table[i - 1]);
  });
});

describe('XP de compte', () => {
  it('même principe : valeur de la table, puis la dernière', () => {
    expect(accountXpToNext(1)).toBe(PROGRESSION.accountXpPerLevel[0]);
    expect(accountXpToNext(999)).toBe(PROGRESSION.accountXpPerLevel[PROGRESSION.accountXpPerLevel.length - 1]);
  });

  it('un run rapporte l\'XP des salles terminées, plus le bonus de victoire', () => {
    expect(accountXpForRun(0, false)).toBe(0);
    expect(accountXpForRun(7, false)).toBe(7 * PROGRESSION.accountXpPerRoom);
    expect(accountXpForRun(20, true)).toBe(20 * PROGRESSION.accountXpPerRoom + PROGRESSION.accountXpVictoryBonus);
  });
});
