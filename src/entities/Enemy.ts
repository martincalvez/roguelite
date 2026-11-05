import Phaser from 'phaser';
import { COMBAT } from '../data';
import type { EnemyDef } from '../types';

/** Un tireur recule s'il est plus près que cette fraction de sa distance de garde. */
const TOO_CLOSE_RATIO = 0.8;

/**
 * Ennemi poolé, configuré par un EnemyDef. Ne connaît ni le joueur ni les projectiles :
 * la scène lui donne la position de la cible, et il annonce ses tirs par l'événement
 * 'enemy-shoot' (x, y, angle, speed, damage).
 */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  def!: EnemyDef;
  hp = 0;
  private nextFireAt = 0;
  private flashUntil = 0;
  private knockbackUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
  }

  spawn(def: EnemyDef, x: number, y: number, time: number): void {
    this.def = def;
    this.hp = def.hp;
    this.enableBody(true, x, y, true, true);
    this.setTexture(`enemy-${def.id}`);
    this.setCircle(def.radius);
    this.setCollideWorldBounds(true);
    this.setVelocity(0, 0);
    this.clearTint();
    this.flashUntil = 0;
    this.knockbackUntil = 0;
    // Départ décalé pour que les tireurs ne tirent pas tous en même temps.
    this.nextFireAt = time + Phaser.Math.FloatBetween(0.3, 1) * this.fireDelay();
  }

  /** Appelé à chaque frame par la scène, avec la position de la cible. */
  updateAI(time: number, targetX: number, targetY: number): void {
    if (this.flashUntil > 0 && time >= this.flashUntil) {
      this.clearTint();
      this.flashUntil = 0;
    }
    if (time < this.knockbackUntil) return; // en plein recul

    const def = this.def;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);

    if (def.behavior === 'shooter' || def.behavior === 'spreader') {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
      const keep = def.keepDistance ?? 0;
      if (dist > keep) this.moveAlong(angle, def.speed);
      else if (dist < keep * TOO_CLOSE_RATIO) this.moveAlong(angle, -def.speed);
      else this.setVelocity(0, 0);

      if (time >= this.nextFireAt) {
        this.nextFireAt = time + this.fireDelay();
        this.shoot(angle);
      }
    } else {
      // 'melee' (et 'boss' en attendant la tâche 2.6) : fonce sur le joueur.
      this.moveAlong(angle, def.speed);
    }
  }

  private moveAlong(angle: number, speed: number): void {
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  private fireDelay(): number {
    return 1000 / (this.def.fireRate ?? 1);
  }

  private shoot(angle: number): void {
    const def = this.def;
    const speed = def.projectileSpeed ?? 0;
    const count = def.behavior === 'spreader' ? (def.projectileCount ?? 1) : 1;
    const spread = Phaser.Math.DegToRad(def.spreadAngle ?? 0);
    for (let i = 0; i < count; i++) {
      const offset = count > 1 ? (i / (count - 1) - 0.5) * spread : 0;
      this.scene.events.emit('enemy-shoot', this.x, this.y, angle + offset, speed, def.damage);
    }
  }

  /**
   * Retire des PV, avec flash blanc et recul dans la direction (dirX, dirY) du coup.
   * Événements : 'enemy-hit' (x, y, dégâts, critique) ; à 0 PV, 'enemy-died' (def, x, y).
   */
  takeDamage(amount: number, isCrit: boolean, dirX: number, dirY: number, time: number): void {
    this.hp -= amount;
    this.scene.events.emit('enemy-hit', this.x, this.y - this.def.radius, amount, isCrit);
    if (this.hp <= 0) {
      this.kill();
      this.scene.events.emit('enemy-died', this.def, this.x, this.y);
      return;
    }
    this.setTintFill(0xffffff);
    this.flashUntil = time + COMBAT.flashMs;
    this.knockbackUntil = time + COMBAT.knockbackMs;
    this.setVelocity(dirX * COMBAT.knockbackSpeed, dirY * COMBAT.knockbackSpeed);
  }

  kill(): void {
    this.disableBody(true, true);
  }
}
