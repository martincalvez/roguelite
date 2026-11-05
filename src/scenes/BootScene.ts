import Phaser from 'phaser';
import { SCENES } from '../config';
import { ENEMIES, ITEMS } from '../data';
import type { ItemDef } from '../types';

/** Charge les assets. Tant qu'il n'y a pas de sprites, génère des formes simples. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  create(): void {
    this.makeCircle('player', 22, 0x3fa4ff, true);
    this.makeCircle('projectile', 7, 0xffe14a);
    this.makeCircle('projectile-bolt', 11, 0xff9d2e);
    this.makeCircle('projectile-shuriken', 5, 0xd9e6ff);
    this.makeCircle('enemy-projectile', 8, 0xff3b6b);
    this.makeCircle('particle', 5, 0xffffff);
    this.makeCircle('orbit-orb', 14, 0xb35cff);
    this.makeCircle('xp-orb', 6, 0x5cff7a);
    // Un cercle par type d'ennemi, à sa couleur et son rayon (EnemyDef).
    for (const def of ENEMIES) {
      this.makeCircle(`enemy-${def.id}`, def.radius, Phaser.Display.Color.HexStringToColor(def.color).color);
    }
    for (const item of ITEMS) {
      if (item.slot === 'pet' && item.petAppearance) this.makePetTexture(item);
    }
    this.scene.start(SCENES.menu);
  }

  private makePetTexture(item: ItemDef): void {
    const appearance = item.petAppearance;
    if (!appearance) return;
    const body = Phaser.Display.Color.HexStringToColor(appearance.bodyColor).color;
    const accent = Phaser.Display.Color.HexStringToColor(appearance.accentColor).color;
    const eyes = Phaser.Display.Color.HexStringToColor(appearance.eyeColor).color;
    const g = this.add.graphics();

    // Ombre et contour épais pour garder la silhouette lisible sur le sol du combat.
    g.fillStyle(0x1a1020, 0.2).fillEllipse(64, 114, 66, 16);
    g.lineStyle(7, 0x1a1020, 0.8);

    if (appearance.form === 'owl') {
      g.fillStyle(body, 1).fillEllipse(64, 66, 62, 72);
      g.fillEllipse(31, 71, 30, 42);
      g.fillEllipse(97, 71, 30, 42);
      g.fillStyle(accent, 1).fillEllipse(64, 77, 38, 42);
      g.fillStyle(body, 1).fillTriangle(39, 43, 39, 14, 58, 40).fillTriangle(70, 40, 89, 14, 89, 43);
      g.lineStyle(5, 0x1a1020, 0.75).strokeEllipse(64, 66, 62, 72);
      g.fillStyle(0xffffff, 1).fillCircle(51, 57, 11).fillCircle(77, 57, 11);
      g.fillStyle(eyes, 1).fillCircle(52, 58, 6).fillCircle(78, 58, 6);
      g.fillStyle(0x1a1020, 1).fillTriangle(58, 73, 70, 73, 64, 82);
      g.fillStyle(0xffb536, 1).fillEllipse(52, 103, 16, 8).fillEllipse(76, 103, 16, 8);
    } else if (appearance.form === 'dragon') {
      g.fillStyle(body, 1).fillTriangle(39, 46, 12, 18, 30, 66).fillTriangle(89, 46, 116, 18, 98, 66);
      g.fillTriangle(33, 77, 10, 95, 43, 90);
      g.fillStyle(accent, 1).fillEllipse(64, 79, 30, 38);
      g.fillStyle(body, 1).fillCircle(64, 61, 38);
      g.lineStyle(6, 0x1a1020, 0.8).strokeCircle(64, 61, 38);
      g.fillStyle(accent, 1).fillTriangle(39, 39, 40, 16, 55, 38).fillTriangle(73, 38, 88, 16, 89, 39);
      g.fillStyle(0xffffff, 1).fillCircle(51, 58, 10).fillCircle(77, 58, 10);
      g.fillStyle(eyes, 1).fillCircle(53, 59, 6).fillCircle(79, 59, 6);
      g.fillStyle(0x1a1020, 1).fillCircle(58, 75, 3).fillCircle(70, 75, 3);
    } else {
      g.fillStyle(body, 1).fillTriangle(33, 48, 18, 18, 53, 38).fillTriangle(75, 38, 110, 18, 95, 48);
      g.fillTriangle(42, 83, 50, 112, 62, 88).fillTriangle(66, 88, 78, 112, 86, 83);
      g.fillCircle(64, 62, 38);
      g.lineStyle(6, 0x1a1020, 0.8).strokeCircle(64, 62, 38);
      g.fillStyle(accent, 1).fillEllipse(64, 77, 36, 22);
      g.fillStyle(0xffffff, 1).fillCircle(51, 57, 10).fillCircle(77, 57, 10);
      g.fillStyle(eyes, 1).fillCircle(53, 58, 6).fillCircle(79, 58, 6);
      g.fillStyle(0x1a1020, 1).fillCircle(64, 74, 4);
    }

    g.fillStyle(0xffffff, 0.32).fillCircle(47, 43, 10);
    g.generateTexture(`pet-${item.id}`, 128, 128);
    g.destroy();
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
