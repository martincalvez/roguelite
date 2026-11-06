import type { LuckyWheelReward } from '../types';

/** Tirage pondéré, isolé pour que la roue reste testable sans Phaser. */
export function pickLuckyWheelReward(rewards: LuckyWheelReward[], rng: () => number): LuckyWheelReward {
  const total = rewards.reduce((sum, reward) => sum + reward.weight, 0);
  if (total <= 0 || rewards.length === 0) throw new Error('La roue doit contenir au moins une récompense pondérée.');
  let cursor = rng() * total;
  for (const reward of rewards) {
    cursor -= reward.weight;
    if (cursor < 0) return reward;
  }
  return rewards[rewards.length - 1];
}
