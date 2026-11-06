import Phaser from 'phaser';

export interface LobImpact {
  x: number;
  y: number;
  damage: number;
  radius: number;
}

/**
 * Projectile lancé en cloche : il est volontairement hors du moteur de collisions Arcade.
 * Il survole donc les murs, annonce sa zone d'impact, puis laisse au joueur le temps d'esquiver.
 */
export class LobbedProjectile {
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly marker: Phaser.GameObjects.Arc;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private active = false;
  private bornAt = 0;
  private duration = 0;
  private fromX = 0;
  private fromY = 0;
  private toX = 0;
  private toY = 0;
  private damage = 0;
  private radius = 0;

  constructor(scene: Phaser.Scene) {
    this.marker = scene.add.circle(0, 0, 1, 0xff5b43, 0.1).setStrokeStyle(3, 0xffd86b, 0.8).setVisible(false).setDepth(-1);
    this.shadow = scene.add.ellipse(0, 0, 1, 1, 0x1b1836, 0.28).setVisible(false).setDepth(2);
    this.sprite = scene.add.image(0, 0, 'enemy-fireball').setVisible(false).setDepth(20);
  }

  get isActive(): boolean {
    return this.active;
  }

  launch(
    time: number,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    damage: number,
    radius: number,
    duration: number,
  ): void {
    this.active = true;
    this.bornAt = time;
    this.duration = duration;
    this.fromX = fromX;
    this.fromY = fromY;
    this.toX = toX;
    this.toY = toY;
    this.damage = damage;
    this.radius = radius;
    this.marker.setPosition(toX, toY).setRadius(radius).setAlpha(0.18).setVisible(true);
    this.shadow.setPosition(fromX, fromY).setDisplaySize(radius * 0.62, radius * 0.3).setVisible(true);
    this.sprite.setPosition(fromX, fromY).setDisplaySize(34, 34).setVisible(true).setAlpha(1).setScale(0.8);
  }

  update(time: number): LobImpact | null {
    if (!this.active) return null;
    const t = Phaser.Math.Clamp((time - this.bornAt) / this.duration, 0, 1);
    const x = Phaser.Math.Linear(this.fromX, this.toX, t);
    const y = Phaser.Math.Linear(this.fromY, this.toY, t);
    const arc = Math.sin(t * Math.PI) * Math.min(150, Math.max(82, Phaser.Math.Distance.Between(this.fromX, this.fromY, this.toX, this.toY) * 0.22));
    this.sprite.setPosition(x, y - arc).setScale(0.78 + Math.sin(t * Math.PI) * 0.72).setAngle(t * 520);
    this.shadow.setPosition(x, y).setAlpha(0.2 + t * 0.24);
    this.marker.setAlpha(0.1 + t * 0.38).setScale(0.72 + t * 0.28);
    if (t < 1) return null;
    const impact = { x: this.toX, y: this.toY, damage: this.damage, radius: this.radius };
    this.kill();
    return impact;
  }

  kill(): void {
    this.active = false;
    this.sprite.setVisible(false);
    this.marker.setVisible(false);
    this.shadow.setVisible(false);
  }

  destroy(): void {
    this.marker.destroy();
    this.shadow.destroy();
    this.sprite.destroy();
  }
}
