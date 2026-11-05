import Phaser from 'phaser';

/** Projectile du joueur, recyclé via un groupe poolé. */
export class Projectile extends Phaser.Physics.Arcade.Sprite {
  damage = 0;
  isCrit = false;
  speed = 0;
  pierceLeft = 0;
  ricochetLeft = 0;
  /** Ennemis déjà touchés par ce tir (un tir perforant reste dans l'ennemi plusieurs frames). */
  private readonly hits: object[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'projectile');
  }

  fire(x: number, y: number, angle: number, speed: number, damage: number, isCrit: boolean, pierce: number, ricochet: number): void {
    this.enableBody(true, x, y, true, true);
    this.damage = damage;
    this.isCrit = isCrit;
    this.speed = speed;
    this.pierceLeft = pierce;
    this.ricochetLeft = ricochet;
    this.hits.length = 0;
    this.setCircle(this.width / 2);
    this.setCollideWorldBounds(true);
    (this.body as Phaser.Physics.Arcade.Body).onWorldBounds = true;
    this.redirect(angle);
  }

  hasHit(target: object): boolean {
    return this.hits.includes(target);
  }

  registerHit(target: object): void {
    this.hits.push(target);
  }

  /** Change la direction en gardant la vitesse (ricochet). */
  redirect(angle: number): void {
    this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
  }

  kill(): void {
    this.disableBody(true, true);
  }
}
