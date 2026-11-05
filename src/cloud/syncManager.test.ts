import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SaveData } from '../types';
import type { RemoteSave } from './cloudSave';
import type { SyncMeta } from './syncMeta';

// Faux cloud en mémoire : on teste le gestionnaire de synchro de bout en bout, sans réseau.
const fake = vi.hoisted(() => ({
  userId: 'u1' as string | null,
  fetchOk: true,
  remote: null as RemoteSave | null,
  meta: { userId: 'u1', lastRevision: null, fingerprint: null } as SyncMeta,
  raceOnInsert: null as RemoteSave | null,
  calls: [] as string[],
}));

vi.mock('./client', () => ({ cloudEnabled: true, getCloud: () => null }));
vi.mock('./syncMeta', () => ({
  loadMeta: (userId: string): SyncMeta => (fake.meta.userId === userId ? { ...fake.meta } : { userId, lastRevision: null, fingerprint: null }),
  saveMeta: (m: SyncMeta) => {
    fake.meta = { ...m };
  },
}));
vi.mock('./cloudSave', () => ({
  currentUserId: async () => fake.userId,
  fetchRemote: async () => {
    fake.calls.push('fetch');
    return fake.fetchOk ? { ok: true, remote: fake.remote } : { ok: false };
  },
  insertFirst: async (_user: string, save: SaveData) => {
    fake.calls.push('insert');
    if (fake.raceOnInsert) {
      fake.remote = fake.raceOnInsert;
      fake.raceOnInsert = null;
      return { ok: false, reason: 'raced' };
    }
    fake.remote = { data: JSON.parse(JSON.stringify(save)), saveVersion: 2, revision: 1, updatedAt: '2026-01-01T10:00:00Z' };
    return { ok: true, revision: 1 };
  },
  pushConditional: async (_user: string, save: SaveData, known: number) => {
    fake.calls.push('push');
    if (!fake.remote || fake.remote.revision !== known) return { ok: false, reason: 'raced' };
    fake.remote = { ...fake.remote, data: JSON.parse(JSON.stringify(save)), revision: known + 1 };
    return { ok: true, revision: known + 1 };
  },
  deleteRemote: async () => {
    fake.calls.push('delete');
    fake.remote = null;
    return true;
  },
}));

async function fresh() {
  vi.resetModules();
  const { Sync } = await import('./syncManager');
  const { GameState } = await import('../state/GameState');
  const { defaultSave } = await import('../state/SaveManager');
  return { Sync, GameState, defaultSave };
}

const remoteOf = (data: unknown, revision: number, saveVersion = 2): RemoteSave => ({ data, saveVersion, revision, updatedAt: '2026-02-02T12:00:00Z' });

beforeEach(() => {
  fake.userId = 'u1';
  fake.fetchOk = true;
  fake.remote = null;
  fake.meta = { userId: 'u1', lastRevision: null, fingerprint: null };
  fake.raceOnInsert = null;
  fake.calls = [];
});

describe('synchronisation', () => {
  it("appareil neuf et cloud vide : rien à envoyer", async () => {
    const { Sync } = await fresh();
    expect(await Sync.syncNow(true)).toBe('synced');
    expect(fake.calls).toEqual(['fetch']);
    expect(fake.remote).toBeNull();
  });

  it("le local a progressé et le cloud est vide : première écriture, puis écritures conditionnelles", async () => {
    const { Sync, GameState } = await fresh();
    GameState.data.gold = 500;
    expect(await Sync.syncNow(true)).toBe('synced');
    expect(fake.calls).toContain('insert');
    expect(fake.meta.lastRevision).toBe(1);
    expect((fake.remote?.data as SaveData).gold).toBe(500);

    GameState.data.gold = 800;
    fake.calls = [];
    expect(await Sync.syncNow(true)).toBe('synced');
    expect(fake.calls).toEqual(['fetch', 'push']);
    expect(fake.meta.lastRevision).toBe(2);
    expect((fake.remote?.data as SaveData).gold).toBe(800);
  });

  it("rien n'a changé : aucune écriture", async () => {
    const { Sync, GameState } = await fresh();
    GameState.data.gold = 500;
    await Sync.syncNow(true);
    fake.calls = [];
    await Sync.syncNow(true);
    expect(fake.calls).toEqual(['fetch']);
  });

  it("seul le cloud a changé (autre appareil) : récupère et prévient les écrans", async () => {
    const { Sync, GameState, defaultSave } = await fresh();
    GameState.data.gold = 500;
    await Sync.syncNow(true); // revision 1
    const replaced = vi.fn();
    Sync.onDataReplaced(replaced);
    fake.remote = remoteOf({ ...defaultSave(), gold: 999, accountLevel: 3 }, 2);
    expect(await Sync.syncNow(true)).toBe('synced');
    expect(GameState.data.gold).toBe(999);
    expect(GameState.data.accountLevel).toBe(3);
    expect(fake.meta.lastRevision).toBe(2);
    expect(replaced).toHaveBeenCalledOnce();
  });

  it("les deux ont changé : conflit, rien n'est écrasé", async () => {
    const { Sync, GameState, defaultSave } = await fresh();
    GameState.data.gold = 500;
    await Sync.syncNow(true); // revision 1
    GameState.data.gold = 600; // le local change…
    fake.remote = remoteOf({ ...defaultSave(), gold: 999 }, 2); // …et le cloud aussi
    expect(await Sync.syncNow(true)).toBe('conflict');
    expect(Sync.conflict?.local.gold).toBe(600);
    expect(Sync.conflict?.remote.gold).toBe(999);
    expect(GameState.data.gold).toBe(600);
    expect((fake.remote?.data as SaveData).gold).toBe(999);
  });

  it("conflit résolu en gardant cet appareil : le cloud est remplacé", async () => {
    const { Sync, GameState, defaultSave } = await fresh();
    GameState.data.gold = 500;
    await Sync.syncNow(true);
    GameState.data.gold = 600;
    fake.remote = remoteOf({ ...defaultSave(), gold: 999 }, 2);
    await Sync.syncNow(true);
    expect(await Sync.resolveConflict('local')).toBe('synced');
    expect((fake.remote?.data as SaveData).gold).toBe(600);
    expect(Sync.conflict).toBeNull();
    expect(GameState.data.gold).toBe(600);
  });

  it("conflit résolu en récupérant le cloud : cet appareil est remplacé", async () => {
    const { Sync, GameState, defaultSave } = await fresh();
    GameState.data.gold = 500;
    await Sync.syncNow(true);
    GameState.data.gold = 600;
    fake.remote = remoteOf({ ...defaultSave(), gold: 999 }, 2);
    await Sync.syncNow(true);
    expect(await Sync.resolveConflict('cloud')).toBe('synced');
    expect(GameState.data.gold).toBe(999);
    expect(Sync.conflict).toBeNull();
  });

  it("appareil jamais synchronisé mais ayant progressé, cloud existant : conflit", async () => {
    const { Sync, GameState, defaultSave } = await fresh();
    GameState.data.gold = 50;
    fake.remote = remoteOf({ ...defaultSave(), gold: 999 }, 4);
    expect(await Sync.syncNow(true)).toBe('conflict');
  });

  it("appareil neuf, cloud existant : récupère directement", async () => {
    const { Sync, GameState, defaultSave } = await fresh();
    fake.remote = remoteOf({ ...defaultSave(), gold: 777 }, 4);
    expect(await Sync.syncNow(true)).toBe('synced');
    expect(GameState.data.gold).toBe(777);
  });

  it("un autre appareil a écrit entre la lecture et l'écriture : on refait la décision (ici : conflit)", async () => {
    const { Sync, GameState, defaultSave } = await fresh();
    GameState.data.gold = 500;
    fake.raceOnInsert = remoteOf({ ...defaultSave(), gold: 999 }, 1);
    expect(await Sync.syncNow(true)).toBe('conflict');
    expect((fake.remote?.data as SaveData).gold).toBe(999);
  });
});

describe('pannes et refus', () => {
  it("réseau ou projet indisponible : « unavailable », sans exception, sauvegarde locale intacte", async () => {
    const { Sync, GameState } = await fresh();
    GameState.data.gold = 321;
    fake.fetchOk = false;
    await expect(Sync.syncNow(true)).resolves.toBe('unavailable');
    expect(GameState.data.gold).toBe(321);
  });

  it("pas connecté : « off », aucun appel au cloud", async () => {
    const { Sync } = await fresh();
    fake.userId = null;
    expect(await Sync.syncNow(true)).toBe('off');
    expect(fake.calls).toEqual([]);
  });

  it("sauvegarde cloud d'un format plus récent que le jeu : refusée, local intact", async () => {
    const { Sync, GameState, defaultSave } = await fresh();
    fake.remote = remoteOf({ ...defaultSave(), gold: 5 }, 3, 99);
    expect(await Sync.syncNow(true)).toBe('too-new');
    expect(GameState.data.gold).toBe(0);
  });

  it("sauvegarde cloud illisible : refusée, local intact", async () => {
    const { Sync, GameState } = await fresh();
    fake.remote = remoteOf({ gold: 'beaucoup' }, 3);
    expect(await Sync.syncNow(true)).toBe('unreadable');
    expect(GameState.data.gold).toBe(0);
  });

  it("délai minimal : un second essai non forcé juste après ne contacte pas le cloud", async () => {
    const { Sync } = await fresh();
    await Sync.syncNow(true);
    fake.calls = [];
    await Sync.syncNow(false);
    expect(fake.calls).toEqual([]);
  });

  it("autre compte sur cet appareil : la mémoire de synchro repart de zéro", async () => {
    const { Sync, GameState, defaultSave } = await fresh();
    fake.meta = { userId: 'ancien', lastRevision: 9, fingerprint: 'abc' };
    GameState.data.gold = 40;
    fake.remote = remoteOf({ ...defaultSave(), gold: 999 }, 9);
    // jamais synchronisé avec CE compte + progression locale + cloud existant => conflit (et non un envoi silencieux)
    expect(await Sync.syncNow(true)).toBe('conflict');
  });
});

describe('suppression du cloud', () => {
  it("supprime la ligne ; un autre appareil inchangé ne la recrée pas ; la progression locale est conservée", async () => {
    const { Sync, GameState } = await fresh();
    GameState.data.gold = 500;
    await Sync.syncNow(true);
    expect(await Sync.deleteCloudSave()).toBe(true);
    expect(fake.remote).toBeNull();
    expect(GameState.data.gold).toBe(500);
    expect(fake.meta.lastRevision).toBeNull();
    fake.calls = [];
    expect(await Sync.syncNow(true)).toBe('synced');
    expect(fake.calls).toEqual(['fetch']); // rien recréé
    expect(fake.remote).toBeNull();
  });

  it("après suppression, un nouveau changement local recrée la sauvegarde cloud", async () => {
    const { Sync, GameState } = await fresh();
    GameState.data.gold = 500;
    await Sync.syncNow(true);
    await Sync.deleteCloudSave();
    GameState.data.gold = 700;
    await Sync.syncNow(true);
    expect((fake.remote?.data as SaveData).gold).toBe(700);
  });
});
