import type { SyncStatus } from '../cloud/syncManager';

/** Texte et couleur d'affichage d'un statut de synchro ; null = ne rien afficher. */
export function syncLabel(status: SyncStatus): { text: string; color: string } | null {
  switch (status) {
    case 'synced':
      return { text: 'Synchro : à jour', color: '#5cff7a' };
    case 'syncing':
      return { text: 'Synchro en cours…', color: '#d6f0dc' };
    case 'unavailable':
      return { text: 'Synchro indisponible', color: '#ffb347' };
    case 'conflict':
      return { text: 'Choix de sauvegarde nécessaire', color: '#ffe14a' };
    case 'too-new':
      return { text: 'Sauvegarde cloud plus récente : mets le jeu à jour', color: '#ff9a9a' };
    case 'unreadable':
      return { text: 'Sauvegarde cloud illisible', color: '#ff9a9a' };
    default:
      return null; // 'off' (pas de compte) ou 'idle' (pas encore tenté)
  }
}
