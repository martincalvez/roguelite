import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, SCENES } from '../config';
import { getHero } from '../data';
import { accountXpToNext } from '../systems/progression';
import { GameState } from '../state/GameState';

/** Menu principal : une liste de gros boutons (JOUER, ÉQUIPEMENT…). */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.menu);
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const d = GameState.data;
    const stats = GameState.heroStats();

    this.add
      .text(cx, 240, 'ROGUELITE\nFANTASY', {
        fontFamily: '"Arial Black", "Trebuchet MS", sans-serif',
        fontSize: '80px',
        color: COLORS.gold,
        align: 'center',
        stroke: '#1a1020',
        strokeThickness: 12,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 450, `${getHero(d.selectedHero).name} · Niv. ${d.accountLevel} · ${d.gold} or · ${d.gems} gemmes`, {
        fontSize: '28px',
        color: COLORS.text,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 500, `PV ${Math.round(stats.maxHp)} · ATQ ${Math.round(stats.attack)}`, {
        fontSize: '24px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);

    // Niveau de compte : barre d'XP.
    const barWidth = 360;
    this.add.rectangle(cx, 548, barWidth, 22, 0x000000, 0.45).setStrokeStyle(3, 0x1a1020);
    const fill = Phaser.Math.Clamp(d.accountXp / accountXpToNext(d.accountLevel), 0, 1);
    this.add.rectangle(cx - barWidth / 2, 548, barWidth * fill, 22, COLORS.xp).setOrigin(0, 0.5);
    this.add
      .text(cx, 548, `Niveau de compte ${d.accountLevel}`, { fontSize: '16px', color: '#ffffff', fontStyle: 'bold', stroke: '#1a1020', strokeThickness: 4 })
      .setOrigin(0.5);

    this.menuButton(cx, 680, '  JOUER  ', 56, () => this.scene.start(SCENES.run, { chapterId: 'ch1' }));
    this.menuButton(cx, 815, ' ÉQUIPEMENT ', 40, () => this.scene.start(SCENES.equipment));
    this.menuButton(cx, 930, '   COFFRES   ', 40, () => this.scene.start(SCENES.chests));
    this.menuButton(cx, 1045, '   TALENTS   ', 40, () => this.scene.start(SCENES.talents));
  }

  /** Gros bouton doré (hauteur ≥ 88 px, règle mobile d'abord). */
  private menuButton(x: number, y: number, label: string, fontSize: number, onClick: () => void): void {
    this.add
      .text(x, y, label, {
        fontSize: `${fontSize}px`,
        color: '#14111a',
        backgroundColor: COLORS.gold,
        padding: { x: 28, y: 24 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', onClick);
  }
}
