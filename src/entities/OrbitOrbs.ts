import Phaser from 'phaser';
import { COMBAT } from '../data';

/** Orbes protecteurs qui tournent autour du héros et blessent au contact (compétence « orbe »). */
export class OrbitOrbs {
  readonly group: Phaser.Physics.Arcade.Group;
  damage = 0;
  private count = 0;

  constructor(scene: Phaser.Scene) {
    this.group = scene.physics.add.group();
  }

  /** Règle le nombre d'orbes actifs et leurs dégâts (appelé quand les compétences changent). */
  setOrbs(count: number, damage: number): void {
    this.damage = damage;
    this.count = count;
    const list = this.group.getChildren() as Phaser.Physics.Arcade.Sprite[];
    while (list.length < count) {
      const orb = this.group.create(0, 0, 'orbit-orb') as Phaser.Physics.Arcade.Sprite;
      orb.setCircle(orb.width / 2).setImmovable(true).setDepth(50);
    }
    for (let i = 0; i < list.length; i++) {
      if (i >= count) list[i].disableBody(true, true);
      else if (!list[i].active) list[i].enableBody(true, 0, 0, true, true);
    }
  }

  /** À appeler à chaque frame : place les orbes sur leur cercle autour de (cx, cy). */
  update(time: number, cx: number, cy: number): void {
    if (this.count === 0) return;
    const base = Phaser.Math.DegToRad((time * COMBAT.orbSpeedDegPerSec) / 1000);
    const list = this.group.getChildren() as Phaser.Physics.Arcade.Sprite[];
    for (let i = 0; i < this.count; i++) {
      const a = base + (i * Math.PI * 2) / this.count;
      list[i].setPosition(cx + Math.cos(a) * COMBAT.orbRadius, cy + Math.sin(a) * COMBAT.orbRadius);
    }
  }
}
