import Phaser from 'phaser';
import { ARENA } from '../config';
import { SURVIVAL } from '../data';
import type { ArenaPoint } from '../systems/arenaLayout';
import { hasSurvivalFire } from '../systems/survival';
import type { RunContext } from './RunContext';

interface FireZone {
  x: number;
  y: number;
  nextDamageAt: number;
  visual: Phaser.GameObjects.Container;
}

/** Petites flaques de feu télégraphiées dans certaines salles du mode Survie. */
export class SurvivalHazards {
  private zones: FireZone[] = [];

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
  }

  private onRoomChanged(room: number): void {
    this.clear();
    if (!hasSurvivalFire(room)) return;
    const layout = this.ctx.arena;
    const candidates: ArenaPoint[] = [];
    for (let row = 1; row < layout.rows - 2; row++) {
      for (let col = 1; col < layout.cols - 1; col++) {
        const index = row * layout.cols + col;
        if (layout.blocked[index]) continue;
        const point = { x: (col + 0.5) * layout.cell, y: (row + 0.5) * layout.cell };
        if (Phaser.Math.Distance.Between(point.x, point.y, layout.spawn.x, layout.spawn.y) < 260) continue;
        if (layout.obstacles.some((obstacle) => distanceToRect(point, obstacle) < SURVIVAL.fireRadius + 16)) continue;
        candidates.push(point);
      }
    }

    Phaser.Utils.Array.Shuffle(candidates);
    const chosen: ArenaPoint[] = [];
    for (const point of candidates) {
      if (chosen.every((other) => Phaser.Math.Distance.Between(point.x, point.y, other.x, other.y) > SURVIVAL.fireRadius * 3)) {
        chosen.push(point);
      }
      if (chosen.length >= 2) break;
    }
    for (const point of chosen) this.addZone(point);
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

  private clear(): void {
    for (const zone of this.zones) zone.visual.destroy();
    this.zones = [];
  }
}

function distanceToRect(point: ArenaPoint, rect: { x: number; y: number; width: number; height: number }): number {
  const dx = Math.max(rect.x - point.x, 0, point.x - rect.x - rect.width);
  const dy = Math.max(rect.y - point.y, 0, point.y - rect.y - rect.height);
  return Math.hypot(dx, dy);
}
