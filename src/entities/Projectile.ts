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

  fire(x: number, y: number, angle: number, speed: number, damage: number, isCrit: boolean, pierce: number, ricochet: number, texture: string): void {
    this.enableBody(true, x, y, true, true);
    this.setTexture(texture);
    const isArrow = texture === 'projectile';
    const isShuriken = texture === 'projectile-shuriken';
    const size = isArrow ? 40 : isShuriken ? 28 : 24;
    this.setDisplaySize(size, isArrow ? 24 : size);
    this.damage = damage;
    this.isCrit = isCrit;
    this.speed = speed;
    this.pierceLeft = pierce;
    this.ricochetLeft = ricochet;
    this.hits.length = 0;
    const worldRadius = isArrow ? 8 : isShuriken ? 10 : 9;
    const radius = worldRadius / Math.max(Math.abs(this.scaleX), 0.001);
    this.setCircle(radius, (this.frame.width - radius * 2) / 2, (this.frame.height - radius * 2) / 2);
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
    this.setRotation(angle);
    this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
  }

  kill(): void {
    this.disableBody(true, true);
  }
}
