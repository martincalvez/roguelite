import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config';
import type { SkillDef, SkillEffect } from '../types';

export interface SkillPickData {
  level: number;
  choices: SkillDef[];
  stacks: Record<string, number>;
  onPick: (skill: SkillDef) => void;
}

const CARD_WIDTH = 640;
const CARD_HEIGHT = 240;
const CARD_GAP = 28;
const FIRST_CARD_Y = 330;
/** Un tap tout de suite après l'ouverture est ignoré (doigt encore posé du combat). */
const TAP_GRACE_MS = 300;

const KIND_COLOR: Partial<Record<SkillEffect['kind'], number>> = {
  stat: 0x3fa4ff,
  heal: 0xff4d8a,
  burn: 0xff8a2b,
  freeze: 0x2fd0ff,
  orb: 0xc45cff,
};
const DEFAULT_COLOR = 0x5cc96a;

/**
 * Overlay de choix : 3 cartes de compétence, lancé par-dessus RunScene (mise en pause).
 * Appelle onPick avec la compétence choisie, puis se ferme.
 */
export class SkillPickScene extends Phaser.Scene {
  constructor() {
    super(SCENES.skillPick);
  }

  create(data: SkillPickData): void {
    const cx = GAME_WIDTH / 2;
    const openedAt = this.time.now;
    let picked = false;

    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.72);
    this.add
      .text(cx, 150, `Niveau ${data.level} !`, {
        fontSize: '72px',
        color: COLORS.gold,
        fontStyle: 'bold',
        stroke: '#1a1020',
        strokeThickness: 10,
      })
      .setOrigin(0.5);
    this.add.text(cx, 235, 'Choisis une compétence', { fontSize: '30px', color: COLORS.text }).setOrigin(0.5);

    data.choices.forEach((skill, i) => {
      const y = FIRST_CARD_Y + CARD_HEIGHT / 2 + i * (CARD_HEIGHT + CARD_GAP);
      const color = KIND_COLOR[skill.effect.kind] ?? DEFAULT_COLOR;
      const owned = data.stacks[skill.id] ?? 0;

      const card = this.add
        .rectangle(cx, y, CARD_WIDTH, CARD_HEIGHT, color)
        .setStrokeStyle(8, 0x1a1020)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(cx, y - 70, skill.name, { fontSize: '44px', color: '#ffffff', fontStyle: 'bold', stroke: '#1a1020', strokeThickness: 6 })
        .setOrigin(0.5);
      this.add
        .text(cx, y + 5, skill.description, {
          fontSize: '28px',
          color: '#ffffff',
          align: 'center',
          wordWrap: { width: CARD_WIDTH - 60 },
          stroke: '#1a1020',
          strokeThickness: 4,
        })
        .setOrigin(0.5);
      this.add
        .text(cx, y + 80, owned > 0 ? `Niv. ${owned} → ${owned + 1}` : 'Nouveau !', {
          fontSize: '26px',
          color: '#ffe14a',
          fontStyle: 'bold',
          stroke: '#1a1020',
          strokeThickness: 4,
        })
        .setOrigin(0.5);

      // pointerdown (et non pointerup) : le relâchement du doigt qui pilotait le héros ne choisit rien.
      card.on('pointerdown', () => {
        if (picked || this.time.now - openedAt < TAP_GRACE_MS) return;
        picked = true;
        this.scene.stop();
        data.onPick(skill);
      });
    });
  }
}
