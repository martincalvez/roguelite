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
      const floor = Phaser.Display.Color.HexStringToColor(chapter.visual.floorColor).color;
      const accent = Phaser.Display.Color.HexStringToColor(chapter.visual.accentColor).color;
      const panelColor = available ? 0x0a4f83 : 0x334b69;
      this.add.rectangle(cx, y + 8, 660, 255, 0x061b32, 0.9).setStrokeStyle(8, 0x06172c);
      this.add.rectangle(cx, y, 642, 237, panelColor).setStrokeStyle(5, available ? accent : 0x75859b);
      this.add.rectangle(118, y, 104, 180, floor, available ? 1 : 0.4).setStrokeStyle(6, accent);
      this.add.rectangle(118, y - 81, 84, 7, 0xffffff, 0.42);
      this.add.text(118, y - 25, `${number}`, { fontSize: '68px', color: '#ffffff', fontStyle: 'bold', stroke: '#152139', strokeThickness: 10 }).setOrigin(0.5);
      this.add.text(246, y - 70, `CHAPITRE ${number}`, { fontSize: '22px', color: '#ffffff', fontStyle: 'bold', stroke: '#14253e', strokeThickness: 5 }).setOrigin(0, 0.5);
      this.add.text(246, y - 25, chapter.name, { fontSize: '32px', color: available ? chapter.visual.accentColor : '#c3cfdf', fontStyle: 'bold', stroke: '#14253e', strokeThickness: 7, wordWrap: { width: 395 } }).setOrigin(0, 0.5);
      this.add.text(246, y + 31, available ? 'OUVERT' : 'VERROUILLÉ', {
        fontSize: '20px', color: available ? '#7cff68' : '#c3cfdf', fontStyle: 'bold', stroke: '#14253e', strokeThickness: 5,
      }).setOrigin(0, 0.5);

      const label = available ? 'JOUER' : `TERMINE LE CHAPITRE ${number - 1}`;
      this.add.rectangle(493, y + 85, 278, 92, 0x071c32).setStrokeStyle(5, 0x07172b);
      const button = this.add.rectangle(490, y + 78, 272, 88, available ? 0xffc72f : 0x8796aa).setStrokeStyle(5, available ? 0xffef82 : 0x58677d);
      this.add.rectangle(490, y + 41, 250, 6, 0xffffff, 0.32);
      this.add.text(490, y + 78, label, {
        fontSize: available ? '32px' : '16px', color: '#17263d', fontStyle: 'bold', align: 'center', wordWrap: { width: 245 },
        stroke: '#fff1c5', strokeThickness: available ? 2 : 0,
      }).setOrigin(0.5);
      if (available) button.setInteractive({ useHandCursor: true }).on('pointerup', () => this.scene.start(SCENES.run, { chapterId: chapter.id }));
    });
  }
}
