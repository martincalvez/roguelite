import type Phaser from 'phaser';

/**
 * Détruit tous les objets affichés par la scène (textes, boutons et leurs zones tactiles, champs HTML…).
 * À utiliser avant de reconstruire un écran. Attention : `scene.children.removeAll(true)` ne détruit RIEN
 * (le `true` signifie « ne pas appeler les callbacks ») : les anciens objets restent actifs et invisibles,
 * un champ de saisie HTML reste affiché, et d'anciens boutons peuvent encore réagir aux clics.
 */
export function clearScene(scene: Phaser.Scene): void {
  for (const child of [...scene.children.list]) child.destroy();
}
