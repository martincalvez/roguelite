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
    const art = this.ctx.scene.add.graphics();
    art.fillStyle(0xa62321, 0.42).fillCircle(0, 0, SURVIVAL.fireRadius + 4);
    art.fillStyle(0xf44a24, 0.66).fillCircle(0, 0, SURVIVAL.fireRadius - 5);
    art.fillStyle(0xff9f22, 0.92).fillCircle(0, 0, SURVIVAL.fireRadius * 0.58);
    art.fillStyle(0xffe67c, 0.96).fillCircle(0, 0, SURVIVAL.fireRadius * 0.24);
    art.fillStyle(0xffca38, 0.95);
    art.fillTriangle(-25, 4, -12, -26, -3, 10);
    art.fillTriangle(-8, 0, 7, -36, 17, 8);
    art.fillTriangle(10, 8, 27, -22, 30, 12);
    art.lineStyle(3, 0xffe67c, 0.8).strokeCircle(0, 0, SURVIVAL.fireRadius - 2);
    visual.add(art);
    this.ctx.scene.tweens.add({ targets: visual, scale: 1.08, alpha: 0.76, duration: 420, yoyo: true, repeat: -1 });
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
