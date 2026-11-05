// Logique pure de la synchronisation cloud (sans réseau, sans Phaser) : décision, empreinte, résumé, validation.
import type { SaveData } from '../types';

// ---------- décision ----------

export type SyncAction = 'noop' | 'upload' | 'download' | 'conflict';

export interface SyncInput {
  /** La sauvegarde locale a changé depuis la dernière synchro (ou, jamais synchronisé : depuis une sauvegarde neuve). */
  localChanged: boolean;
  /** Dernière `revision` du cloud vue par cet appareil, ou null s'il n'a jamais été synchronisé. */
  lastSyncedRevision: number | null;
  /** Ligne actuelle du cloud, ou null s'il n'y en a pas. */
  remote: { revision: number } | null;
}

/**
 * Que faire ?
 *  - cloud vide : envoyer si le local a changé, sinon rien (une suppression volontaire n'est pas annulée) ;
 *  - appareil jamais synchronisé : récupérer s'il n'a pas progressé, sinon CHOIX (les deux ont de la progression) ;
 *  - sinon : seul le local a changé → envoyer ; seul le cloud a changé → récupérer ; les deux → CHOIX ; aucun → rien.
 */
export function decideSync({ localChanged, lastSyncedRevision, remote }: SyncInput): SyncAction {
  if (remote === null) return localChanged ? 'upload' : 'noop';
  if (lastSyncedRevision === null) return localChanged ? 'conflict' : 'download';
  const cloudChanged = remote.revision !== lastSyncedRevision;
  if (localChanged && cloudChanged) return 'conflict';
  if (localChanged) return 'upload';
  if (cloudChanged) return 'download';
  return 'noop';
}

// ---------- empreinte ----------

/** Sérialisation JSON stable : clés triées, pour que deux sauvegardes identiques donnent le même texte. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/** Hachage 53 bits (cyrb53) en hexadécimal : sert uniquement à détecter un changement, pas à la sécurité. */
export function hashString(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

/** Empreinte d'une sauvegarde, SANS `updatedAt` (qui change à chaque écriture sans que la progression change). */
export function fingerprint(save: SaveData): string {
  const { updatedAt: _ignored, ...rest } = save;
  void _ignored;
  return hashString(stableStringify(rest));
}

// ---------- résumé pour l'écran de choix ----------

export interface SaveSummary {
  accountLevel: number;
  gold: number;
  gems: number;
  items: number;
  bestChapter: number;
}

export function summarizeSave(save: SaveData): SaveSummary {
  return {
    accountLevel: save.accountLevel,
    gold: save.gold,
    gems: save.gems,
    items: save.inventory.length,
    bestChapter: save.bestChapter,
  };
}

// ---------- validation d'une sauvegarde reçue du cloud ----------

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Contrôle de forme minimal avant d'accepter une sauvegarde venue du cloud. */
export function isPlausibleSave(raw: unknown): boolean {
  if (raw === null || typeof raw !== 'object') return false;
  const s = raw as Record<string, unknown>;
  return (
    isFiniteNumber(s.gold) &&
    s.gold >= 0 &&
    isFiniteNumber(s.accountLevel) &&
    s.accountLevel >= 1 &&
    Array.isArray(s.inventory) &&
    s.equipped !== null &&
    typeof s.equipped === 'object' &&
    s.talents !== null &&
    typeof s.talents === 'object'
  );
}

/** Une sauvegarde cloud d'un format plus récent que ce jeu ne doit pas être ouverte (elle serait abîmée). */
export function isSaveVersionSupported(remoteVersion: number, currentVersion: number): boolean {
  return Number.isInteger(remoteVersion) && remoteVersion >= 1 && remoteVersion <= currentVersion;
}
