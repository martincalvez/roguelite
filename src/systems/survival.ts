import { ENCOUNTERS, SURVIVAL } from '../data';
import type { RoomDef } from '../types';

/** Construit la salle d'un numéro de survie (base 1), sans dépendre de Phaser. */
export function survivalRoom(wave: number): RoomDef {
  const room = Math.max(1, Math.min(SURVIVAL.roomCount, Math.floor(wave)));
  const difficulty = Math.min(SURVIVAL.difficultyCap, SURVIVAL.difficultyStart + (room - 1) * SURVIVAL.difficultyPerRoom);
  const boss = SURVIVAL.bosses.find((entry) => entry.room === room);
  if (boss) return { type: 'boss', difficulty, enemies: [{ id: boss.enemyId, count: 1 }], encounter: ENCOUNTERS.bossProfile };
  if (room % SURVIVAL.angelEvery === SURVIVAL.angelOffset) return { type: 'angel', difficulty };

  const pool = [...SURVIVAL.enemyPools].reverse().find((entry) => room >= entry.fromRoom)?.enemies ?? SURVIVAL.enemyPools[0].enemies;
  const phase = Math.floor((room - 1) / 10);
  const position = (room - 1) % 10;
  const primary = position < 4 ? 0 : position < 7 ? 1 : Math.min(2, pool.length - 1);
  const secondary = (primary + 1 + Math.floor(position / 4)) % pool.length;
  const primaryCount = 3 + Math.min(phase, 2);
  const secondaryCount = 1 + (position % 2);
  return {
    type: 'combat',
    difficulty,
    encounter: SURVIVAL.encounterProfiles[(room - 1) % SURVIVAL.encounterProfiles.length],
    enemies: [
      { id: pool[primary], count: primaryCount },
      { id: pool[secondary], count: secondaryCount },
    ],
  };
}

/** Le feu rend certains combats plus mobiles ; les boss et haltes restent sans piège. */
export function hasSurvivalFire(wave: number): boolean {
  if (isSurvivalRestRoom(wave)) return false;
  return wave % SURVIVAL.fireEveryRooms === 0;
}

/** Les tourelles sont des pièges à trajectoire : les murs peuvent absorber leurs tirs. */
export function hasSurvivalTurrets(wave: number): boolean {
  if (isSurvivalRestRoom(wave)) return false;
  return wave >= SURVIVAL.turretOffset
    && (wave - SURVIVAL.turretOffset) % SURVIVAL.turretEveryRooms === 0;
}

function isSurvivalRestRoom(wave: number): boolean {
  const bossRoom = SURVIVAL.bosses.some((boss) => boss.room === wave);
  const angelRoom = wave % SURVIVAL.angelEvery === SURVIVAL.angelOffset;
  return bossRoom || angelRoom;
}
