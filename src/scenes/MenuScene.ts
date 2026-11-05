import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config';
import { GameState } from '../state/GameState';
import { getHero } from '../data';

/** Menu principal. Plus tard : onglets Équipement, Talents, Héros, Survie. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.menu);
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const d = GameState.data;
    const stats = GameState.heroStats();

    this.add
      .text(cx, 260, 'ROGUELITE\nFANTASY', {
        fontFamily: 'Georgia, serif',
        fontSize: '72px',
        color: COLORS.gold,
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 470, `${getHero(d.selectedHero).name} · Niv. ${d.accountLevel} · ${d.gold} or`, {
        fontSize: '28px',
        color: COLORS.text,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 520, `PV ${Math.round(stats.maxHp)} · ATQ ${Math.round(stats.attack)}`, {
        fontSize: '24px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);

    const button = this.add
      .text(cx, GAME_HEIGHT - 320, '  JOUER  ', {
        fontSize: '48px',
        color: '#14111a',
        backgroundColor: COLORS.gold,
        padding: { x: 24, y: 16 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on('pointerup', () => this.scene.start(SCENES.run, { chapterId: 'ch1' }));
  }
}
