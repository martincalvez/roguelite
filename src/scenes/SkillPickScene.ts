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

      this.drawSkillIcon(x, CARD_TOP + 224, skill.effect.kind, color);
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

  /** Icônes vectorielles lisibles en petit format, sans emoji ni dépendance d'asset. */
  private drawSkillIcon(x: number, y: number, kind: SkillEffect['kind'], color: number): void {
    const plate = this.add.circle(x, y, 70, color, 0.2).setStrokeStyle(5, color);
    this.add.circle(x, y, 58, 0xfff7e5).setStrokeStyle(5, 0x5b391c);
    const icon = this.add.graphics().setDepth(plate.depth + 1);
    icon.lineStyle(12, 0x3a2a26, 1);
    icon.fillStyle(kind === 'heal' ? 0xff4f62 : kind === 'burn' ? 0xff8b20 : kind === 'freeze' ? 0x25bde1 : color, 1);

    if (kind === 'heal') {
      icon.fillStyle(0xf34259, 1);
      icon.fillRoundedRect(x - 12, y - 37, 24, 74, 8);
      icon.fillRoundedRect(x - 37, y - 12, 74, 24, 8);
    } else if (kind === 'burn') {
      icon.fillPoints([new Phaser.Geom.Point(x, y - 42), new Phaser.Geom.Point(x + 32, y + 24), new Phaser.Geom.Point(x, y + 40), new Phaser.Geom.Point(x - 30, y + 22)], true);
      icon.fillStyle(0xffdc4f, 1);
      icon.fillPoints([new Phaser.Geom.Point(x + 2, y - 8), new Phaser.Geom.Point(x + 15, y + 19), new Phaser.Geom.Point(x, y + 29), new Phaser.Geom.Point(x - 12, y + 16)], true);
    } else if (kind === 'freeze') {
      icon.lineStyle(9, 0x168ec6, 1);
      for (let angle = 0; angle < Math.PI; angle += Math.PI / 3) {
        const dx = Math.cos(angle) * 38;
        const dy = Math.sin(angle) * 38;
        icon.lineBetween(x - dx, y - dy, x + dx, y + dy);
      }
    } else if (kind === 'orb') {
      icon.lineStyle(8, color, 1);
      icon.strokeCircle(x, y, 34);
      icon.fillStyle(color, 1);
      icon.fillCircle(x + 31, y - 16, 12);
      icon.fillCircle(x - 28, y + 22, 9);
      icon.fillCircle(x, y, 14);
    } else if (kind === 'ricochet') {
      icon.lineStyle(9, 0x59318f, 1);
      icon.lineBetween(x - 34, y + 24, x - 5, y - 20);
      icon.lineBetween(x - 5, y - 20, x + 33, y + 18);
      icon.fillStyle(0xb754ec, 1);
      icon.fillCircle(x - 34, y + 24, 11);
      icon.fillCircle(x - 5, y - 20, 11);
      icon.fillCircle(x + 33, y + 18, 11);
    } else {
      // Flèches, projectile perçant et force : une pointe et un fût épais.
      const arrowCount = kind === 'multishot' ? 3 : kind === 'diagonal' ? 3 : kind === 'rear' ? 2 : 1;
      const directions = arrowCount === 3 ? [-0.65, 0, 0.65] : kind === 'rear' ? [-Math.PI / 2, Math.PI / 2] : [0];
      directions.forEach((angle) => {
        const rotation = kind === 'rear' ? angle : angle - Math.PI / 2;
        const tipX = x + Math.cos(rotation) * 42;
        const tipY = y + Math.sin(rotation) * 42;
        const tailX = x - Math.cos(rotation) * 30;
        const tailY = y - Math.sin(rotation) * 30;
        icon.lineStyle(kind === 'pierce' ? 12 : 9, kind === 'stat' ? 0xd49019 : 0x314459, 1);
        icon.lineBetween(tailX, tailY, tipX, tipY);
        const side = 17;
        icon.fillStyle(kind === 'pierce' ? 0x6fd8ff : color, 1);
        icon.fillTriangle(
          tipX,
          tipY,
          tipX + Math.cos(rotation + 2.55) * side,
          tipY + Math.sin(rotation + 2.55) * side,
          tipX + Math.cos(rotation - 2.55) * side,
          tipY + Math.sin(rotation - 2.55) * side,
        );
      });
    }
  }
}
