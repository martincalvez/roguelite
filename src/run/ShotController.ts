import Phaser from 'phaser';
import { COMBAT } from '../data';
import type { Enemy } from '../entities/Enemy';
import { OrbitOrbs } from '../entities/OrbitOrbs';
import type { Projectile } from '../entities/Projectile';
import { GameState } from '../state/GameState';
import { damageAmount, rollCrit } from '../systems/combat';
import { computeShotEffects, type ShotEffects } from '../systems/skills';
import type { RunContext } from './RunContext';

/**
 * Tout ce que le héros envoie sur les ennemis : arme équipée, tir automatique, salve
 * (multiple, diagonale, arrière), effets des projectiles (perforation, ricochet, brûlure, givre)
 * et orbes protecteurs.
 */
export class ShotController {
  private effects!: ShotEffects;
  private readonly orbs: OrbitOrbs;
  private projectileTexture = 'projectile';
  private projectileSpeedFactor = 1;
  private weaponPierce = 0;
  private nextShotAt = 0;

  constructor(private readonly ctx: RunContext) {
    this.loadWeapon();
    this.orbs = new OrbitOrbs(ctx.scene);
    this.refresh();
    ctx.scene.physics.add.overlap(this.orbs.group, ctx.enemies, (_o, e) => this.onOrbHit(e as Enemy));
    ctx.scene.physics.add.overlap(ctx.playerProjectiles, ctx.enemies, (a, b) => this.onProjectileHit(a as Projectile, b as Enemy));
  }

  /** Recalcule les effets (compétences, passifs de départ, perforation de l'arme) et les orbes. À appeler quand une compétence est prise. */
  refresh(): void {
    const { runState } = this.ctx;
    this.effects = computeShotEffects(runState.skills, runState.passives);
    this.effects.pierce += this.weaponPierce;
    this.orbs.setOrbs(this.effects.orb?.count ?? 0, this.effects.orb?.damage ?? 0);
  }

  updateOrbs(time: number): void {
    this.orbs.update(time, this.ctx.player.x, this.ctx.player.y);
  }

  /** Tire sur l'ennemi le plus proche : à l'arrêt, ou en permanence si settings.alwaysShoot. */
  updateAutoFire(time: number): void {
    const { player } = this.ctx;
    if (player.isMoving && !GameState.data.settings.alwaysShoot) return;
    const target = this.nearestEnemy(player.x, player.y);
    if (!target) return;

    player.faceTowards(target.x, target.y);
    if (time < this.nextShotAt) return;

    const stats = player.stats;
    this.nextShotAt = time + 1000 / stats.attackSpeed;
    const isCrit = rollCrit(stats.critChance);
    const damage = damageAmount(stats.attack, isCrit, stats.critDamage);
    const angle = Phaser.Math.Angle.Between(player.x, player.y, target.x, target.y);
    this.fireVolley(angle, damage, isCrit);
  }

  /** Lit l'arme équipée : apparence du projectile, vitesse (bolt lent, shuriken rapide) et perforation. */
  private loadWeapon(): void {
    const weapon = GameState.equippedWeapon()?.def.weapon;
    const kind = weapon?.projectile ?? 'arrow';
    this.projectileTexture = kind === 'arrow' ? 'projectile' : `projectile-${kind}`;
    this.projectileSpeedFactor = COMBAT.projectileSpeedMultiplier[kind];
    this.weaponPierce = weapon?.pierce ?? 0;
  }

  /** Ennemi vivant le plus proche d'un point, en ignorant ceux déjà touchés par `projectile` s'il est donné. */
  private nearestEnemy(x: number, y: number, projectile?: Projectile): Enemy | null {
    const list = this.ctx.enemies.getChildren() as Enemy[];
    let best: Enemy | null = null;
    let bestDist = Infinity;
    for (let i = 0; i < list.length; i++) {
      if (!list[i].active || projectile?.hasHit(list[i])) continue;
      const d = Phaser.Math.Distance.Squared(x, y, list[i].x, list[i].y);
      if (d < bestDist) {
        bestDist = d;
        best = list[i];
      }
    }
    return best;
  }

  /** Une salve : projectiles parallèles vers l'avant, + diagonales et arrière selon les compétences. */
  private fireVolley(angle: number, damage: number, isCrit: boolean): void {
    const { player } = this.ctx;
    const fx = this.effects;
    const count = 1 + fx.multishot;
    const sideX = -Math.sin(angle);
    const sideY = Math.cos(angle);
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * COMBAT.multishotSpacing;
      this.shoot(player.x + sideX * offset, player.y + sideY * offset, angle, damage, isCrit);
    }
    if (fx.diagonal) {
      const spread = Phaser.Math.DegToRad(COMBAT.diagonalAngleDeg);
      this.shoot(player.x, player.y, angle - spread, damage, isCrit);
      this.shoot(player.x, player.y, angle + spread, damage, isCrit);
    }
    if (fx.rear) this.shoot(player.x, player.y, angle + Math.PI, damage, isCrit);
  }

  private shoot(x: number, y: number, angle: number, damage: number, isCrit: boolean): void {
    const projectile = this.ctx.playerProjectiles.get(x, y) as Projectile | null;
    projectile?.fire(
      x,
      y,
      angle,
      this.ctx.player.stats.projectileSpeed * this.projectileSpeedFactor,
      damage,
      isCrit,
      this.effects.pierce,
      this.effects.ricochet,
      this.projectileTexture,
    );
  }

  /** Un orbe touche un ennemi : dégâts, avec un délai avant de pouvoir le retoucher. */
  private onOrbHit(enemy: Enemy): void {
    const time = this.ctx.scene.time.now;
    if (!enemy.active || time < enemy.nextOrbHitAt) return;
    enemy.nextOrbHitAt = time + COMBAT.orbHitCooldownMs;
    const dx = enemy.x - this.ctx.player.x;
    const dy = enemy.y - this.ctx.player.y;
    const len = Math.hypot(dx, dy) || 1;
    enemy.takeDamage(this.orbs.damage, false, dx / len, dy / len, time);
  }

  private onProjectileHit(projectile: Projectile, enemy: Enemy): void {
    if (!projectile.active || !enemy.active || projectile.hasHit(enemy)) return;
    const time = this.ctx.scene.time.now;
    // Direction du coup, lue avant tout changement de vitesse du projectile.
    const v = (projectile.body as Phaser.Physics.Arcade.Body).velocity;
    const len = Math.hypot(v.x, v.y) || 1;
    projectile.registerHit(enemy);
    enemy.takeDamage(projectile.damage, projectile.isCrit, v.x / len, v.y / len, time);
    if (enemy.active) {
      const { burn, freeze } = this.effects;
      if (burn) enemy.applyBurn(burn.dps, burn.duration, time);
      if (freeze) enemy.applyFreeze(freeze.slow, freeze.duration, time);
    }

    if (projectile.pierceLeft > 0) {
      projectile.pierceLeft--; // traverse l'ennemi
      return;
    }
    if (projectile.ricochetLeft > 0) {
      const next = this.nearestEnemy(projectile.x, projectile.y, projectile);
      if (next) {
        projectile.ricochetLeft--;
        projectile.redirect(Phaser.Math.Angle.Between(projectile.x, projectile.y, next.x, next.y));
        return;
      }
    }
    projectile.kill();
  }
}
