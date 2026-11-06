import type { EncounterConfig, EncounterProfile, EnemyGroupDef, RoomDef, SpawnPattern } from '../types';

export interface PlannedEncounterWave {
  delayMs: number;
  telegraphMs: number;
  spawnPattern: SpawnPattern;
  enemies: EnemyGroupDef[];
}

/**
 * Transforme les groupes d'une salle en vagues : le total d'ennemis est strictement conservé,
 * mais leur arrivée devient un rythme lisible plutôt qu'un paquet unique.
 */
export function planEncounter(
  room: RoomDef,
  roomIndex: number,
  mode: 'campaign' | 'survival',
  config: EncounterConfig,
): PlannedEncounterWave[] {
  if (room.type === 'angel' || !room.enemies?.length) return [];
  const profileId = room.encounter ?? profileFor(room, roomIndex, mode, config);
  const profile = config.profiles.find((entry) => entry.id === profileId);
  if (!profile) throw new Error(`Profil de rencontre inconnu : ${profileId}`);
  return profile.waves.map((wave, index) => ({
    delayMs: wave.delayMs,
    telegraphMs: wave.telegraphMs,
    spawnPattern: wave.spawnPattern,
    enemies: distributeGroups(room.enemies ?? [], profile, index),
  })).filter((wave) => wave.enemies.length > 0);
}

function profileFor(room: RoomDef, roomIndex: number, mode: 'campaign' | 'survival', config: EncounterConfig): string {
  if (room.type === 'boss' || room.type === 'miniboss') return config.bossProfile;
  const cycle = mode === 'survival' ? config.survivalProfiles : config.campaignProfiles;
  if (cycle.length === 0) throw new Error(`Aucun profil de rencontre pour le mode ${mode}`);
  return cycle[roomIndex % cycle.length];
}

/** Répartit exactement un groupe entre les vagues grâce à la méthode des plus grands restes. */
function distributeGroups(groups: readonly EnemyGroupDef[], profile: EncounterProfile, waveIndex: number): EnemyGroupDef[] {
  const shares = profile.waves.map((wave) => wave.share);
  return groups.flatMap((group) => {
    const counts = splitCount(group.count, shares);
    return counts[waveIndex] > 0 ? [{ id: group.id, count: counts[waveIndex] }] : [];
  });
}

/** Exportée pour vérifier que les vagues ne créent ni ne perdent jamais d'ennemis. */
export function splitCount(total: number, shares: readonly number[]): number[] {
  if (total <= 0 || shares.length === 0) return shares.map(() => 0);
  const shareTotal = shares.reduce((sum, share) => sum + share, 0);
  if (shareTotal <= 0) return shares.map(() => 0);
  const exact = shares.map((share) => (total * share) / shareTotal);
  const counts = exact.map(Math.floor);
  let remaining = total - counts.reduce((sum, count) => sum + count, 0);
  const order = exact
    .map((value, index) => ({ index, remainder: value - counts[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let index = 0; remaining > 0; index++, remaining--) counts[order[index % order.length].index]++;
  return counts;
}
