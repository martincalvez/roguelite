import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, HUD_HEIGHT } from '../config';

const BAR_X = 220;
const BAR_WIDTH = GAME_WIDTH - BAR_X - 24;
const BAR_HEIGHT = 40;

/** Bandeau du haut : barre de PV avec valeur. S'abonne à l'événement 'player-hp-changed'. */
export class Hud {
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, hp: number, maxHp: number) {
    const y = HUD_HEIGHT / 2;
    scene.add.rectangle(BAR_X, y, BAR_WIDTH, BAR_HEIGHT, 0x000000, 0.45).setOrigin(0, 0.5);
    this.fill = scene.add.rectangle(BAR_X, y, BAR_WIDTH, BAR_HEIGHT, COLORS.hp).setOrigin(0, 0.5);
    this.label = scene.add
      .text(BAR_X + BAR_WIDTH / 2, y, '', { fontSize: '26px', color: '#ffffff', fontStyle: 'bold', stroke: '#1a1020', strokeThickness: 5 })
      .setOrigin(0.5);
    this.setHp(hp, maxHp);

    scene.events.on('player-hp-changed', this.setHp, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off('player-hp-changed', this.setHp, this));
  }

  private setHp(hp: number, maxHp: number): void {
    this.fill.width = BAR_WIDTH * Phaser.Math.Clamp(hp / maxHp, 0, 1);
    this.label.setText(`${Math.ceil(hp)} / ${Math.round(maxHp)}`);
  }
}
