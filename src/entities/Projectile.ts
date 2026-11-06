import Phaser from 'phaser';

/**
 * Taille de rendu et rayon de gameplay sont volontairement séparés : les nouvelles
 * illustrations restent lisibles sur téléphone sans rendre un tir plus facile à toucher.
 */
const PROJECTILE_VISUALS: Record<string, { width: number; height: number; worldRadius: number }> = {
  projectile: { width: 40, height: 24, worldRadius: 8 },
  'projectile-bolt': { width: 24, height: 24, worldRadius: 9 },
  'projectile-shuriken': { width: 28, height: 28, worldRadius: 10 },
  'vfx-arcane-arrow': { width: 44, height: 24, worldRadius: 8 },
  'vfx-fireball': { width: 30, height: 30, worldRadius: 9 },
  'vfx-ice-shard': { width: 28, height: 28, worldRadius: 8 },
};

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
    const visual = PROJECTILE_VISUALS[texture] ?? PROJECTILE_VISUALS['projectile-bolt'];
    this.setDisplaySize(visual.width, visual.height);
    this.damage = damage;
    this.isCrit = isCrit;
    this.speed = speed;
    this.pierceLeft = pierce;
    this.ricochetLeft = ricochet;
    this.hits.length = 0;
    const radius = visual.worldRadius / Math.max(Math.abs(this.scaleX), 0.001);
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
