// Sauvegarde locale versionnée. La synchro cloud (phase 4) se branchera ici, sans toucher au reste.
import { emptyScrolls } from '../systems/upgrade';
import type { SaveData } from '../types';

const KEY = 'roguelite-fantasy-save';
export const SAVE_VERSION = 2;

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    updatedAt: Date.now(),
    gold: 0,
    gems: 0,
    accountLevel: 1,
    accountXp: 0,
    inventory: [{ uid: 'start-bow', defId: 'arc_chasseur', rarity: 'common', level: 1 }],
    scrolls: emptyScrolls(),
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
  // v1 → v2 : parchemins d'amélioration
  if (Number(raw.version ?? 1) < 2) data.scrolls = emptyScrolls();
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
