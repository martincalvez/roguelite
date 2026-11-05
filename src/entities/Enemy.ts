import Phaser from 'phaser';
import { COMBAT } from '../data';
import type { EnemyDef } from '../types';

/** Un tireur recule s'il est plus près que cette fraction de sa distance de garde. */
const TOO_CLOSE_RATIO = 0.8;

const BURN_TINT = 0xff5a1f;
const FREEZE_TINT = 0x66ccff;

/** Visuels Gemini déjà détourés ; les autres ennemis gardent leurs textures de secours. */
const ENEMY_ART: Record<string, string> = {
  gobelin: 'enemy-art-crystal-green',
  archer_squelette: 'enemy-art-turret',
  shaman: 'enemy-art-crystal-green',
  ogre: 'enemy-art-crystal-pink',
  liche: 'enemy-art-blue-knight',
  golem_floral: 'enemy-art-crystal-green',
  gardien_racines: 'enemy-art-crystal-green',
  chauve_souris_braise: 'enemy-art-crystal-pink',
  mage_ombre: 'enemy-art-crystal-green',
  elementaire_lave: 'enemy-art-crystal-pink',
  golem_cendre: 'enemy-art-crystal-pink',
};

/**
 * Ennemi poolé, configuré par un EnemyDef. Ne connaît ni le joueur ni les projectiles :
 * la scène lui donne la position de la cible, et il annonce ses tirs par l'événement
 * 'enemy-shoot' (x, y, angle, speed, damage).
 */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  def!: EnemyDef;
  hp = 0;
  maxHp = 0;
  /** Dégâts de contact et de tir, après multiplication par la difficulté du chapitre et de la salle. */
  damage = 0;
  private nextFireAt = 0;
  private flashUntil = 0;
  private knockbackUntil = 0;
  private burnUntil = 0;
  private burnDps = 0;
  private nextBurnTick = 0;
  private freezeUntil = 0;
  private freezeSlow = 0;
  // Boss : attaque en préparation (-1 aucune), prochaine attaque, ruée, salve en cours.
  private pattern = -1;
  private patternIndex = 0;
  private warnUntil = 0;
  private nextPatternAt = 0;
  private chargeUntil = 0;
  private volleyLeft = 0;
  private nextVolleyAt = 0;
  private tintState = 0; // 0 aucun, 1 brûlure, 2 givre, 3 flash blanc
  private stationary = false;
  /** Prochain instant où un orbe protecteur peut le toucher. */
  nextOrbHitAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
  }

  /** `hpScale` et `damageScale` : multiplicateurs de PV et de dégâts (chapitre × salle). */
  spawn(def: EnemyDef, x: number, y: number, time: number, hpScale: number, damageScale: number): void {
    this.def = def;
    this.hp = def.hp * hpScale;
    this.maxHp = this.hp;
    this.damage = def.damage * damageScale;
    this.enableBody(true, x, y, true, true);
    const art = ENEMY_ART[def.id];
    if (art && this.scene.textures.exists(art)) {
      this.setTexture(art);
      const targetHeight = def.radius * (def.boss ? 4.8 : 3.3);
      this.setScale(targetHeight / Math.max(this.frame.width, this.frame.height));
    } else {
      this.setTexture(`enemy-${def.id}`).setScale(1);
    }
    // Garde la collision gameplay à la taille définie, même si l'illustration est agrandie.
    const scaleX = Math.max(Math.abs(this.scaleX), 0.001);
    const scaleY = Math.max(Math.abs(this.scaleY), 0.001);
    const radius = Math.min(def.radius / scaleX, def.radius / scaleY);
    this.setCircle(radius, (this.frame.width - radius * 2) / 2, (this.frame.height - radius * 2) / 2);
    this.stationary = def.id === 'archer_squelette';
    this.setCollideWorldBounds(true);
    this.setVelocity(0, 0);
    this.clearTint();
    this.flashUntil = 0;
    this.knockbackUntil = 0;
    this.burnUntil = 0;
    this.freezeUntil = 0;
    this.tintState = 0;
    this.nextOrbHitAt = 0;
    this.pattern = -1;
    this.patternIndex = 0;
    this.warnUntil = 0;
    this.chargeUntil = 0;
    this.volleyLeft = 0;
    if (def.boss) {
      this.nextPatternAt = time + def.boss.cycleMs / 2;
      this.scene.events.emit('boss-spawned', def.name, this.hp, this.maxHp);
    }
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

    if (def.behavior === 'boss') {
      this.updateBoss(time, angle, speed);
    } else if (def.behavior === 'shooter' || def.behavior === 'spreader') {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
      const keep = def.keepDistance ?? 0;
      if (this.stationary) this.setVelocity(0, 0);
      else if (dist > keep) this.moveAlong(angle, speed);
      else if (dist < keep * TOO_CLOSE_RATIO) this.moveAlong(angle, -speed);
      else this.setVelocity(0, 0);

      if (time >= this.nextFireAt) {
        this.nextFireAt = time + this.fireDelay();
        this.shoot(angle);
      }
    } else {
      // 'melee' : fonce sur le joueur.
      this.moveAlong(angle, speed);
    }
  }

  /**
   * Boss : poursuit le joueur, puis toutes les cycleMs prépare une attaque (clignotement pendant
   * warnMs, pour qu'on puisse l'esquiver) et enchaîne ruée → cercle → salve visée.
   */
  private updateBoss(time: number, angleToTarget: number, speed: number): void {
    const cfg = this.def.boss!;
    if (time < this.chargeUntil) return; // en pleine ruée : la vitesse est déjà réglée

    if (this.volleyLeft > 0) {
      this.setVelocity(0, 0);
      if (time >= this.nextVolleyAt) {
        this.nextVolleyAt = time + cfg.volleyIntervalMs;
        this.volleyLeft--;
        this.scene.events.emit('enemy-shoot', this.x, this.y, angleToTarget, this.def.projectileSpeed ?? 0, this.damage);
      }
      return;
    }

    if (this.pattern !== -1) {
      this.setVelocity(0, 0);
      if (time < this.warnUntil) return; // avertissement en cours
      this.executePattern(time, angleToTarget);
      this.pattern = -1;
      this.nextPatternAt = time + cfg.cycleMs;
      return;
    }

    if (time >= this.nextPatternAt) {
      this.pattern = this.patternIndex++ % 3;
      this.warnUntil = time + cfg.warnMs;
      this.setVelocity(0, 0);
      return;
    }
    this.moveAlong(angleToTarget, speed);
  }

  private executePattern(time: number, angleToTarget: number): void {
    const cfg = this.def.boss!;
    if (this.pattern === 0) {
      this.moveAlong(angleToTarget, cfg.chargeSpeed); // ruée vers la position du joueur
      this.chargeUntil = time + cfg.chargeMs;
    } else if (this.pattern === 1) {
      const count = this.def.projectileCount ?? 1;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        this.scene.events.emit('enemy-shoot', this.x, this.y, a, this.def.projectileSpeed ?? 0, this.damage);
      }
    } else {
      this.volleyLeft = cfg.volleyCount;
      this.nextVolleyAt = time;
    }
  }

  /** Brûlure (dégâts par paliers) et teinte visuelle. Renvoie vrai si l'ennemi est mort. */
  private updateStatus(time: number): boolean {
    if (this.burnUntil > time && time >= this.nextBurnTick) {
      this.nextBurnTick = time + COMBAT.statusTickMs;
      if (this.takeDotDamage((this.burnDps * COMBAT.statusTickMs) / 1000)) return true;
    }
    const warning = this.warnUntil > time && Math.floor(time / 90) % 2 === 0; // clignote avant une attaque de boss
    const state = warning || this.flashUntil > time ? 3 : this.freezeUntil > time ? 2 : this.burnUntil > time ? 1 : 0;
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
    if (this.def.boss) this.scene.events.emit('boss-hp', Math.max(0, this.hp), this.maxHp);
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
      this.scene.events.emit('enemy-shoot', this.x, this.y, angle + offset, speed, this.damage);
    }
  }

  /**
   * Retire des PV, avec flash blanc et recul dans la direction (dirX, dirY) du coup.
   * Événements : 'enemy-hit' (x, y, dégâts, critique) ; à 0 PV, 'enemy-died' (def, x, y).
   */
  takeDamage(amount: number, isCrit: boolean, dirX: number, dirY: number, time: number): void {
    this.hp -= amount;
    this.scene.events.emit('enemy-hit', this.x, this.y - this.def.radius, amount, isCrit);
    if (this.def.boss) this.scene.events.emit('boss-hp', Math.max(0, this.hp), this.maxHp);
    if (this.hp <= 0) {
      this.kill();
      this.scene.events.emit('enemy-died', this.def, this.x, this.y);
      return;
    }
    this.flashUntil = time + COMBAT.flashMs;
    if (this.def.boss) return; // les boss ne reculent pas
    this.knockbackUntil = time + COMBAT.knockbackMs;
    this.setVelocity(dirX * COMBAT.knockbackSpeed, dirY * COMBAT.knockbackSpeed);
  }

  kill(): void {
    this.disableBody(true, true);
  }
}
