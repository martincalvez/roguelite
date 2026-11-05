import Phaser from 'phaser';

/** Projectile du joueur, recyclé via un groupe poolé. */
export class Projectile extends Phaser.Physics.Arcade.Sprite {
  damage = 0;
  isCrit = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'projectile');
  }

  fire(x: number, y: number, angle: number, speed: number, damage: number, isCrit: boolean): void {
    this.enableBody(true, x, y, true, true);
    this.damage = damage;
    this.isCrit = isCrit;
    this.setCircle(this.width / 2);
    this.setCollideWorldBounds(true);
    (this.body as Phaser.Physics.Arcade.Body).onWorldBounds = true;
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  kill(): void {
    this.disableBody(true, true);
  }
}
