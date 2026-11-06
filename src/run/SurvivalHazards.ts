import Phaser from 'phaser';
import { ARENA } from '../config';
import { SURVIVAL } from '../data';
import { EnemyProjectile } from '../entities/EnemyProjectile';
import type { ArenaPoint } from '../systems/arenaLayout';
import { hasSurvivalFire, hasSurvivalRunes, hasSurvivalTurrets } from '../systems/survival';
import type { RunContext } from './RunContext';

interface FireZone {
  x: number;
  y: number;
  nextDamageAt: number;
  visual: Phaser.GameObjects.Container;
}

interface TurretZone {
  x: number;
  y: number;
  nextFireAt: number;
  recoilUntil: number;
  visual: Phaser.GameObjects.Container;
  cannon: Phaser.GameObjects.Image;
}

interface RuneZone {
  x: number;
  y: number;
  phase: 'idle' | 'warning' | 'flash';
  nextAt: number;
  visual: Phaser.GameObjects.Container;
  warning: Phaser.GameObjects.Graphics;
  flash: Phaser.GameObjects.Graphics;
}

/** Pièges colorés du mode Survie : braises, runes explosives et tourelles. */
export class SurvivalHazards {
  private zones: FireZone[] = [];
  private runes: RuneZone[] = [];
  private turrets: TurretZone[] = [];

  constructor(private readonly ctx: RunContext) {
    ctx.scene.events.on('room-changed', this.onRoomChanged, this);
    ctx.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      ctx.scene.events.off('room-changed', this.onRoomChanged, this);
      this.clear();
    });
  }

  update(time: number): void {
    const { player } = this.ctx;
    for (const zone of this.zones) {
      if (time < zone.nextDamageAt) continue;
      const body = player.body as Phaser.Physics.Arcade.Body;
      const touchRange = SURVIVAL.fireRadius + Math.max(body.halfWidth, body.halfHeight) * 0.6;
      if (Phaser.Math.Distance.Between(player.x, player.y, zone.x, zone.y) > touchRange) continue;
      zone.nextDamageAt = time + SURVIVAL.fireTickMs;
      player.takeDamage(SURVIVAL.fireDamage, time);
    }
    this.updateRunes(time);
    this.updateTurrets(time);
  }

  private onRoomChanged(room: number): void {
    this.clear();
    if (hasSurvivalFire(room)) this.addFireZones();
    if (hasSurvivalTurrets(room)) this.addTurrets();
    if (hasSurvivalRunes(room)) this.addRunes();
  }

  private addFireZones(): void {
    const layout = this.ctx.arena;
    const candidates: ArenaPoint[] = [];
    for (let row = 1; row < layout.rows - 2; row++) {
      for (let col = 1; col < layout.cols - 1; col++) {
        const index = row * layout.cols + col;
        if (layout.blocked[index]) continue;
        const point = { x: (col + 0.5) * layout.cell, y: (row + 0.5) * layout.cell };
        if (Phaser.Math.Distance.Between(point.x, point.y, layout.spawn.x, layout.spawn.y) < SURVIVAL.fireSafeDistance) continue;
        if (layout.obstacles.some((obstacle) => distanceToRect(point, obstacle) < SURVIVAL.fireObstacleClearance)) continue;
        candidates.push(point);
      }
    }

    Phaser.Utils.Array.Shuffle(candidates);
    const chosen: ArenaPoint[] = [];
    for (const point of candidates) {
      if (chosen.every((other) => Phaser.Math.Distance.Between(point.x, point.y, other.x, other.y) > SURVIVAL.fireSeparation)) {
        chosen.push(point);
      }
      if (chosen.length >= SURVIVAL.fireCount) break;
    }
    for (const point of chosen) this.addZone(point);
  }

  private addTurrets(): void {
    const layout = this.ctx.arena;
    const candidates: ArenaPoint[] = [];
    for (let row = 1; row < layout.rows - 2; row++) {
      for (let col = 1; col < layout.cols - 1; col++) {
        const index = row * layout.cols + col;
        if (layout.blocked[index]) continue;
        const point = { x: (col + 0.5) * layout.cell, y: (row + 0.5) * layout.cell };
        if (Phaser.Math.Distance.Between(point.x, point.y, layout.spawn.x, layout.spawn.y) < SURVIVAL.turretSafeDistance) continue;
        if (layout.obstacles.some((obstacle) => distanceToRect(point, obstacle) < SURVIVAL.turretObstacleClearance)) continue;
        if (this.zones.some((zone) => Phaser.Math.Distance.Between(ARENA.x + point.x, ARENA.y + point.y, zone.x, zone.y) < SURVIVAL.turretSeparation)) continue;
        candidates.push(point);
      }
    }
    Phaser.Utils.Array.Shuffle(candidates);
    const chosen: ArenaPoint[] = [];
    for (const point of candidates) {
      if (chosen.every((other) => Phaser.Math.Distance.Between(point.x, point.y, other.x, other.y) >= SURVIVAL.turretSeparation)) {
        chosen.push(point);
      }
      if (chosen.length >= SURVIVAL.turretCount) break;
    }
    for (const point of chosen) this.addTurret(point);
  }

  private addRunes(): void {
    const layout = this.ctx.arena;
    const candidates: ArenaPoint[] = [];
    for (let row = 1; row < layout.rows - 2; row++) {
      for (let col = 1; col < layout.cols - 1; col++) {
        const index = row * layout.cols + col;
        if (layout.blocked[index]) continue;
        const point = { x: (col + 0.5) * layout.cell, y: (row + 0.5) * layout.cell };
        if (Phaser.Math.Distance.Between(point.x, point.y, layout.spawn.x, layout.spawn.y) < SURVIVAL.runeSafeDistance) continue;
        if (layout.obstacles.some((obstacle) => distanceToRect(point, obstacle) < SURVIVAL.runeObstacleClearance)) continue;
        if (this.zones.some((zone) => Phaser.Math.Distance.Between(ARENA.x + point.x, ARENA.y + point.y, zone.x, zone.y) < SURVIVAL.runeSeparation)) continue;
        if (this.turrets.some((turret) => Phaser.Math.Distance.Between(ARENA.x + point.x, ARENA.y + point.y, turret.x, turret.y) < SURVIVAL.runeSeparation)) continue;
        candidates.push(point);
      }
    }
    Phaser.Utils.Array.Shuffle(candidates);
    const chosen: ArenaPoint[] = [];
    for (const point of candidates) {
      if (chosen.every((other) => Phaser.Math.Distance.Between(point.x, point.y, other.x, other.y) >= SURVIVAL.runeSeparation)) {
        chosen.push(point);
      }
      if (chosen.length >= SURVIVAL.runeCount) break;
    }
    for (const point of chosen) this.addRune(point);
  }

  private addZone(point: ArenaPoint): void {
    const x = ARENA.x + point.x;
    const y = ARENA.y + point.y;
    const visual = this.ctx.scene.add.container(x, y).setDepth(-2);
    const ring = this.ctx.scene.add.graphics();
    ring.fillStyle(0x501430, 0.34).fillCircle(0, 0, SURVIVAL.fireRadius + 9);
    ring.lineStyle(4, 0xff5d43, 0.94).strokeCircle(0, 0, SURVIVAL.fireRadius + 2);
    ring.lineStyle(2, 0xffdc5a, 0.88).strokeCircle(0, 0, SURVIVAL.fireRadius - 9);
    const embers = this.ctx.scene.add.graphics();
    embers.fillStyle(0xff5c34, 0.82).fillEllipse(-17, 7, 29, 41).fillEllipse(16, 9, 32, 45);
    embers.fillStyle(0xffa52e, 0.94).fillTriangle(-26, 14, -13, -36, 1, 15).fillTriangle(-3, 14, 8, -49, 22, 15).fillTriangle(14, 16, 30, -30, 37, 18);
    embers.fillStyle(0xffdf59, 1).fillTriangle(-17, 12, -10, -19, 0, 12).fillTriangle(-2, 14, 8, -33, 17, 14).fillTriangle(14, 16, 23, -13, 29, 18);
    embers.fillStyle(0xfff5bd, 0.92).fillTriangle(-4, 12, 8, -12, 17, 14);
    const sparks = this.ctx.scene.add.graphics();
    sparks.fillStyle(0xffdf6d, 0.92).fillCircle(-33, -25, 3).fillCircle(30, -16, 4).fillCircle(8, -58, 3);
    visual.add([ring, embers, sparks]);
    this.ctx.scene.tweens.add({ targets: embers, scaleX: 0.9, scaleY: 1.14, duration: 270, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.ctx.scene.tweens.add({ targets: sparks, y: -10, alpha: 0.22, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeOut' });
    this.ctx.scene.tweens.add({ targets: ring, scale: 1.08, alpha: 0.68, duration: 560, yoyo: true, repeat: -1 });
    this.zones.push({ x, y, nextDamageAt: 0, visual });
  }

  /** Tourelle statique : son tir peut être bloqué par les mêmes murs que ceux du héros. */
  private addTurret(point: ArenaPoint): void {
    const x = ARENA.x + point.x;
    const y = ARENA.y + point.y;
    const visual = this.ctx.scene.add.container(x, y).setDepth(5);
    const warning = this.ctx.scene.add.graphics();
    warning.fillStyle(0xff5048, 0.16).fillCircle(0, 0, 54);
    warning.lineStyle(3, 0xffd04e, 0.9).strokeCircle(0, 0, 42);
    const base = this.ctx.scene.add.ellipse(0, 15, 76, 28, 0x351f4c, 0.56);
    const cannon = this.ctx.scene.add.image(0, 0, 'enemy-art-turret').setDisplaySize(82, 82).setOrigin(0.5, 0.58);
    visual.add([warning, base, cannon]);
    this.ctx.scene.tweens.add({ targets: warning, scale: 1.16, alpha: 0.32, duration: 620, yoyo: true, repeat: -1 });
    this.turrets.push({
      x,
      y,
      nextFireAt: this.ctx.scene.time.now + 1000 / SURVIVAL.turretFireRate,
      recoilUntil: 0,
      visual,
      cannon,
    });
  }

  /** Rune dormante, puis charge lisible et explosion : aucun objet n'est créé dans update(). */
  private addRune(point: ArenaPoint): void {
    const x = ARENA.x + point.x;
    const y = ARENA.y + point.y;
    const visual = this.ctx.scene.add.container(x, y).setDepth(2);
    const base = this.ctx.scene.add.graphics();
    base.fillStyle(0x24194e, 0.38).fillCircle(0, 0, SURVIVAL.runeRadius - 9);
    base.lineStyle(3, 0x8a63ff, 0.76).strokeCircle(0, 0, SURVIVAL.runeRadius - 14);
    base.lineStyle(3, 0x65e5ff, 0.8).strokeTriangle(0, -26, 24, 18, -24, 18);
    const warning = this.ctx.scene.add.graphics().setVisible(false);
    warning.fillStyle(0xd65cff, 0.22).fillCircle(0, 0, SURVIVAL.runeRadius);
    warning.lineStyle(5, 0xffe16d, 0.98).strokeCircle(0, 0, SURVIVAL.runeRadius - 3);
    const flash = this.ctx.scene.add.graphics().setVisible(false);
    flash.fillStyle(0xf9eeff, 0.92).fillCircle(0, 0, SURVIVAL.runeRadius * 0.72);
    visual.add([base, warning, flash]);
    this.runes.push({
      x,
      y,
      phase: 'idle',
      nextAt: this.ctx.scene.time.now + SURVIVAL.runeCooldownMs,
      visual,
      warning,
      flash,
    });
  }

  private updateRunes(time: number): void {
    const { player } = this.ctx;
    for (const rune of this.runes) {
      if (rune.phase === 'warning') {
        const progress = Phaser.Math.Clamp(1 - (rune.nextAt - time) / SURVIVAL.runeWarnMs, 0, 1);
        rune.warning.setScale(0.5 + progress * 0.6).setAlpha(0.3 + progress * 0.7);
        if (time < rune.nextAt) continue;
        const body = player.body as Phaser.Physics.Arcade.Body;
        const touchRange = SURVIVAL.runeRadius + Math.max(body.halfWidth, body.halfHeight) * 0.6;
        if (Phaser.Math.Distance.Between(player.x, player.y, rune.x, rune.y) <= touchRange) player.takeDamage(SURVIVAL.runeDamage, time);
        rune.warning.setVisible(false);
        rune.flash.setVisible(true).setScale(0.54).setAlpha(1);
        rune.phase = 'flash';
        rune.nextAt = time + SURVIVAL.runeFlashMs;
        continue;
      }
      if (rune.phase === 'flash') {
        const progress = Phaser.Math.Clamp(1 - (rune.nextAt - time) / SURVIVAL.runeFlashMs, 0, 1);
        rune.flash.setScale(0.54 + progress * 1.05).setAlpha(1 - progress);
        if (time < rune.nextAt) continue;
        rune.flash.setVisible(false);
        rune.phase = 'idle';
        rune.nextAt = time + SURVIVAL.runeCooldownMs;
        continue;
      }
      if (time < rune.nextAt) continue;
      rune.warning.setVisible(true).setScale(0.5).setAlpha(0.3);
      rune.phase = 'warning';
      rune.nextAt = time + SURVIVAL.runeWarnMs;
    }
  }

  private updateTurrets(time: number): void {
    const { player, enemyProjectiles } = this.ctx;
    for (const turret of this.turrets) {
      const angle = Phaser.Math.Angle.Between(turret.x, turret.y, player.x, player.y);
      turret.cannon.setRotation(angle);
      if (time < turret.recoilUntil) {
        turret.cannon.setScale(0.9).setTint(0xffe378);
      } else {
        turret.cannon.setScale(1).clearTint();
      }
      if (time < turret.nextFireAt) continue;
      turret.nextFireAt = time + 1000 / SURVIVAL.turretFireRate;
      turret.recoilUntil = time + 120;
      const projectile = enemyProjectiles.get(turret.x, turret.y) as EnemyProjectile | null;
      projectile?.fire(turret.x, turret.y, angle, SURVIVAL.turretProjectileSpeed, SURVIVAL.turretDamage);
    }
  }

  private clear(): void {
    for (const zone of this.zones) zone.visual.destroy();
    this.zones = [];
    for (const rune of this.runes) rune.visual.destroy();
    this.runes = [];
    for (const turret of this.turrets) turret.visual.destroy();
    this.turrets = [];
  }
}

function distanceToRect(point: ArenaPoint, rect: { x: number; y: number; width: number; height: number }): number {
  const dx = Math.max(rect.x - point.x, 0, point.x - rect.x - rect.width);
  const dy = Math.max(rect.y - point.y, 0, point.y - rect.y - rect.height);
  return Math.hypot(dx, dy);
}
