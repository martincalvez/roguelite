// Courbe d'XP du run (pure, sans Phaser).
import { PROGRESSION } from '../data';

/** XP nécessaire pour passer du niveau `level` au suivant. */
export function xpToNextLevel(level: number): number {
  const table = PROGRESSION.xpPerLevel;
  return table[Math.min(level, table.length) - 1];
}
