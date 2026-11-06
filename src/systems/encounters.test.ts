import { describe, expect, it } from 'vitest';
import { ENCOUNTERS } from '../data';
import type { RoomDef } from '../types';
import { planEncounter, splitCount } from './encounters';

const combatRoom: RoomDef = {
  type: 'combat',
  enemies: [{ id: 'gobelin', count: 7 }, { id: 'archer_squelette', count: 3 }],
};

describe('rencontres par vagues', () => {
  it('conserve exactement chaque groupe d’ennemis', () => {
    for (const profile of ENCOUNTERS.profiles) {
      const waves = planEncounter({ ...combatRoom, encounter: profile.id }, 0, 'campaign', ENCOUNTERS);
      expect(waves.flatMap((wave) => wave.enemies).filter((group) => group.id === 'gobelin').reduce((sum, group) => sum + group.count, 0)).toBe(7);
      expect(waves.flatMap((wave) => wave.enemies).filter((group) => group.id === 'archer_squelette').reduce((sum, group) => sum + group.count, 0)).toBe(3);
    }
  });

  it('garde le premier renfort au début et des arrivées différées pour les profils concernés', () => {
    const waves = planEncounter({ ...combatRoom, encounter: 'embuscade' }, 0, 'campaign', ENCOUNTERS);
    expect(waves[0].delayMs).toBe(0);
    expect(waves.some((wave) => wave.delayMs > 0 && wave.spawnPattern === 'behind')).toBe(true);
    expect(waves.filter((wave) => wave.delayMs > 0).every((wave) => wave.telegraphMs > 0)).toBe(true);
  });

  it('utilise le duel pour les mini-boss et les boss', () => {
    const waves = planEncounter({ type: 'boss', enemies: [{ id: 'liche', count: 1 }] }, 19, 'campaign', ENCOUNTERS);
    expect(waves).toHaveLength(1);
    expect(waves[0].enemies).toEqual([{ id: 'liche', count: 1 }]);
  });

  it('répartit les entiers sans en créer ni en perdre', () => {
    expect(splitCount(1, [0.5, 0.2, 0.3])).toEqual([1, 0, 0]);
    expect(splitCount(7, [0.4, 0.35, 0.25]).reduce((sum, count) => sum + count, 0)).toBe(7);
  });

  it('conserve le statut de champion lorsqu’un groupe est envoyé en renfort', () => {
    const waves = planEncounter({ type: 'combat', encounter: 'embuscade', enemies: [{ id: 'esprit_saphir', count: 1, elite: true }] }, 0, 'campaign', ENCOUNTERS);
    expect(waves.flatMap((wave) => wave.enemies)).toEqual([{ id: 'esprit_saphir', count: 1, elite: true }]);
  });
});
