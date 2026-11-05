// Calculs de combat purs (sans Phaser). Le hasard est injecté pour pouvoir tester.

/** Vrai si le coup est critique. `rng` renvoie un nombre dans [0, 1). */
export function rollCrit(critChance: number, rng: () => number = Math.random): boolean {
  return rng() < critChance;
}

/** Dégâts d'un tir : attaque, multipliée par critDamage en cas de critique. */
export function damageAmount(attack: number, isCrit: boolean, critDamage: number): number {
  return Math.round(attack * (isCrit ? critDamage : 1));
}

/** Vrai si le joueur esquive le coup. */
export function rollDodge(dodge: number, rng: () => number = Math.random): boolean {
  return rng() < dodge;
}
