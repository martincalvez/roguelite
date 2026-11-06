import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { LUCKY_WHEEL } from '../data';
import { pickLuckyWheelReward } from '../systems/luckyWheel';
import type { LuckyWheelReward } from '../types';
import type { RunContext } from './RunContext';

/** Bonus de départ très court : il donne immédiatement une récompense et met la run en mouvement. */
export class LuckyWheel {
  private readonly layer: Phaser.GameObjects.Container;
  private readonly wheel: Phaser.GameObjects.Container;
  private spinning = false;

  private static readonly rewardSegments: Record<string, number> = {
    soin_35: 0,
    xp_6: 1,
    or_25: 2,
    or_80: 3,
  };

  constructor(
    private readonly ctx: RunContext,
    private readonly onReward: (reward: LuckyWheelReward) => void,
  ) {
    const { scene } = ctx;
    const cx = GAME_WIDTH / 2;
    const cy = 610;
    const dim = scene.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x07122b, 0.76).setInteractive();
    this.wheel = this.drawWheel(cx, cy);
    const pointer = scene.add.graphics();
    pointer.fillStyle(0xfff6c4, 1).fillTriangle(cx, cy - 234, cx - 24, cy - 194, cx + 24, cy - 194);
    pointer.lineStyle(5, 0x332047, 1).strokeTriangle(cx, cy - 234, cx - 24, cy - 194, cx + 24, cy - 194);
    const title = scene.add.text(cx, 265, 'ROUE DE L\'ÉCLAT', {
      fontSize: '44px', color: '#fff37b', fontStyle: 'bold', stroke: '#25153a', strokeThickness: 9,
    }).setOrigin(0.5);
    const subtitle = scene.add.text(cx, 322, 'Un bonus pour démarrer', {
      fontSize: '23px', color: '#f9f3ff', fontStyle: 'bold', stroke: '#25153a', strokeThickness: 4,
    }).setOrigin(0.5);
    const buttonShadow = scene.add.rectangle(cx, 914, 372, 94, 0x4a1b0d).setStrokeStyle(6, 0x200f16);
    const button = scene.add.rectangle(cx, 904, 364, 88, 0xffbd28).setStrokeStyle(6, 0xffed82).setInteractive({ useHandCursor: true });
    const label = scene.add.text(cx, 904, 'TOURNER', {
      fontSize: '36px', color: '#ffffff', fontStyle: 'bold', stroke: '#482313', strokeThickness: 7,
    }).setOrigin(0.5);
    const sparkles = [
      scene.add.circle(cx - 218, cy - 160, 9, 0xffffff, 0.9),
      scene.add.circle(cx + 206, cy - 100, 6, 0xffde55, 0.95),
      scene.add.circle(cx + 164, cy + 177, 8, 0x8cf7ff, 0.9),
    ];
    this.layer = scene.add.container(0, 0, [dim, this.wheel, pointer, title, subtitle, buttonShadow, button, label, ...sparkles]).setDepth(1200);
    scene.tweens.add({ targets: sparkles, scale: 1.7, alpha: 0.25, duration: 620, yoyo: true, repeat: -1 });
    button.on('pointerup', () => this.spin(button, label));
  }

  private drawWheel(cx: number, cy: number): Phaser.GameObjects.Container {
    const scene = this.ctx.scene;
    const g = scene.add.graphics();
    const radius = 190;
    const colors = [0xffc733, 0x44d8c7, 0xb951e5, 0x70df58];
    // L'ordre est volontairement identique à rewardSegments : l'aiguille s'arrête
    // vraiment sur la récompense affichée, au lieu de donner un résultat arbitraire.
    const labels = ['SOIN', 'XP', 'OR', 'JACKPOT'];
    for (let i = 0; i < 8; i++) {
      const start = Phaser.Math.DegToRad(-90 + i * 45 + 2);
      const end = Phaser.Math.DegToRad(-90 + (i + 1) * 45 - 2);
      g.fillStyle(colors[i % colors.length], 1);
      g.slice(0, 0, radius, start, end, false).fillPath();
      g.lineStyle(5, 0x291a48, 1).slice(0, 0, radius, start, end, false).strokePath();
    }
    g.fillStyle(0x38234d, 1).fillCircle(0, 0, radius + 13);
    g.lineStyle(8, 0xffdf65, 1).strokeCircle(0, 0, radius + 8);
    g.fillStyle(0x2a1748, 1).fillCircle(0, 0, 51);
    g.lineStyle(6, 0xffee8a, 1).strokeCircle(0, 0, 51);
    g.fillStyle(0xffffff, 0.55).fillCircle(-15, -17, 12);
    const objects: Phaser.GameObjects.GameObject[] = [g];
    for (let i = 0; i < 8; i++) {
      const angle = Phaser.Math.DegToRad(-67.5 + i * 45);
      objects.push(scene.add.text(Math.cos(angle) * 125, Math.sin(angle) * 125, labels[i % labels.length], {
        fontSize: i % 4 === 3 ? '18px' : '22px', color: '#ffffff', fontStyle: 'bold', stroke: '#2d1846', strokeThickness: 5,
      }).setOrigin(0.5).setRotation(angle + Math.PI / 2));
    }
    const wheel = scene.add.container(cx, cy, objects);
    return wheel;
  }

  private spin(button: Phaser.GameObjects.Rectangle, label: Phaser.GameObjects.Text): void {
    if (this.spinning) return;
    this.spinning = true;
    button.disableInteractive().setAlpha(0.7);
    label.setText('...');
    const reward = pickLuckyWheelReward(LUCKY_WHEEL.rewards, Math.random);
    const segment = LuckyWheel.rewardSegments[reward.id] ?? 0;
    // Le centre du segment 0 démarre à -67.5°. L'aiguille est à -90° :
    // on termine donc à -22.5° moins l'angle du segment choisi, après quatre tours.
    const wantedAngle = -22.5 - segment * 45;
    const currentAngle = Phaser.Math.Angle.WrapDegrees(this.wheel.angle);
    const correction = Phaser.Math.Angle.WrapDegrees(wantedAngle - currentAngle);
    this.ctx.scene.tweens.add({
      targets: this.wheel,
      angle: this.wheel.angle + 1440 + correction,
      duration: LUCKY_WHEEL.spinMs,
      ease: 'Cubic.Out',
      onComplete: () => this.reveal(reward),
    });
  }

  private reveal(reward: LuckyWheelReward): void {
    const color = Phaser.Display.Color.HexStringToColor(reward.color).color;
    const rewardText = this.ctx.scene.add.text(GAME_WIDTH / 2, 1040, reward.label, {
      fontSize: '42px', color: reward.color, fontStyle: 'bold', stroke: '#201333', strokeThickness: 8,
    }).setOrigin(0.5).setScale(0).setDepth(1202);
    this.ctx.scene.tweens.add({ targets: rewardText, scale: 1, duration: 250, ease: 'Back.Out' });
    this.ctx.scene.cameras.main.flash(140, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff, false);
    this.onReward(reward);
    this.ctx.scene.time.delayedCall(820, () => {
      rewardText.destroy();
      this.ctx.scene.tweens.add({ targets: this.layer, alpha: 0, duration: 180, onComplete: () => this.layer.destroy() });
    });
  }
}
