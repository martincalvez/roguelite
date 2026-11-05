import type { HeroDef } from '../types';

/** Vérifie les conditions d'un déblocage ; les gemmes restent débitées par GameState. */
export function canUnlockHero(hero: Pick<HeroDef, 'id' | 'unlockCostGems'>, unlockedHeroIds: readonly string[], gems: number): boolean {
  return !unlockedHeroIds.includes(hero.id) && gems >= hero.unlockCostGems;
}
