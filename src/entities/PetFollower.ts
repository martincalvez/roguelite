import Phaser from 'phaser';

/** Petit familier flottant qui accompagne le héros pendant un run. */
export class PetFollower {
  private readonly sprite: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, texture: string, x: number, y: number) {
    // Le héros est volontairement grand : placer l'hibou derrière lui, en haut à gauche,
    // évite que les deux silhouettes se confondent sur l'écran étroit d'un téléphone.
    this.sprite = scene.add.image(x, y, texture).setDisplaySize(76, 80).setDepth(-1);
  }

  update(time: number, delta: number, playerX: number, playerY: number): void {
    const seconds = time / 1000;
    const targetX = playerX - 104 + Math.cos(seconds * 1.7) * 10;
    const targetY = playerY - 82 + Math.sin(seconds * 2.1) * 12;
    const follow = 1 - Math.exp(-delta / 110);
    this.sprite.x += (targetX - this.sprite.x) * follow;
    this.sprite.y += (targetY - this.sprite.y) * follow;
    this.sprite.setAngle(Math.sin(seconds * 2) * 5);
  }
}
