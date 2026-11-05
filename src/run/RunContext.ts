import type Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { RunState } from '../state/RunState';
import type { VirtualJoystick } from '../ui/VirtualJoystick';

/** Ce que les contrôleurs d'un run (tir, salles, choix de compétence, fin) ont en commun. */
export interface RunContext {
  scene: Phaser.Scene;
  chapterId: string;
  player: Player;
  runState: RunState;
  joystick: VirtualJoystick;
  enemies: Phaser.Physics.Arcade.Group;
  enemyProjectiles: Phaser.Physics.Arcade.Group;
  playerProjectiles: Phaser.Physics.Arcade.Group;
}
