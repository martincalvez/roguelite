import { describe, expect, it } from 'vitest';
import type { Stats } from '../types';
import { describeModifier, EQUIP_SLOTS, formatStat, slotAccepts, statDiff, targetSlot } from './equipment';

const stats = (over: Partial<Stats> = {}): Stats => ({
  maxHp: 200,
  attack: 30,
  attackSpeed: 1.6,
  moveSpeed: 300,
  critChance: 0.05,
  critDamage: 2,
  projectileSpeed: 650,
  dodge: 0,
  ...over,
});

describe('slots', () => {
  it('il y a 6 slots', () => {
    expect(EQUIP_SLOTS).toHaveLength(6);
  });

  it('un anneau va dans ring1 ou ring2, rien d\'autre ne va dans un anneau', () => {
    expect(slotAccepts('ring1', 'ring')).toBe(true);
    expect(slotAccepts('ring2', 'ring')).toBe(true);
    expect(slotAccepts('ring1', 'weapon')).toBe(false);
    expect(slotAccepts('weapon', 'ring')).toBe(false);
    expect(slotAccepts('armor', 'armor')).toBe(true);
  });

  it('targetSlot : premier anneau libre, sinon ring1 (remplacé)', () => {
    expect(targetSlot('ring', {})).toBe('ring1');
    expect(targetSlot('ring', { ring1: 'a' })).toBe('ring2');
    expect(targetSlot('ring', { ring2: 'b' })).toBe('ring1');
    expect(targetSlot('ring', { ring1: 'a', ring2: 'b' })).toBe('ring1');
    expect(targetSlot('weapon', { weapon: 'w' })).toBe('weapon');
  });
});

describe('statDiff', () => {
  it('ne liste que les stats qui changent', () => {
    const diff = statDiff(stats(), stats({ attack: 40, dodge: 0.04 }));
    expect(diff.map((d) => d.stat).sort()).toEqual(['attack', 'dodge']);
    expect(diff.find((d) => d.stat === 'attack')).toEqual({ stat: 'attack', before: 30, after: 40 });
  });

  it('aucune différence si identique', () => {
    expect(statDiff(stats(), stats())).toEqual([]);
  });
});

describe('affichage des stats', () => {
  it('formate selon le type de stat', () => {
    expect(formatStat('critChance', 0.05)).toBe('5 %');
    expect(formatStat('dodge', 0.045)).toBe('4.5 %');
    expect(formatStat('critDamage', 2)).toBe('x2');
    expect(formatStat('attackSpeed', 1.6)).toBe('1.6');
    expect(formatStat('maxHp', 215.4)).toBe('215');
  });

  it('décrit un modificateur avec son signe', () => {
    expect(describeModifier({ stat: 'maxHp', type: 'flat', value: 60 })).toBe('+60 PV');
    expect(describeModifier({ stat: 'attack', type: 'percent', value: 0.08 })).toBe('+8 % Attaque');
    expect(describeModifier({ stat: 'attackSpeed', type: 'percent', value: -0.25 })).toBe("-25 % Vitesse d'attaque");
    expect(describeModifier({ stat: 'critChance', type: 'flat', value: 0.05 })).toBe('+5 % Chance critique');
  });
});
