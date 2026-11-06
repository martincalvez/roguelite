// Courbe d'XP du run (pure, sans Phaser).
import { PROGRESSION } from '../data';

/** XP nécessaire pour passer du niveau `level` au suivant. */
export function xpToNextLevel(level: number): number {
  const table = PROGRESSION.xpPerLevel;
  const index = Math.max(0, level - 1);
  if (index < table.length) return table[index];
  // La courbe continue au lieu de répéter le dernier palier : les longues runs
  // gardent leurs choix de compétence sans déclencher dix niveaux d'affilée.
  return Math.round(table[table.length - 1] * PROGRESSION.xpGrowthAfterTable ** (index - table.length + 1));
}

/** XP de compte nécessaire pour passer du niveau `level` au suivant. */
export function accountXpToNext(level: number): number {
  const table = PROGRESSION.accountXpPerLevel;
  return table[Math.min(level, table.length) - 1];
}

/** XP de compte gagnée par un run : salles terminées + bonus de victoire. */
export function accountXpForRun(roomsCleared: number, victory: boolean): number {
  return roomsCleared * PROGRESSION.accountXpPerRoom + (victory ? PROGRESSION.accountXpVictoryBonus : 0);
}
