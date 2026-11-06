import { describe, expect, it } from 'vitest';
import { bossPatternAt, ringAngles, spreadAngles } from './bossPatterns';

describe('boucles d’attaque des boss', () => {
  it('répète une boucle déclarée sans créer de motif implicite', () => {
    const cycle = ['charge', 'lobBarrage', 'volley'] as const;
    expect(bossPatternAt(cycle, 0)).toBe('charge');
    expect(bossPatternAt(cycle, 4)).toBe('lobBarrage');
  });

  it('répartit les salves et les cercles de façon régulière', () => {
    expect(spreadAngles(0, 3, 60).map((angle) => Math.round(angle * 1000) / 1000)).toEqual([-0.524, 0, 0.524]);
    expect(ringAngles(4).map((angle) => Math.round(angle * 1000) / 1000)).toEqual([0, 1.571, 3.142, 4.712]);
  });
});
