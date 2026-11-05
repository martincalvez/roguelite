import Phaser from 'phaser';

/** Orbe d'XP lâché par un ennemi mort, recyclé via un groupe poolé. */
export class XpOrb extends Phaser.Physics.Arcade.Sprite {
  value = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'xp-orb');
  }

  spawn(x: number, y: number, value: number): void {
    this.enableBody(true, x, y, true, true);
    this.setActive(true).setVisible(true).setAlpha(1).setAngle(0).setDisplaySize(42, 42);
    this.value = value;
    this.setCircle(14, 7, 7);
    this.setVelocity(0, 0);
  }

  /** Aspiré vers un point à la vitesse donnée. */
  pullTowards(x: number, y: number, speed: number): void {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, x, y);
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  kill(): void {
    this.setVelocity(0, 0).setAlpha(0);
    this.disableBody(true, true);
  }
}
