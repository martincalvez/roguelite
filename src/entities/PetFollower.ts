import Phaser from 'phaser';

/** Petit familier flottant qui accompagne le héros pendant un run. */
export class PetFollower {
  private readonly sprite: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, texture: string, x: number, y: number) {
    this.sprite = scene.add.image(x, y, texture).setDisplaySize(84, 90).setDepth(40);
  }

  update(time: number, delta: number, playerX: number, playerY: number): void {
    const seconds = time / 1000;
    const targetX = playerX - 54 + Math.cos(seconds * 1.7) * 22;
    const targetY = playerY - 46 + Math.sin(seconds * 2.1) * 18;
    const follow = 1 - Math.exp(-delta / 110);
    this.sprite.x += (targetX - this.sprite.x) * follow;
    this.sprite.y += (targetY - this.sprite.y) * follow;
    this.sprite.setAngle(Math.sin(seconds * 2) * 5);
  }
}
