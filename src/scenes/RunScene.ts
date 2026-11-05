import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config';
import { GameState } from '../state/GameState';

interface RunData {
  chapterId: string;
}

/**
 * Scène de combat. Squelette : à construire tâche par tâche (docs/TACHES.md, phase 1).
 * Zone de jeu : bandeau HUD en haut (120 px), arène en dessous.
 */
export class RunScene extends Phaser.Scene {
  private chapterId = 'ch1';

  constructor() {
    super(SCENES.run);
  }

  init(data: RunData): void {
    this.chapterId = data.chapterId ?? 'ch1';
  }

  create(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, GAME_WIDTH - 40, GAME_HEIGHT - 160, COLORS.floor);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT - 260, 'player');

    const stats = GameState.heroStats();
    this.add
      .text(GAME_WIDTH / 2, 400, `Chapitre ${this.chapterId}\nPV ${Math.round(stats.maxHp)}\n\nCombat à construire :\nvoir docs/TACHES.md`, {
        fontSize: '32px',
        color: COLORS.text,
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 120, '← Menu', { fontSize: '28px', color: COLORS.textMuted })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start(SCENES.menu));
  }
}
