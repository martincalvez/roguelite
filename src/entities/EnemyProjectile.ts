import Phaser from 'phaser';

/** Projectile ennemi, recyclé via un groupe poolé. Détruit (désactivé) sur les murs. */
export class EnemyProjectile extends Phaser.Physics.Arcade.Sprite {
  damage = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'enemy-projectile');
  }

  fire(x: number, y: number, angle: number, speed: number, damage: number): void {
    this.enableBody(true, x, y, true, true);
    this.damage = damage;
    this.setCircle(this.width / 2);
    this.setCollideWorldBounds(true);
    (this.body as Phaser.Physics.Arcade.Body).onWorldBounds = true;
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  kill(): void {
    this.disableBody(true, true);
  }
}
