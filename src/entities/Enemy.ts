import Phaser from 'phaser';
import { COMBAT } from '../data';
import { bossPatternAt, ringAngles, spreadAngles } from '../systems/bossPatterns';
import type { BossAttackPattern, EnemyDef } from '../types';

/** Un tireur recule s'il est plus près que cette fraction de sa distance de garde. */
const TOO_CLOSE_RATIO = 0.8;

const BURN_TINT = 0xff5a1f;
const FREEZE_TINT = 0x66ccff;

/** Le chevalier bleu reste le portrait illustré du boss Liche ; les autres ennemis sont dessinés par BootScene. */
const ENEMY_ART: Record<string, string> = {
  liche: 'enemy-art-blue-knight',
};

/** Les ailes, capes et armes dépassent volontairement du collider : seule la masse du monstre touche le héros. */
const HITBOX_FACTORS: Record<string, number> = {
  archer_squelette: 0.82,
  shaman: 0.8,
  sentinelle_azur: 0.78,
  esprit_saphir: 0.78,
  chauve_souris_braise: 0.7,
  mage_ombre: 0.8,
  dragon_cendre: 0.9,
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
  // Boss : attaque en préparation, prochaine attaque, ruée, salve en cours.
  private pattern?: BossAttackPattern;
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
    this.setTexture(art && this.scene.textures.exists(art) ? art : `enemy-${def.id}`);
    // Les silhouettes font volontairement 3 à 5 fois le rayon de gameplay : elles restent lisibles au pouce.
    const targetHeight = def.radius * (def.boss ? 4.9 : def.id === 'chauve_souris_braise' ? 3.9 : 4.25);
    this.setScale(targetHeight / Math.max(this.frame.width, this.frame.height));
    this.setOrigin(0.5, 0.57);
    // Centre le collider sur le torse, pas sur les ailes, la cape, l'ombre ou l'arme.
    const scaleX = Math.max(Math.abs(this.scaleX), 0.001);
    const scaleY = Math.max(Math.abs(this.scaleY), 0.001);
    const hitboxFactor = HITBOX_FACTORS[def.id] ?? (def.boss ? 0.92 : 0.9);
    const radius = Math.min(def.radius * hitboxFactor / scaleX, def.radius * hitboxFactor / scaleY);
    this.setCircle(radius, (this.frame.width - radius * 2) / 2, this.frame.height * 0.54 - radius);
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
    this.pattern = undefined;
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
  updateAI(time: number, targetX: number, targetY: number, moveX = targetX, moveY = targetY, targetVisible = true): void {
    if (this.updateStatus(time)) return; // mort de brûlure
    if (time < this.knockbackUntil) return; // en plein recul

    const def = this.def;
    const speed = time < this.freezeUntil ? def.speed * (1 - this.freezeSlow) : def.speed;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    const moveAngle = Phaser.Math.Angle.Between(this.x, this.y, moveX, moveY);
    this.setFlipX(Math.cos(targetVisible ? angle : moveAngle) < -0.12);

    if (def.behavior === 'boss') {
      this.updateBoss(time, angle, speed, moveAngle, targetX, targetY);
    } else if (def.behavior === 'shooter' || def.behavior === 'spreader' || def.behavior === 'fireball' || def.behavior === 'lobber') {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
      const keep = def.keepDistance ?? 0;
      if (this.stationary) this.setVelocity(0, 0);
      else if (!targetVisible) this.moveAlong(moveAngle, speed);
      else if (dist > keep) this.moveAlong(angle, speed);
      else if (dist < keep * TOO_CLOSE_RATIO) this.moveAlong(angle, -speed);
      else this.setVelocity(0, 0);

      // Le tir en cloche passe au-dessus des murs : il n'exige donc pas de ligne de vue.
      if ((targetVisible || def.behavior === 'lobber') && time >= this.nextFireAt) {
        this.nextFireAt = time + this.fireDelay();
        if (def.behavior === 'fireball') {
          this.scene.events.emit('enemy-fireball', this.x, this.y, angle, def.projectileSpeed ?? 0, this.damage, def.explosionRadius ?? 64);
        } else if (def.behavior === 'lobber') {
          this.scene.events.emit(
            'enemy-lob',
            this.x,
            this.y,
            targetX,
            targetY,
            this.damage,
            def.explosionRadius ?? 72,
            def.lobDurationMs ?? 760,
          );
        } else {
          this.shoot(angle);
        }
      }
    } else {
      // 'melee' : fonce sur le joueur.
      this.moveAlong(moveAngle, speed);
    }
  }

  /**
   * Boss : poursuit le joueur, puis prépare l'attaque suivante de sa boucle (clignotement pendant
   * warnMs, pour qu'on puisse l'esquiver) avant de la déclencher.
   */
  private updateBoss(
    time: number,
    angleToTarget: number,
    speed: number,
    angleToRoute: number,
    targetX: number,
    targetY: number,
  ): void {
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

    if (this.pattern !== undefined) {
      this.setVelocity(0, 0);
      if (time < this.warnUntil) return; // avertissement en cours
      this.executePattern(time, angleToTarget, targetX, targetY);
      this.pattern = undefined;
      this.nextPatternAt = time + cfg.cycleMs;
      return;
    }

    if (time >= this.nextPatternAt) {
      this.pattern = bossPatternAt(cfg.patternCycle, this.patternIndex++);
      this.warnUntil = time + cfg.warnMs;
      this.setVelocity(0, 0);
      return;
    }
    this.moveAlong(angleToRoute, speed);
  }

  private executePattern(time: number, angleToTarget: number, targetX: number, targetY: number): void {
    const cfg = this.def.boss!;
    if (this.pattern === 'charge') {
      this.moveAlong(angleToTarget, cfg.chargeSpeed); // ruée vers la position du joueur
      this.chargeUntil = time + cfg.chargeMs;
      return;
    }
    if (this.pattern === 'radial') {
      for (const angle of ringAngles(this.def.projectileCount ?? 0)) {
        this.scene.events.emit('enemy-shoot', this.x, this.y, angle, this.def.projectileSpeed ?? 0, this.damage);
      }
      return;
    }
    if (this.pattern === 'volley') {
      this.volleyLeft = cfg.volleyCount;
      this.nextVolleyAt = time;
      return;
    }
    if (this.pattern === 'fireRing') {
      const radius = this.def.explosionRadius;
      if (radius === undefined) return;
      for (const angle of ringAngles(cfg.fireballCount)) {
        this.scene.events.emit('enemy-fireball', this.x, this.y, angle, this.def.projectileSpeed ?? 0, this.damage, radius);
      }
      return;
    }
    const radius = this.def.explosionRadius;
    const duration = this.def.lobDurationMs;
    if (radius === undefined || duration === undefined) return;
    for (const angle of spreadAngles(angleToTarget, cfg.lobCount, cfg.lobSpreadAngle)) {
      this.scene.events.emit(
        'enemy-lob',
        this.x,
        this.y,
        targetX + Math.cos(angle) * cfg.lobTargetSpread,
        targetY + Math.sin(angle) * cfg.lobTargetSpread,
        this.damage,
        radius,
        duration,
      );
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
