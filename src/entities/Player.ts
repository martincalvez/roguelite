import Phaser from 'phaser';
import { GameState } from '../state/GameState';
import type { VirtualJoystick } from '../ui/VirtualJoystick';

/**
 * Le héros. Déplacements ZQSD + flèches, diagonale normalisée.
 * La vitesse vient des stats (jamais modifiée directement : voir computeStats).
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys: Record<'Z' | 'Q' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private readonly moveVector = new Phaser.Math.Vector2();
  private moveSpeed: number;
  private joystick?: VirtualJoystick;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.moveSpeed = GameState.heroStats().moveSpeed;
    this.setCollideWorldBounds(true);
    this.setCircle(this.width / 2);

    const keyboard = scene.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys('Z,Q,S,D') as Player['keys'];
  }

  setJoystick(joystick: VirtualJoystick): void {
    this.joystick = joystick;
  }

  /** Vecteur d'entrée (longueur 0 à 1) : le joystick prime sur le clavier s'il est actif. */
  getMoveVector(): Phaser.Math.Vector2 {
    if (this.joystick?.active) {
      return this.moveVector.copy(this.joystick.vector);
    }
    const left = this.cursors.left.isDown || this.keys.Q.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.Z.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;

    this.moveVector.set((right ? 1 : 0) - (left ? 1 : 0), (down ? 1 : 0) - (up ? 1 : 0));
    if (this.moveVector.lengthSq() > 1) this.moveVector.normalize();
    return this.moveVector;
  }

  get isMoving(): boolean {
    return this.moveVector.lengthSq() > 0;
  }

  /** À appeler à chaque frame depuis la scène. */
  updateMovement(): void {
    const v = this.getMoveVector();
    this.setVelocity(v.x * this.moveSpeed, v.y * this.moveSpeed);
  }
}
