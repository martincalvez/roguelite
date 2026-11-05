import { describe, expect, it } from 'vitest';
import { defaultSave, migrate, SAVE_VERSION } from './SaveManager';

describe('migration de sauvegarde vers la version 3', () => {
  it('donne un familier de départ aux sauvegardes existantes sans perdre leur contenu', () => {
    const oldSave = {
      ...defaultSave(),
      version: 2,
      gold: 123,
      inventory: [{ uid: 'start-bow', defId: 'arc_chasseur', rarity: 'common' as const, level: 1 }],
      equipped: { weapon: 'start-bow' },
    };

    const migrated = migrate(oldSave);

    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.gold).toBe(123);
    expect(migrated.inventory.some((item) => item.defId === 'familier_chouette')).toBe(true);
    expect(migrated.equipped.pet).toBe('start-pet');
    expect(migrated.equipped.weapon).toBe('start-bow');
  });

  it('ne duplique pas le familier lors d’une seconde migration', () => {
    const first = migrate({ version: 2, inventory: [], equipped: {} });
    const second = migrate(first);

    expect(second.inventory.filter((item) => item.defId === 'familier_chouette')).toHaveLength(1);
    expect(second.equipped.pet).toBe('start-pet');
  });

  it('inclut le familier équipé dans une nouvelle sauvegarde', () => {
    const fresh = defaultSave();

    expect(fresh.equipped.pet).toBe('start-pet');
    expect(fresh.inventory.some((item) => item.uid === fresh.equipped.pet)).toBe(true);
  });
});
