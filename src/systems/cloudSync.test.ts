import { describe, expect, it } from 'vitest';
import { defaultSave } from '../state/SaveManager';
import { decideSync, fingerprint, hashString, isPlausibleSave, isSaveVersionSupported, stableStringify, summarizeSave } from './cloudSync';

describe('decideSync : cloud vide', () => {
  it('envoie si le local a changé', () => {
    expect(decideSync({ localChanged: true, lastSyncedRevision: null, remote: null })).toBe('upload');
    expect(decideSync({ localChanged: true, lastSyncedRevision: 4, remote: null })).toBe('upload');
  });

  it("ne fait rien sinon : une suppression volontaire n'est pas annulée par un autre appareil inchangé", () => {
    expect(decideSync({ localChanged: false, lastSyncedRevision: null, remote: null })).toBe('noop');
    expect(decideSync({ localChanged: false, lastSyncedRevision: 4, remote: null })).toBe('noop');
  });
});

describe('decideSync : appareil jamais synchronisé', () => {
  it("récupère le cloud s'il n'a pas progressé", () => {
    expect(decideSync({ localChanged: false, lastSyncedRevision: null, remote: { revision: 3 } })).toBe('download');
  });

  it("demande le choix s'il a progressé alors que le cloud existe", () => {
    expect(decideSync({ localChanged: true, lastSyncedRevision: null, remote: { revision: 3 } })).toBe('conflict');
  });
});

describe('decideSync : appareil déjà synchronisé', () => {
  const remote = { revision: 5 };

  it('rien ne change : rien à faire', () => {
    expect(decideSync({ localChanged: false, lastSyncedRevision: 5, remote })).toBe('noop');
  });

  it('seul le local a changé : envoyer', () => {
    expect(decideSync({ localChanged: true, lastSyncedRevision: 5, remote })).toBe('upload');
  });

  it('seul le cloud a changé : récupérer', () => {
    expect(decideSync({ localChanged: false, lastSyncedRevision: 4, remote })).toBe('download');
  });

  it('les deux ont changé : choix', () => {
    expect(decideSync({ localChanged: true, lastSyncedRevision: 4, remote })).toBe('conflict');
  });

  it('une revision plus basse que celle connue (ligne recréée) compte comme un changement du cloud', () => {
    expect(decideSync({ localChanged: false, lastSyncedRevision: 9, remote: { revision: 2 } })).toBe('download');
    expect(decideSync({ localChanged: true, lastSyncedRevision: 9, remote: { revision: 2 } })).toBe('conflict');
  });
});

describe('empreinte', () => {
  it("l'ordre des clés ne change pas l'empreinte", () => {
    expect(stableStringify({ b: 1, a: [2, { d: 4, c: 3 }] })).toBe('{"a":[2,{"c":3,"d":4}],"b":1}');
    expect(hashString(stableStringify({ a: 1, b: 2 }))).toBe(hashString(stableStringify({ b: 2, a: 1 })));
  });

  it('updatedAt est ignoré, la progression ne l\'est pas', () => {
    const a = defaultSave();
    const b = { ...a, updatedAt: a.updatedAt + 99999 };
    expect(fingerprint(a)).toBe(fingerprint(b));
    expect(fingerprint({ ...a, gold: a.gold + 1 })).not.toBe(fingerprint(a));
    expect(fingerprint({ ...a, inventory: [...a.inventory, { uid: 'x', defId: 'arc_chasseur', rarity: 'rare', level: 1 }] })).not.toBe(fingerprint(a));
  });

  it('deux sauvegardes neuves ont la même empreinte', () => {
    expect(fingerprint(defaultSave())).toBe(fingerprint(defaultSave()));
  });

  it('des textes proches donnent des hachages différents', () => {
    expect(hashString('gold:100')).not.toBe(hashString('gold:101'));
  });
});

describe('summarizeSave', () => {
  it('résume ce qui sert à choisir entre deux sauvegardes', () => {
    const s = { ...defaultSave(), accountLevel: 4, gold: 900, gems: 12, bestChapter: 1 };
    expect(summarizeSave(s)).toEqual({ accountLevel: 4, gold: 900, gems: 12, items: 1, bestChapter: 1 });
  });
});

describe('validation d\'une sauvegarde reçue', () => {
  it('accepte une vraie sauvegarde', () => {
    expect(isPlausibleSave(JSON.parse(JSON.stringify(defaultSave())))).toBe(true);
  });

  it('refuse le reste', () => {
    for (const bad of [null, 5, 'x', [], {}, { gold: 'a' }, { ...defaultSave(), gold: -1 }, { ...defaultSave(), inventory: 'x' }, { ...defaultSave(), accountLevel: 0 }, { ...defaultSave(), talents: null }]) {
      expect(isPlausibleSave(bad)).toBe(false);
    }
  });

  it('refuse une version plus récente que le jeu', () => {
    expect(isSaveVersionSupported(2, 2)).toBe(true);
    expect(isSaveVersionSupported(1, 2)).toBe(true);
    expect(isSaveVersionSupported(3, 2)).toBe(false);
    expect(isSaveVersionSupported(0, 2)).toBe(false);
    expect(isSaveVersionSupported(1.5, 2)).toBe(false);
  });
});
