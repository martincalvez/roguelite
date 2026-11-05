import { SCENES } from '../config';
import { CHAPTERS, getChapter, ITEMS, LOOT } from '../data';
import type { LootData } from '../scenes/LootScene';
import { GameState } from '../state/GameState';
import { gemsForRun, rollLoot, rollScrolls } from '../systems/loot';
import { accountXpForRun } from '../systems/progression';
import type { RunRewards } from '../types';
import type { RunContext } from './RunContext';

/**
 * Fin du run (mort ou victoire) : fige le jeu, ajoute les récompenses à la sauvegarde (une seule fois),
 * puis passe à l'écran de butin.
 */
export function endRun(ctx: RunContext, victory: boolean): void {
  const { scene, player, joystick, runState } = ctx;
  if (runState.ended) return;
  runState.ended = true;
  scene.physics.pause();
  joystick.setEnabled(false);
  player.setVelocity(0, 0);
  player.setAlpha(1);

  const chapter = getChapter(ctx.chapterId);
  const roomCount = chapter.rooms.length;
  const roomsCleared = victory ? roomCount : runState.room;
  const rewards: RunRewards = {
    gold: runState.gold,
    accountXp: accountXpForRun(roomsCleared, victory),
    items: rollLoot(LOOT, ITEMS, victory),
    scrolls: rollScrolls(LOOT, victory),
    gems: gemsForRun(LOOT, runState.bossesKilled, victory),
    clearedChapter: victory ? CHAPTERS.findIndex((c) => c.id === chapter.id) + 1 : null,
  };
  const { levelBefore, levelAfter } = GameState.applyRunRewards(rewards);
  const data: LootData = {
    victory,
    roomReached: runState.room + 1,
    roomCount,
    gold: rewards.gold,
    accountXp: rewards.accountXp,
    levelBefore,
    levelAfter,
    items: rewards.items,
    scrolls: rewards.scrolls,
    gems: rewards.gems,
  };

  scene.cameras.main.fadeOut(450);
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(SCENES.loot, data));
}
