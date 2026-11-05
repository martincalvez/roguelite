import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, RARITY_COLOR, RARITY_LABEL, SCENES } from '../config';
import { getItem } from '../data';
import type { ItemInstance } from '../types';

export interface LootData {
  victory: boolean;
  roomReached: number;
  roomCount: number;
  gold: number;
  accountXp: number;
  levelBefore: number;
  levelAfter: number;
  items: ItemInstance[];
}

const SLOT_LABEL: Record<string, string> = {
  weapon: 'Arme',
  armor: 'Armure',
  ring: 'Anneau',
  amulet: 'Amulette',
  pet: 'Familier',
};

/** Écran de butin affiché à la mort ou à la victoire. Les récompenses sont déjà sauvegardées. */
export class LootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.loot);
  }

  create(data: LootData): void {
    const cx = GAME_WIDTH / 2;
    const stroke = { stroke: '#1a1020', strokeThickness: 8 };

    this.add
      .text(cx, 190, data.victory ? 'Victoire !' : 'Défaite', {
        fontSize: '84px',
        color: data.victory ? COLORS.gold : '#ff6b7a',
        fontStyle: 'bold',
        ...stroke,
        strokeThickness: 12,
      })
      .setOrigin(0.5);

    const lines = [
      `Salle atteinte : ${data.roomReached}/${data.roomCount}`,
      `Or gagné : +${Math.round(data.gold)}`,
      `XP de compte : +${data.accountXp}`,
    ];
    if (data.levelAfter > data.levelBefore) lines.push(`Niveau de compte ${data.levelAfter} !`);
    lines.forEach((line, i) => {
      this.add
        .text(cx, 330 + i * 56, line, { fontSize: '36px', color: i === 3 ? COLORS.gold : COLORS.text, fontStyle: 'bold', ...stroke, strokeThickness: 6 })
        .setOrigin(0.5);
    });

    this.add.text(cx, 600, 'Butin', { fontSize: '40px', color: COLORS.gold, fontStyle: 'bold', ...stroke }).setOrigin(0.5);
    if (data.items.length === 0) {
      this.add.text(cx, 690, 'Aucun objet cette fois', { fontSize: '30px', color: COLORS.textMuted }).setOrigin(0.5);
    }
    data.items.forEach((item, i) => {
      const def = getItem(item.defId);
      const y = 700 + i * 150;
      this.add.rectangle(cx, y, 600, 130, 0x000000, 0.35).setStrokeStyle(6, Phaser.Display.Color.HexStringToColor(RARITY_COLOR[item.rarity]).color);
      this.add
        .text(cx, y - 30, def.name, { fontSize: '36px', color: RARITY_COLOR[item.rarity], fontStyle: 'bold', ...stroke, strokeThickness: 6 })
        .setOrigin(0.5);
      this.add
        .text(cx, y + 22, `${RARITY_LABEL[item.rarity]} · ${SLOT_LABEL[def.slot] ?? def.slot}`, { fontSize: '26px', color: COLORS.text })
        .setOrigin(0.5);
    });

    this.add
      .text(cx, GAME_HEIGHT - 200, '  MENU  ', {
        fontSize: '48px',
        color: '#14111a',
        backgroundColor: COLORS.gold,
        padding: { x: 24, y: 20 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start(SCENES.menu));
  }
}
