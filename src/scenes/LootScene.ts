import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, RARITY_COLOR, RARITY_LABEL, SCENES, SCROLL_TYPES, SLOT_TYPE_LABEL } from '../config';
import { getItem } from '../data';
import type { ItemInstance, ItemSlotType } from '../types';

export interface LootData {
  victory: boolean;
  roomReached: number;
  roomCount: number;
  gold: number;
  accountXp: number;
  levelBefore: number;
  levelAfter: number;
  items: ItemInstance[];
  scrolls: Record<ItemSlotType, number>;
  gems: number;
}

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
    if (data.gems > 0) lines.push(`Gemmes : +${data.gems}`);
    const scrollText = SCROLL_TYPES.filter((t) => data.scrolls[t] > 0)
      .map((t) => `${SLOT_TYPE_LABEL[t]} x${data.scrolls[t]}`)
      .join(' · ');
    if (scrollText) lines.push(`Parchemins : ${scrollText}`);
    if (data.levelAfter > data.levelBefore) lines.push(`Niveau de compte ${data.levelAfter} !`);
    // Mise en page cumulative : une ligne longue (parchemins) passe à la ligne sans chevaucher la suite.
    let y = 320;
    for (const line of lines) {
      const goldReward = line.startsWith('Or gagné');
      if (goldReward && this.textures.exists('coin-gold')) {
        this.add.image(cx - 158, y + 20, 'coin-gold').setDisplaySize(38, 38);
      }
      const t = this.add
        .text(cx + (goldReward ? 18 : 0), y, line, {
          fontSize: '30px',
          color: line.startsWith('Niveau de compte') ? COLORS.gold : COLORS.text,
          fontStyle: 'bold',
          align: 'center',
          wordWrap: { width: 660 },
          ...stroke,
          strokeThickness: 6,
        })
        .setOrigin(0.5, 0);
      y += t.height + 10;
    }

    y += 30;
    this.add.text(cx, y, 'Butin', { fontSize: '40px', color: COLORS.gold, fontStyle: 'bold', ...stroke }).setOrigin(0.5, 0);
    y += 80;
    if (data.items.length === 0) {
      this.add.text(cx, y + 20, 'Aucun objet cette fois', { fontSize: '30px', color: COLORS.textMuted }).setOrigin(0.5, 0);
    }
    // Les objets sont côte à côte (2 au maximum) pour tenir au-dessus du bouton MENU.
    data.items.forEach((item, i) => {
      const def = getItem(item.defId);
      const x = data.items.length === 1 ? cx : cx + (i === 0 ? -165 : 165);
      const cy = y + 65;
      this.add.rectangle(x, cy, 310, 130, 0x000000, 0.35).setStrokeStyle(6, Phaser.Display.Color.HexStringToColor(RARITY_COLOR[item.rarity]).color);
      this.add
        .text(x, cy - 28, def.name, { fontSize: '28px', color: RARITY_COLOR[item.rarity], fontStyle: 'bold', align: 'center', wordWrap: { width: 290 }, ...stroke, strokeThickness: 5 })
        .setOrigin(0.5);
      this.add
        .text(x, cy + 32, `${RARITY_LABEL[item.rarity]} · ${SLOT_TYPE_LABEL[def.slot]}`, { fontSize: '20px', color: COLORS.text })
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
