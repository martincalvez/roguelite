// Sauvegarde locale versionnée. La synchro cloud (phase 4) se branchera ici, sans toucher au reste.
import { emptyScrolls } from '../systems/upgrade';
import type { SaveData } from '../types';

const KEY = 'roguelite-fantasy-save';
export const SAVE_VERSION = 3;
const STARTER_PET = { uid: 'start-pet', defId: 'familier_chouette', rarity: 'common' as const, level: 1 };

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    updatedAt: Date.now(),
    gold: 0,
    gems: 0,
    accountLevel: 1,
    accountXp: 0,
    inventory: [
      { uid: 'start-bow', defId: 'arc_chasseur', rarity: 'common', level: 1 },
      { ...STARTER_PET },
    ],
    scrolls: emptyScrolls(),
    equipped: { weapon: 'start-bow', pet: STARTER_PET.uid },
    talents: {},
    unlockedHeroes: ['aldric'],
    selectedHero: 'aldric',
    bestChapter: 0,
    bestWave: 0,
    settings: { alwaysShoot: false, sound: true },
  };
}

/** Chaque changement de format = SAVE_VERSION + 1 et une étape ici. Ne jamais casser une vieille sauvegarde. */
export function migrate(raw: Record<string, unknown> | SaveData): SaveData {
  const data = { ...defaultSave(), ...raw } as SaveData;
  // v1 → v2 : parchemins d'amélioration
  if (Number(raw.version ?? 1) < 2) data.scrolls = emptyScrolls();
  if (Number(raw.version ?? 1) < 3) {
    data.inventory = Array.isArray(data.inventory) ? [...data.inventory] : [];
    const hasStarterPet = data.inventory.some((item) => item.defId === STARTER_PET.defId);
    if (!hasStarterPet) data.inventory.push({ ...STARTER_PET });
    data.equipped = { ...(data.equipped ?? {}) };
    if (!data.equipped.pet) data.equipped.pet = STARTER_PET.uid;
  }
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
