import Phaser from 'phaser';
import { COMBAT } from '../data';
import type { EnemyDef } from '../types';

/** Un tireur recule s'il est plus près que cette fraction de sa distance de garde. */
const TOO_CLOSE_RATIO = 0.8;

const BURN_TINT = 0xff5a1f;
const FREEZE_TINT = 0x66ccff;

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
  private burnUntil = 0;
  private burnDps = 0;
  private nextBurnTick = 0;
  private freezeUntil = 0;
  private freezeSlow = 0;
  private tintState = 0; // 0 aucun, 1 brûlure, 2 givre, 3 flash blanc
  /** Prochain instant où un orbe protecteur peut le toucher. */
  nextOrbHitAt = 0;

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
    this.burnUntil = 0;
    this.freezeUntil = 0;
    this.tintState = 0;
    this.nextOrbHitAt = 0;
    // Départ décalé pour que les tireurs ne tirent pas tous en même temps.
    this.nextFireAt = time + Phaser.Math.FloatBetween(0.3, 1) * this.fireDelay();
  }

  /** Appelé à chaque frame par la scène, avec la position de la cible. */
  updateAI(time: number, targetX: number, targetY: number): void {
    if (this.updateStatus(time)) return; // mort de brûlure
    if (time < this.knockbackUntil) return; // en plein recul

    const def = this.def;
    const speed = time < this.freezeUntil ? def.speed * (1 - this.freezeSlow) : def.speed;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);

    if (def.behavior === 'shooter' || def.behavior === 'spreader') {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
      const keep = def.keepDistance ?? 0;
      if (dist > keep) this.moveAlong(angle, speed);
      else if (dist < keep * TOO_CLOSE_RATIO) this.moveAlong(angle, -speed);
      else this.setVelocity(0, 0);

      if (time >= this.nextFireAt) {
        this.nextFireAt = time + this.fireDelay();
        this.shoot(angle);
      }
    } else {
      // 'melee' (et 'boss' en attendant la tâche 2.6) : fonce sur le joueur.
      this.moveAlong(angle, speed);
    }
  }

  /** Brûlure (dégâts par paliers) et teinte visuelle. Renvoie vrai si l'ennemi est mort. */
  private updateStatus(time: number): boolean {
    if (this.burnUntil > time && time >= this.nextBurnTick) {
      this.nextBurnTick = time + COMBAT.statusTickMs;
      if (this.takeDotDamage((this.burnDps * COMBAT.statusTickMs) / 1000)) return true;
    }
    const state = this.flashUntil > time ? 3 : this.freezeUntil > time ? 2 : this.burnUntil > time ? 1 : 0;
    if (state !== this.tintState) {
      this.tintState = state;
      if (state === 3) this.setTintFill(0xffffff);
      else if (state === 2) this.setTintFill(FREEZE_TINT);
      else if (state === 1) this.setTintFill(BURN_TINT);
      else this.clearTint();
    }
    return false;
  }

  applyBurn(dps: number, durationSec: number, time: number): void {
    this.burnDps = dps;
    this.burnUntil = time + durationSec * 1000;
    if (this.nextBurnTick < time) this.nextBurnTick = time + COMBAT.statusTickMs;
  }

  applyFreeze(slow: number, durationSec: number, time: number): void {
    this.freezeSlow = slow;
    this.freezeUntil = time + durationSec * 1000;
  }

  /** Dégâts sans flash ni recul (brûlure). Renvoie vrai si l'ennemi meurt. */
  private takeDotDamage(amount: number): boolean {
    this.hp -= amount;
    this.scene.events.emit('enemy-hit', this.x, this.y - this.def.radius, Math.round(amount), false);
    if (this.hp > 0) return false;
    this.kill();
    this.scene.events.emit('enemy-died', this.def, this.x, this.y);
    return true;
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
    this.flashUntil = time + COMBAT.flashMs;
    this.knockbackUntil = time + COMBAT.knockbackMs;
    this.setVelocity(dirX * COMBAT.knockbackSpeed, dirY * COMBAT.knockbackSpeed);
  }

  kill(): void {
    this.disableBody(true, true);
  }
}
