// Sauvegarde locale versionnée. La synchro cloud (phase 4) se branchera ici, sans toucher au reste.
import type { SaveData } from '../types';

const KEY = 'roguelite-fantasy-save';
export const SAVE_VERSION = 1;

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    updatedAt: Date.now(),
    gold: 0,
    gems: 0,
    accountLevel: 1,
    accountXp: 0,
    inventory: [{ uid: 'start-bow', defId: 'arc_chasseur', rarity: 'common', level: 1 }],
    equipped: { weapon: 'start-bow' },
    talents: {},
    unlockedHeroes: ['aldric'],
    selectedHero: 'aldric',
    bestChapter: 0,
    bestWave: 0,
    settings: { alwaysShoot: false, sound: true },
  };
}

/** Chaque changement de format = SAVE_VERSION + 1 et une étape ici. Ne jamais casser une vieille sauvegarde. */
function migrate(raw: Record<string, unknown>): SaveData {
  const data = { ...defaultSave(), ...raw } as SaveData;
  // exemple futur : if (data.version < 2) { ...; data.version = 2; }
  data.version = SAVE_VERSION;
  return data;
}

export const SaveManager = {
  load(): SaveData {
    try {
      const text = localStorage.getItem(KEY);
      if (!text) return defaultSave();
      return migrate(JSON.parse(text));
    } catch {
      return defaultSave();
    }
  },

  save(data: SaveData): void {
    data.updatedAt = Date.now();
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // stockage plein ou bloqué (navigation privée) : on continue sans planter
    }
  },

  reset(): SaveData {
    const fresh = defaultSave();
    this.save(fresh);
    return fresh;
  },
};
