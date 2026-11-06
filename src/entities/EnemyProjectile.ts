import Phaser from 'phaser';

/** Projectile ennemi, recyclé via un groupe poolé. Détruit (désactivé) sur les murs. */
export class EnemyProjectile extends Phaser.Physics.Arcade.Sprite {
  damage = 0;
  private kind: 'bolt' | 'fireball' = 'bolt';
  private explosionRadius = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'enemy-projectile');
  }

  fire(
    x: number,
    y: number,
    angle: number,
    speed: number,
    damage: number,
    kind: 'bolt' | 'fireball' = 'bolt',
    explosionRadius = 0,
    artKey?: string,
  ): void {
    this.enableBody(true, x, y, true, true);
    this.kind = kind;
    this.explosionRadius = explosionRadius;
    const texture = artKey && this.scene.textures.exists(artKey)
      ? artKey
      : kind === 'fireball' ? 'enemy-fireball' : 'enemy-projectile';
    const isArrow = artKey === 'vfx-arcane-arrow';
    this.setTexture(texture);
    // L'illustration reste décorative : la zone de contact est définie juste après et ne grossit pas avec elle.
    this.setDisplaySize(
      isArrow ? 44 : kind === 'fireball' ? 42 : artKey ? 30 : 22,
      isArrow ? 24 : kind === 'fireball' ? 42 : artKey ? 30 : 22,
    ).setRotation(angle);
    this.damage = damage;
    const radius = 8 / Math.max(Math.abs(this.scaleX), 0.001);
    this.setCircle(radius, (this.frame.width - radius * 2) / 2, (this.frame.height - radius * 2) / 2);
    this.setCollideWorldBounds(true);
    (this.body as Phaser.Physics.Arcade.Body).onWorldBounds = true;
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  kill(): void {
    this.disableBody(true, true);
  }

  /** Désactive le projectile et renvoie son explosion, uniquement pour une boule de feu. */
  detonate(): { x: number; y: number; damage: number; radius: number } | null {
    if (!this.active) return null;
    const impact = this.kind === 'fireball'
      ? { x: this.x, y: this.y, damage: this.damage, radius: this.explosionRadius }
      : null;
    this.kill();
    return impact;
  }
}
