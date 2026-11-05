import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config';
import { CHAPTERS } from '../data';
import { GameState } from '../state/GameState';
import { isChapterUnlocked } from '../systems/chapters';

/** Sélectionne un chapitre ouvert ; le suivant se débloque après la victoire sur le précédent. */
export class ChapterScene extends Phaser.Scene {
  constructor() {
    super(SCENES.chapters);
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x075794);
    const pattern = this.add.graphics();
    pattern.lineStyle(3, 0x51cfff, 0.1);
    for (let y = 180; y < GAME_HEIGHT; y += 160) pattern.lineBetween(0, y, GAME_WIDTH, y + 160);

    this.add.text(26, 56, '← Retour', { fontSize: '26px', color: '#ffffff', fontStyle: 'bold', stroke: '#123553', strokeThickness: 5, padding: { x: 12, y: 22 } })
      .setOrigin(0, 0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.scene.start(SCENES.menu));
    this.add.text(cx, 56, 'CHAPITRES', { fontSize: '44px', color: COLORS.gold, fontStyle: 'bold', stroke: '#17314f', strokeThickness: 8 }).setOrigin(0.5);
    this.add.rectangle(cx, 115, 610, 52, 0x0c4774).setStrokeStyle(4, 0x092e53);
    this.add.text(cx, 115, `MEILLEUR CHAPITRE : ${GameState.data.bestChapter}`, { fontSize: '23px', color: '#ffffff', fontStyle: 'bold', stroke: '#17314f', strokeThickness: 4 }).setOrigin(0.5);

    CHAPTERS.forEach((chapter, index) => {
      const number = index + 1;
      const y = 320 + index * 310;
      const available = isChapterUnlocked(number, GameState.data.bestChapter);
      const wall = Phaser.Display.Color.HexStringToColor(chapter.visual.wallColor).color;
      const floor = Phaser.Display.Color.HexStringToColor(chapter.visual.floorColor).color;
      const accent = Phaser.Display.Color.HexStringToColor(chapter.visual.accentColor).color;
      const panelColor = available ? wall : 0x354660;
      this.add.rectangle(cx, y, 660, 255, 0x081c36, 0.65).setStrokeStyle(8, available ? accent : 0x69788d);
      this.add.rectangle(cx, y, 642, 237, panelColor).setStrokeStyle(3, floor);
      this.add.rectangle(118, y, 104, 180, floor, available ? 0.95 : 0.35).setStrokeStyle(5, accent);
      this.add.text(118, y - 25, `${number}`, { fontSize: '68px', color: '#ffffff', fontStyle: 'bold', stroke: '#152139', strokeThickness: 10 }).setOrigin(0.5);
      this.add.text(246, y - 70, `CHAPITRE ${number}`, { fontSize: '22px', color: '#ffffff', fontStyle: 'bold', stroke: '#14253e', strokeThickness: 5 }).setOrigin(0, 0.5);
      this.add.text(246, y - 25, chapter.name, { fontSize: '32px', color: available ? chapter.visual.accentColor : '#c3cfdf', fontStyle: 'bold', stroke: '#14253e', strokeThickness: 7, wordWrap: { width: 395 } }).setOrigin(0, 0.5);
      this.add.text(246, y + 28, `${chapter.rooms.length} salles  ·  deux haltes  ·  boss final`, { fontSize: '19px', color: '#ffffff', fontStyle: 'bold', stroke: '#14253e', strokeThickness: 4 }).setOrigin(0, 0.5);

      const label = available ? 'JOUER' : `TERMINE LE CHAPITRE ${number - 1}`;
      const button = this.add.text(470, y + 83, label, {
        fontSize: available ? '28px' : '18px', color: '#17263d', fontStyle: 'bold', backgroundColor: available ? '#ffd447' : '#8d9aae', padding: { x: 24, y: 20 },
      }).setOrigin(0.5);
      if (available) button.setInteractive({ useHandCursor: true }).on('pointerup', () => this.scene.start(SCENES.run, { chapterId: chapter.id }));
    });
  }
}
