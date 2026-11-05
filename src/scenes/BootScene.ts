import Phaser from 'phaser';
import { SCENES } from '../config';
import { ENEMIES } from '../data';

/** Charge les assets. Tant qu'il n'y a pas de sprites, génère des formes simples. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  create(): void {
    this.makeCircle('player', 22, 0x6fb7ff, true);
    this.makeCircle('projectile', 7, 0xffe08a);
    this.makeCircle('enemy-projectile', 8, 0xff6b6b);
    this.makeCircle('particle', 5, 0xffffff);
    this.makeCircle('xp-orb', 6, 0x8bd17c);
    // Un cercle par type d'ennemi, à sa couleur et son rayon (EnemyDef).
    for (const def of ENEMIES) {
      this.makeCircle(`enemy-${def.id}`, def.radius, Phaser.Display.Color.HexStringToColor(def.color).color);
    }
    this.scene.start(SCENES.menu);
  }

  /** `facingMark` : petit point clair sur le bord droit, pour voir où regarde le héros (rotation 0 = droite). */
  private makeCircle(key: string, radius: number, color: number, facingMark = false): void {
    const g = this.add.graphics();
    g.fillStyle(color, 1).fillCircle(radius, radius, radius);
    g.lineStyle(2, 0x000000, 0.35).strokeCircle(radius, radius, radius - 1);
    if (facingMark) g.fillStyle(0xffffff, 1).fillCircle(radius * 2 - 8, radius, 5);
    g.generateTexture(key, radius * 2, radius * 2);
    g.destroy();
  }
}
