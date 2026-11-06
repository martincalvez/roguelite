import type Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { ArenaLayout } from '../systems/arenaLayout';
import type { RunState } from '../state/RunState';
import type { VirtualJoystick } from '../ui/VirtualJoystick';

/** Ce que les contrôleurs d'un run (tir, salles, choix de compétence, fin) ont en commun. */
export interface RunContext {
  scene: Phaser.Scene;
  chapterId: string;
  mode: 'campaign' | 'survival';
  player: Player;
  /** Décor de la salle : grille de tuiles et blocs solides (voir src/systems/arenaLayout.ts). */
  arena: ArenaLayout;
  runState: RunState;
  joystick: VirtualJoystick;
  enemies: Phaser.Physics.Arcade.Group;
  enemyProjectiles: Phaser.Physics.Arcade.Group;
  playerProjectiles: Phaser.Physics.Arcade.Group;
}
