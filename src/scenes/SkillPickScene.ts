import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config';
import type { SkillDef, SkillEffect } from '../types';

export interface SkillPickData {
  title: string;
  subtitle: string;
  choices: SkillDef[];
  stacks: Record<string, number>;
  onPick: (skill: SkillDef) => void;
}

const CARD_WIDTH = 208;
const CARD_HEIGHT = 628;
const CARD_TOP = 420;
const CARD_GAP = 16;
/** Un tap tout de suite après l'ouverture est ignoré (doigt encore posé du combat). */
const TAP_GRACE_MS = 300;

const KIND_COLOR: Partial<Record<SkillEffect['kind'], number>> = {
  stat: 0x2997df,
  multishot: 0x42b83c,
  diagonal: 0x46b83e,
  rear: 0x46b83e,
  ricochet: 0x9b42dc,
  pierce: 0x2787dc,
  heal: 0xf04d64,
  burn: 0xff8626,
  freeze: 0x22bfe2,
  orb: 0x9d3bd2,
};
const DEFAULT_COLOR = 0x42b83c;
const DARK = 0x382114;
const CREAM = 0xffead0;

/** Overlay de choix tactile, inspiré des cartes parchemin à bordure dorée des références. */
export class SkillPickScene extends Phaser.Scene {
  constructor() {
    super(SCENES.skillPick);
  }

  create(data: SkillPickData): void {
    const cx = GAME_WIDTH / 2;
    const openedAt = this.time.now;
    let picked = false;

    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x07172a, 0.84);
    this.add.rectangle(cx, 282, GAME_WIDTH - 34, 94, 0x8f4200).setStrokeStyle(5, 0x572b08);
    this.add.rectangle(cx, 270, GAME_WIDTH - 34, 94, 0xffb51f).setStrokeStyle(5, 0xffe276);
    this.add
      .text(cx, 270, data.title, {
        fontSize: '43px',
        color: COLORS.gold,
        fontStyle: 'bold',
        stroke: `#${DARK.toString(16).padStart(6, '0')}`,
        strokeThickness: 7,
      })
      .setOrigin(0.5);
    this.add.text(cx, 352, data.subtitle, {
      fontSize: '28px',
      color: '#fff8e8',
      fontStyle: 'bold',
      stroke: '#1d1524',
      strokeThickness: 4,
    }).setOrigin(0.5);

    const totalWidth = data.choices.length * CARD_WIDTH + Math.max(0, data.choices.length - 1) * CARD_GAP;
    const firstCenter = (GAME_WIDTH - totalWidth) / 2 + CARD_WIDTH / 2;

    data.choices.forEach((skill, i) => {
      const x = firstCenter + i * (CARD_WIDTH + CARD_GAP);
      const y = CARD_TOP + CARD_HEIGHT / 2;
      const color = KIND_COLOR[skill.effect.kind] ?? DEFAULT_COLOR;
      const owned = data.stacks[skill.id] ?? 0;
      const stackText = owned > 0 ? `Niv. ${owned} → ${owned + 1}` : 'NOUVEAU';

      this.add.rectangle(x + 3, y + 10, CARD_WIDTH + 8, CARD_HEIGHT + 8, 0x090d17, 0.68).setStrokeStyle(7, 0x140f1a);
      const card = this.add
        .rectangle(x, y, CARD_WIDTH, CARD_HEIGHT, CREAM)
        .setStrokeStyle(7, 0xd59a22)
        .setInteractive({ useHandCursor: true });
      this.add.rectangle(x, CARD_TOP + 39, CARD_WIDTH - 12, 78, color).setStrokeStyle(3, 0xffdc79);
      this.add.rectangle(x, CARD_TOP + 86, CARD_WIDTH - 12, 18, color);

      this.add
        .text(x, CARD_TOP + 39, skill.name, {
          // Trois cartes à l'écran, mais un intitulé doit se lire sans zoom sur téléphone.
          fontSize: skill.name.length > 14 ? '26px' : '30px',
          color: '#ffffff',
          fontStyle: 'bold',
          align: 'center',
          wordWrap: { width: CARD_WIDTH - 24 },
          stroke: '#3b190b',
          strokeThickness: 5,
        })
        .setOrigin(0.5);

      this.drawSkillIcon(x, CARD_TOP + 224, skill, color);
      this.add.rectangle(x, CARD_TOP + 323, CARD_WIDTH - 26, 3, 0xcda56e, 0.8);
      this.add
        .text(x, CARD_TOP + 408, skill.description, {
          fontSize: '25px',
          color: '#3c2412',
          fontStyle: 'bold',
          align: 'center',
          wordWrap: { width: CARD_WIDTH - 34 },
          lineSpacing: 5,
          stroke: '#fff6e6',
          strokeThickness: 3,
        })
        .setOrigin(0.5);

      this.add
        .text(x, CARD_TOP + CARD_HEIGHT - 45, stackText, {
          fontSize: '24px',
          color: owned > 0 ? '#087e3c' : '#fff5dc',
          fontStyle: 'bold',
          backgroundColor: owned > 0 ? '#c9f1b5' : '#9b4f17',
          padding: { x: 12, y: 8 },
          stroke: owned > 0 ? '#f4ffe9' : '#542508',
          strokeThickness: 3,
        })
        .setOrigin(0.5);

      // Une légère pression/réponse tactile souligne la sélection sans retarder le choix.
      card.on('pointerdown', () => {
        if (picked || this.time.now - openedAt < TAP_GRACE_MS) return;
        picked = true;
        this.tweens.add({
          targets: [card],
          scaleX: 0.96,
          scaleY: 0.985,
          duration: 70,
          yoyo: true,
          onComplete: () => {
            this.scene.stop();
            data.onPick(skill);
          },
        });
      });
    });
  }

  /** Icônes vectorielles : chaque pouvoir se reconnaît avant même de lire son nom. */
  private drawSkillIcon(x: number, y: number, skill: SkillDef, color: number): void {
    const plate = this.add.circle(x, y, 70, color, 0.2).setStrokeStyle(5, color);
    this.add.circle(x, y, 58, 0xfff7e5).setStrokeStyle(5, 0x5b391c);
    const icon = this.add.graphics().setDepth(plate.depth + 1);
    const drawArrow = (angle: number, headColor = color, shaftColor = 0x35475b, length = 47): void => {
      const tailX = x - Math.cos(angle) * 29;
      const tailY = y - Math.sin(angle) * 29;
      const tipX = x + Math.cos(angle) * length;
      const tipY = y + Math.sin(angle) * length;
      icon.lineStyle(10, 0x233147, 1).lineBetween(tailX, tailY, tipX, tipY);
      icon.lineStyle(5, shaftColor, 1).lineBetween(tailX, tailY, tipX, tipY);
      icon.fillStyle(headColor, 1).fillTriangle(
        tipX,
        tipY,
        tipX + Math.cos(angle + 2.5) * 18,
        tipY + Math.sin(angle + 2.5) * 18,
        tipX + Math.cos(angle - 2.5) * 18,
        tipY + Math.sin(angle - 2.5) * 18,
      );
    };
    const drawTarget = (targetX: number, targetY: number, radius = 12, targetColor = 0xff5d62): void => {
      icon.fillStyle(targetColor, 1).fillCircle(targetX, targetY, radius);
      icon.lineStyle(4, 0x3a2a26, 1).strokeCircle(targetX, targetY, radius);
      icon.fillStyle(0xffffff, 0.75).fillCircle(targetX - radius * 0.25, targetY - radius * 0.28, radius * 0.22);
    };

    switch (skill.id) {
      case 'tir_multiple':
        // Trois flèches partent clairement vers l'avant, plutôt qu'une forme abstraite.
        drawArrow(-2.05, 0x5ccc43, 0x3f5672, 40);
        drawArrow(-Math.PI / 2, 0x5ccc43, 0x3f5672, 48);
        drawArrow(-1.09, 0x5ccc43, 0x3f5672, 40);
        break;
      case 'tir_diagonal':
        drawArrow(-2.18, 0x5ccc43, 0x3f5672, 43);
        drawArrow(-0.96, 0x5ccc43, 0x3f5672, 43);
        break;
      case 'tir_arriere':
        // Le petit bouclier indique l'avant du héros ; la flèche part derrière, vers le bas.
        icon.fillStyle(0x45a9d8, 1).fillCircle(x, y - 8, 16);
        icon.lineStyle(4, 0x263653, 1).strokeCircle(x, y - 8, 16);
        drawArrow(Math.PI / 2, 0x65c84c, 0x3f5672, 44);
        break;
      case 'ricochet':
        drawTarget(x - 34, y + 24, 10, 0xaa55e8);
        drawTarget(x - 3, y - 20, 10, 0xaa55e8);
        drawTarget(x + 34, y + 20, 10, 0xaa55e8);
        icon.lineStyle(5, 0x4a3872, 1).lineBetween(x - 25, y + 16, x - 9, y - 12).lineBetween(x + 3, y - 12, x + 25, y + 13);
        drawArrow(-0.84, 0xd678ff, 0x6b4691, 37);
        break;
      case 'percant':
        drawTarget(x, y - 27, 10, 0x83dfff);
        drawTarget(x, y, 10, 0x83dfff);
        drawTarget(x, y + 27, 10, 0x83dfff);
        drawArrow(-Math.PI / 2, 0x4ecfff, 0x37516a, 48);
        break;
      case 'frenesie':
        icon.fillStyle(0xffd34c, 1).fillTriangle(x - 6, y - 47, x + 29, y - 7, x + 6, y - 7);
        icon.fillTriangle(x + 6, y - 7, x - 21, y + 43, x - 5, y + 8);
        icon.lineStyle(6, 0x7b3f12, 1).lineBetween(x - 42, y - 23, x - 21, y - 23).lineBetween(x - 42, y - 2, x - 27, y - 2).lineBetween(x - 42, y + 20, x - 32, y + 20);
        break;
      case 'force':
        icon.lineStyle(12, 0x26344a, 1).lineBetween(x - 24, y + 32, x + 22, y - 30);
        icon.lineStyle(6, 0xeaf7ff, 1).lineBetween(x - 24, y + 32, x + 22, y - 30);
        icon.fillStyle(0xffc73e, 1).fillTriangle(x + 22, y - 45, x + 37, y - 19, x + 8, y - 20);
        icon.lineStyle(8, 0xd07b2c, 1).lineBetween(x - 39, y + 15, x - 7, y + 39);
        break;
      case 'vitalite':
      case 'soin':
        icon.fillStyle(0xf24f65, 1).fillCircle(x - 17, y - 10, 18).fillCircle(x + 17, y - 10, 18).fillTriangle(x - 35, y - 2, x + 35, y - 2, x, y + 43);
        icon.lineStyle(5, 0x71304a, 1).strokeCircle(x - 17, y - 10, 18).strokeCircle(x + 17, y - 10, 18).strokeTriangle(x - 35, y - 2, x + 35, y - 2, x, y + 43);
        if (skill.id === 'soin') {
          icon.fillStyle(0xffffff, 1).fillRoundedRect(x - 7, y - 28, 14, 37, 5).fillRoundedRect(x - 18, y - 17, 36, 14, 5);
        }
        break;
      case 'flamme':
        drawArrow(-Math.PI / 2, 0xffb12e, 0x603821, 39);
        icon.fillStyle(0xff672f, 1).fillTriangle(x - 25, y + 31, x - 4, y - 47, x + 18, y + 28);
        icon.fillStyle(0xffdd4a, 1).fillTriangle(x - 13, y + 25, x - 2, y - 24, x + 9, y + 24);
        break;
      case 'givre':
        drawArrow(-Math.PI / 2, 0x5ae9ff, 0x315a7a, 41);
        icon.lineStyle(5, 0x218ec7, 1);
        for (let angle = 0; angle < Math.PI; angle += Math.PI / 3) {
          const dx = Math.cos(angle) * 19;
          const dy = Math.sin(angle) * 19;
          icon.lineBetween(x + 22 - dx, y + 20 - dy, x + 22 + dx, y + 20 + dy);
        }
        break;
      case 'orbe':
        icon.lineStyle(8, color, 1).strokeCircle(x, y, 34);
        icon.fillStyle(color, 1).fillCircle(x + 31, y - 16, 12).fillCircle(x - 28, y + 22, 9).fillCircle(x, y, 14);
        break;
      default:
        drawArrow(-Math.PI / 2);
    }
  }
}
