import Phaser from 'phaser';
import { ARENA, COLORS, GAME_HEIGHT, GAME_WIDTH, HUD_HEIGHT, SCENES, WALL_THICKNESS } from '../config';
import { Player } from '../entities/Player';
import { VirtualJoystick } from '../ui/VirtualJoystick';

interface RunData {
  chapterId: string;
}

/**
 * Scène de combat, construite tâche par tâche (docs/TACHES.md, phase 1).
 * Zone de jeu : bandeau HUD en haut (HUD_HEIGHT), arène entourée de murs en dessous.
 */
export class RunScene extends Phaser.Scene {
  chapterId = 'ch1'; // utilisé dès la tâche 1.3 (ennemis du chapitre)
  private player!: Player;

  constructor() {
    super(SCENES.run);
  }

  init(data: RunData): void {
    this.chapterId = data?.chapterId ?? 'ch1';
  }

  create(): void {
    this.buildArena();
    this.physics.world.setBounds(ARENA.x, ARENA.y, ARENA.width, ARENA.height);

    this.player = new Player(this, GAME_WIDTH / 2, ARENA.y + ARENA.height * 0.75);
    this.player.setJoystick(new VirtualJoystick(this));

    // Bandeau HUD (vide pour l'instant) : seul le retour au menu y figure.
    this.add
      .text(24, HUD_HEIGHT / 2, '← Menu', {
        fontSize: '28px',
        color: COLORS.textMuted,
        padding: { x: 16, y: 30 },
      })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start(SCENES.menu));
  }

  update(): void {
    this.player.updateMovement();
  }

  /** Murs (rectangle plein) puis sol par-dessus : il reste une bordure de WALL_THICKNESS. */
  private buildArena(): void {
    const top = HUD_HEIGHT;
    this.add
      .rectangle(0, top, GAME_WIDTH, GAME_HEIGHT - top, COLORS.wall)
      .setOrigin(0, 0);
    this.add
      .rectangle(WALL_THICKNESS, top + WALL_THICKNESS, ARENA.width, ARENA.height, COLORS.floor)
      .setOrigin(0, 0);
  }
}
