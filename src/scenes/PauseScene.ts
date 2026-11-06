import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config';

/** Pause pleine page : deux actions seulement, grandes et immédiatement accessibles au pouce. */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super(SCENES.pause);
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x061123, 0.82).setInteractive();
    this.add.rectangle(cx, 400, 590, 370, 0x103d66).setStrokeStyle(8, 0x4ed6ff);
    this.add.rectangle(cx, 382, 564, 92, 0xffbc26).setStrokeStyle(5, 0xffeb80);
    this.add.text(cx, 382, 'PAUSE', {
      fontSize: '48px', color: '#ffffff', fontStyle: 'bold', stroke: '#17223d', strokeThickness: 8,
    }).setOrigin(0.5);
    this.add.text(cx, 457, 'Respire. Repars quand tu veux.', {
      fontSize: '25px', color: '#dff8ff', fontStyle: 'bold', stroke: '#17223d', strokeThickness: 4,
    }).setOrigin(0.5);
    this.button(cx, 560, 'REPRENDRE', 0x45c93f, () => {
      this.scene.stop();
      this.scene.resume(SCENES.run);
    });
    this.button(cx, 676, 'MENU', 0x2b9ee7, () => {
      this.scene.stop(SCENES.run);
      this.scene.start(SCENES.menu);
    });
  }

  private button(x: number, y: number, label: string, color: number, onClick: () => void): void {
    this.add.rectangle(x, y + 8, 386, 94, 0x081a32).setStrokeStyle(6, 0x051225);
    const face = this.add.rectangle(x, y, 376, 84, color).setStrokeStyle(6, 0xffffff, 0.28).setInteractive({ useHandCursor: true });
    this.add.rectangle(x, y - 31, 350, 7, 0xffffff, 0.28);
    this.add.text(x, y, label, {
      fontSize: '36px', color: '#ffffff', fontStyle: 'bold', stroke: '#14213d', strokeThickness: 7,
    }).setOrigin(0.5);
    face.on('pointerup', onClick);
  }
}
