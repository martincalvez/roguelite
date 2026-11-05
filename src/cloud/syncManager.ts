import { GameState } from '../state/GameState';
import { defaultSave, migrate, SAVE_VERSION } from '../state/SaveManager';
import {
  decideSync,
  fingerprint,
  isPlausibleSave,
  isSaveVersionSupported,
  summarizeSave,
  type SaveSummary,
} from '../systems/cloudSync';
import type { SaveData } from '../types';
import { cloudEnabled } from './client';
import { currentUserId, deleteRemote, fetchRemote, insertFirst, pushConditional, type RemoteSave } from './cloudSave';
import { loadMeta, saveMeta } from './syncMeta';

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'synced' | 'unavailable' | 'conflict' | 'too-new' | 'unreadable';

export interface ConflictInfo {
  local: SaveSummary & { date: number };
  remote: SaveSummary & { date: string };
}

/** Délai minimal entre deux synchros automatiques (lancement, fin de run et connexion passent outre). */
const MIN_INTERVAL_MS = 45_000;
const MAX_ATTEMPTS = 3;

/**
 * Orchestre la synchronisation. Règles : le jeu ne dépend jamais du cloud ; toute erreur réseau donne
 * « unavailable » sans bloquer ; aucune écriture ne se fait sans condition sur la `revision` ; en cas de
 * progression des deux côtés, c'est le joueur qui choisit. Rien n'est journalisé.
 */
class SyncManager {
  status: SyncStatus = cloudEnabled ? 'idle' : 'off';
  conflict: ConflictInfo | null = null;
  private inFlight: Promise<SyncStatus> | null = null;
  private lastAttemptAt = 0;
  private statusListeners = new Set<() => void>();
  private replacedListeners = new Set<() => void>();

  /** Appelé à chaque changement de statut. Renvoie une fonction de désabonnement. */
  onChange(cb: () => void): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  /** Appelé quand la sauvegarde locale a été remplacée par celle du cloud (les écrans doivent se rafraîchir). */
  onDataReplaced(cb: () => void): () => void {
    this.replacedListeners.add(cb);
    return () => this.replacedListeners.delete(cb);
  }

  private setStatus(status: SyncStatus): SyncStatus {
    this.status = status;
    for (const cb of [...this.statusListeners]) cb();
    return status;
  }

  /** Synchronise. `force` : ignore le délai minimal (lancement, fin de run, connexion, bouton). */
  syncNow(force = false): Promise<SyncStatus> {
    if (!cloudEnabled) return Promise.resolve('off');
    if (this.inFlight) return this.inFlight;
    if (!force && Date.now() - this.lastAttemptAt < MIN_INTERVAL_MS) return Promise.resolve(this.status);
    this.lastAttemptAt = Date.now();
    this.setStatus('syncing');
    this.inFlight = this.run().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async run(): Promise<SyncStatus> {
    try {
      const userId = await currentUserId();
      if (!userId) return this.setStatus('off');
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const result = await this.attempt(userId);
        if (result !== 'retry') return this.setStatus(result);
      }
      return this.setStatus('unavailable');
    } catch {
      return this.setStatus('unavailable');
    }
  }

  /** Une tentative : lire le cloud, décider, agir. Renvoie 'retry' si un autre appareil a écrit entre-temps. */
  private async attempt(userId: string): Promise<SyncStatus | 'retry'> {
    const meta = loadMeta(userId);
    const local = GameState.data;
    const localFingerprint = fingerprint(local);
    const baseline = meta.fingerprint ?? fingerprint(defaultSave());
    const fetched = await fetchRemote(userId);
    if (!fetched.ok) return 'unavailable';
    const remote = fetched.remote;

    const action = decideSync({
      localChanged: localFingerprint !== baseline,
      lastSyncedRevision: meta.lastRevision,
      remote: remote ? { revision: remote.revision } : null,
    });

    switch (action) {
      case 'noop':
        // Cloud vide et rien de changé : on oublie la revision (le cloud a été vidé volontairement).
        if (!remote && meta.lastRevision !== null) saveMeta({ userId, lastRevision: null, fingerprint: localFingerprint });
        this.conflict = null;
        return 'synced';

      case 'upload': {
        const written = remote ? await pushConditional(userId, local, remote.revision) : await insertFirst(userId, local);
        if (!written.ok) return written.reason === 'raced' ? 'retry' : 'unavailable';
        saveMeta({ userId, lastRevision: written.revision, fingerprint: localFingerprint });
        this.conflict = null;
        return 'synced';
      }

      case 'download':
        return this.applyRemote(userId, remote as RemoteSave);

      case 'conflict':
        this.conflict = {
          local: { ...summarizeSave(local), date: local.updatedAt },
          remote: { ...summarizeSave(this.safeRemote(remote as RemoteSave) ?? defaultSave()), date: (remote as RemoteSave).updatedAt },
        };
        return 'conflict';
    }
  }

  /** La sauvegarde du cloud migrée vers le format actuel, ou null si elle est illisible. */
  private safeRemote(remote: RemoteSave): SaveData | null {
    if (!isPlausibleSave(remote.data)) return null;
    try {
      return migrate(remote.data as Record<string, unknown>);
    } catch {
      return null;
    }
  }

  /** Remplace la sauvegarde locale par celle du cloud (après contrôles). */
  private applyRemote(userId: string, remote: RemoteSave): SyncStatus {
    if (!isSaveVersionSupported(remote.saveVersion, SAVE_VERSION)) return 'too-new';
    const migrated = this.safeRemote(remote);
    if (!migrated) return 'unreadable';
    GameState.replaceData(migrated);
    saveMeta({ userId, lastRevision: remote.revision, fingerprint: fingerprint(migrated) });
    this.conflict = null;
    for (const cb of [...this.replacedListeners]) cb();
    return 'synced';
  }

  /** Résout un conflit : 'local' écrase le cloud avec cet appareil, 'cloud' écrase cet appareil avec le cloud. */
  async resolveConflict(choice: 'local' | 'cloud'): Promise<SyncStatus> {
    if (!cloudEnabled) return 'off';
    this.setStatus('syncing');
    try {
      const userId = await currentUserId();
      if (!userId) return this.setStatus('off');
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const fetched = await fetchRemote(userId);
        if (!fetched.ok) return this.setStatus('unavailable');
        const remote = fetched.remote;
        if (choice === 'cloud') {
          if (!remote) return this.setStatus('synced');
          return this.setStatus(this.applyRemote(userId, remote));
        }
        const local = GameState.data;
        const written = remote ? await pushConditional(userId, local, remote.revision) : await insertFirst(userId, local);
        if (written.ok) {
          saveMeta({ userId, lastRevision: written.revision, fingerprint: fingerprint(local) });
          this.conflict = null;
          return this.setStatus('synced');
        }
        if (written.reason === 'unavailable') return this.setStatus('unavailable');
      }
      return this.setStatus('unavailable');
    } catch {
      return this.setStatus('unavailable');
    }
  }

  /** Supprime la ligne du cloud (pas le compte). Cet appareil garde sa sauvegarde locale. */
  async deleteCloudSave(): Promise<boolean> {
    const userId = await currentUserId();
    if (!userId) return false;
    const done = await deleteRemote(userId);
    if (done) {
      saveMeta({ userId, lastRevision: null, fingerprint: fingerprint(GameState.data) });
      this.conflict = null;
      this.setStatus('synced');
    }
    return done;
  }
}

export const Sync = new SyncManager();
