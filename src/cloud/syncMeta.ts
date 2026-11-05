// Mémoire de synchro de CET appareil, dans localStorage sous une clé à part (jamais dans SaveData) :
// dernière revision du cloud vue, et empreinte de la sauvegarde à ce moment-là.

const KEY = 'roguelite-fantasy-sync';

export interface SyncMeta {
  userId: string;
  lastRevision: number | null;
  fingerprint: string | null;
}

export function loadMeta(userId: string): SyncMeta {
  const fresh: SyncMeta = { userId, lastRevision: null, fingerprint: null };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh;
    const m = JSON.parse(raw) as Partial<SyncMeta>;
    // Un autre compte s'est connecté sur cet appareil : on repart de zéro.
    if (m.userId !== userId) return fresh;
    return {
      userId,
      lastRevision: typeof m.lastRevision === 'number' ? m.lastRevision : null,
      fingerprint: typeof m.fingerprint === 'string' ? m.fingerprint : null,
    };
  } catch {
    return fresh;
  }
}

export function saveMeta(meta: SyncMeta): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(meta));
  } catch {
    // stockage plein ou bloqué : la prochaine synchro se comportera comme celle d'un appareil neuf
  }
}
