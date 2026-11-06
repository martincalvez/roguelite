import type { BossAttackPattern } from '../types';

/** Choisit l'attaque suivante dans une boucle de boss déclarée dans les données. */
export function bossPatternAt(patterns: readonly BossAttackPattern[], index: number): BossAttackPattern {
  if (patterns.length === 0) throw new Error('Un boss doit avoir au moins une attaque');
  return patterns[((index % patterns.length) + patterns.length) % patterns.length];
}

/** Angles régulièrement répartis autour d'un angle central. */
export function spreadAngles(center: number, count: number, spreadDegrees: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [center];
  const spread = (spreadDegrees * Math.PI) / 180;
  return Array.from({ length: count }, (_, index) => center + (index / (count - 1) - 0.5) * spread);
}

/** Angles d'un cercle complet de projectiles. */
export function ringAngles(count: number): number[] {
  if (count <= 0) return [];
  return Array.from({ length: count }, (_, index) => (index / count) * Math.PI * 2);
}
