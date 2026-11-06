import { describe, expect, it } from 'vitest';
import { LUCKY_WHEEL, PROGRESSION } from '../data';
import { pickLuckyWheelReward } from './luckyWheel';

describe('roue de départ', () => {
  it('renvoie toujours une récompense définie', () => {
    for (const value of [0, 0.12, 0.5, 0.99]) {
      expect(LUCKY_WHEEL.rewards).toContain(pickLuckyWheelReward(LUCKY_WHEEL.rewards, () => value));
    }
  });

  it('refuse une roue sans poids', () => {
    expect(() => pickLuckyWheelReward([], Math.random)).toThrow();
  });

  it('ne déclenche pas un niveau avant le début de la partie', () => {
    const maxXp = Math.max(...LUCKY_WHEEL.rewards.filter((reward) => reward.kind === 'xp').map((reward) => reward.value));
    expect(maxXp).toBeLessThan(PROGRESSION.xpPerLevel[0]);
  });
});
