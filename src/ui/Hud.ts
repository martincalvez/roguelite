import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, HUD_HEIGHT } from '../config';

const BAR_X = 220;
const BAR_WIDTH = GAME_WIDTH - BAR_X - 24;
const BAR_HEIGHT = 36;
const XP_BAR_HEIGHT = 22;

/**
 * Bandeau du haut : barre de PV avec valeur, barre d'XP avec niveau.
 * S'abonne à 'player-hp-changed' (hp, maxHp) et 'xp-changed' (niveau, xp, xpNécessaire).
 */
export class Hud {
  private readonly hpFill: Phaser.GameObjects.Rectangle;
  private readonly hpLabel: Phaser.GameObjects.Text;
  private readonly xpFill: Phaser.GameObjects.Rectangle;
  private readonly xpLabel: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, hp: number, maxHp: number, level: number, xp: number, xpNeeded: number) {
    const hpY = HUD_HEIGHT / 2 - 16;
    const xpY = HUD_HEIGHT / 2 + 26;
    const textStyle = { color: '#ffffff', fontStyle: 'bold', stroke: '#1a1020', strokeThickness: 5 };

    scene.add.rectangle(BAR_X, hpY, BAR_WIDTH, BAR_HEIGHT, 0x000000, 0.45).setOrigin(0, 0.5);
    this.hpFill = scene.add.rectangle(BAR_X, hpY, BAR_WIDTH, BAR_HEIGHT, COLORS.hp).setOrigin(0, 0.5);
    this.hpLabel = scene.add.text(BAR_X + BAR_WIDTH / 2, hpY, '', { ...textStyle, fontSize: '26px' }).setOrigin(0.5);

    scene.add.rectangle(BAR_X, xpY, BAR_WIDTH, XP_BAR_HEIGHT, 0x000000, 0.45).setOrigin(0, 0.5);
    this.xpFill = scene.add.rectangle(BAR_X, xpY, BAR_WIDTH, XP_BAR_HEIGHT, COLORS.xp).setOrigin(0, 0.5);
    this.xpLabel = scene.add.text(BAR_X + BAR_WIDTH / 2, xpY, '', { ...textStyle, fontSize: '18px', strokeThickness: 4 }).setOrigin(0.5);

    this.setHp(hp, maxHp);
    this.setXp(level, xp, xpNeeded);

    scene.events.on('player-hp-changed', this.setHp, this);
    scene.events.on('xp-changed', this.setXp, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off('player-hp-changed', this.setHp, this);
      scene.events.off('xp-changed', this.setXp, this);
    });
  }

  private setHp(hp: number, maxHp: number): void {
    this.hpFill.width = BAR_WIDTH * Phaser.Math.Clamp(hp / maxHp, 0, 1);
    this.hpLabel.setText(`${Math.ceil(hp)} / ${Math.round(maxHp)}`);
  }

  private setXp(level: number, xp: number, xpNeeded: number): void {
    this.xpFill.width = BAR_WIDTH * Phaser.Math.Clamp(xp / xpNeeded, 0, 1);
    this.xpLabel.setText(`Niv. ${level}`);
  }
}
