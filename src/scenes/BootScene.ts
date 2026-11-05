import Phaser from 'phaser';
import { SCENES } from '../config';
import { ENEMIES } from '../data';

/** Charge les assets. Tant qu'il n'y a pas de sprites, génère des formes simples. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  create(): void {
    this.makeCircle('player', 22, 0x3fa4ff, true);
    this.makeCircle('projectile', 7, 0xffe14a);
    this.makeCircle('enemy-projectile', 8, 0xff3b6b);
    this.makeCircle('particle', 5, 0xffffff);
    this.makeCircle('xp-orb', 6, 0x5cff7a);
    // Un cercle par type d'ennemi, à sa couleur et son rayon (EnemyDef).
    for (const def of ENEMIES) {
      this.makeCircle(`enemy-${def.id}`, def.radius, Phaser.Display.Color.HexStringToColor(def.color).color);
    }
    this.scene.start(SCENES.menu);
  }

  /** `facingMark` : petit point clair sur le bord droit, pour voir où regarde le héros (rotation 0 = droite). */
  private makeCircle(key: string, radius: number, color: number, facingMark = false): void {
    const g = this.add.graphics();
    const outline = Math.max(3, Math.round(radius * 0.2));
    g.fillStyle(color, 1).fillCircle(radius, radius, radius);
    // Reflet en haut à gauche : donne le côté « bonbon » du style cartoon.
    g.fillStyle(0xffffff, 0.35).fillCircle(radius * 0.65, radius * 0.6, radius * 0.3);
    g.lineStyle(outline, 0x1a1020, 0.7).strokeCircle(radius, radius, radius - outline / 2);
    if (facingMark) g.fillStyle(0xffffff, 1).fillCircle(radius * 2 - 8, radius, 5);
    g.generateTexture(key, radius * 2, radius * 2);
    g.destroy();
  }
}
