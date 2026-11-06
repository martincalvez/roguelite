import { describe, expect, it } from 'vitest';
import { FUSION_COUNT } from '../config';
import type { ItemInstance, Rarity } from '../types';
import { fusionResult, fusionTargets, nextRarity, pickFusionInputs } from './fusion';

const item = (uid: string, level = 1, rarity: Rarity = 'common', defId = 'arc'): ItemInstance => ({ uid, defId, rarity, level });

describe('nextRarity', () => {
  it('donne la rareté au-dessus, null à la dernière', () => {
    expect(nextRarity('common')).toBe('rare');
    expect(nextRarity('legendary')).toBe('mythic');
    expect(nextRarity('mythic')).toBeNull();
  });
});

describe('pickFusionInputs', () => {
  it(`exige ${FUSION_COUNT} exemplaires identiques`, () => {
    expect(pickFusionInputs([item('a'), item('b')], 'arc', 'common', new Set())).toBeNull();
    expect(pickFusionInputs([item('a'), item('b'), item('c')], 'arc', 'common', new Set())).toHaveLength(FUSION_COUNT);
  });

  it('ne mélange ni les objets ni les raretés', () => {
    const inv = [item('a'), item('b'), item('c', 1, 'rare'), item('d', 1, 'common', 'baton')];
    expect(pickFusionInputs(inv, 'arc', 'common', new Set())).toBeNull();
  });

  it('refuse la dernière rareté', () => {
    const inv = [item('a', 1, 'mythic'), item('b', 1, 'mythic'), item('c', 1, 'mythic')];
    expect(pickFusionInputs(inv, 'arc', 'mythic', new Set())).toBeNull();
  });

  it('consomme d\'abord les objets non équipés, puis les moins améliorés', () => {
    const inv = [item('a', 5), item('b', 1), item('c', 3), item('d', 2), item('e', 1)];
    const picked = pickFusionInputs(inv, 'arc', 'common', new Set(['b']));
    expect(picked?.map((i) => i.uid)).toEqual(['e', 'd', 'c']); // 'b' est équipé, 'a' est le plus haut niveau
  });

  it('prend un objet équipé s\'il n\'y a pas assez d\'autres exemplaires', () => {
    const inv = [item('a'), item('b'), item('c')];
    const picked = pickFusionInputs(inv, 'arc', 'common', new Set(['a']));
    expect(picked?.map((i) => i.uid).sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('fusionResult', () => {
  it('même objet, rareté supérieure, niveau 1, nouvel identifiant', () => {
    const result = fusionResult([item('a', 4), item('b', 2), item('c')], () => 'new');
    expect(result).toEqual({ uid: 'new', defId: 'arc', rarity: 'rare', level: 1 });
  });

  it('lève une erreur à la rareté maximale', () => {
    expect(() => fusionResult([item('a', 1, 'mythic')], () => 'n')).toThrow();
  });
});

describe('fusionTargets', () => {
  it('liste uniquement les groupes réalisables, dans un ordre stable', () => {
    const inventory = [
      item('a1'), item('a2'), item('a3'),
      item('b1', 1, 'rare', 'baton'), item('b2', 1, 'rare', 'baton'), item('b3', 1, 'rare', 'baton'),
      item('c1', 1, 'mythic', 'arc'), item('c2', 1, 'mythic', 'arc'), item('c3', 1, 'mythic', 'arc'),
    ];
    expect(fusionTargets(inventory, new Set())).toEqual([
      { defId: 'arc', rarity: 'common' },
      { defId: 'baton', rarity: 'rare' },
    ]);
  });
});
