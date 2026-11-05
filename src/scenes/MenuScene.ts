import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, RARITY_COLOR, RARITY_LABEL, SCENES } from '../config';
import { GameState } from '../state/GameState';
import { getHero, getItem } from '../data';

/** Menu principal. Plus tard : onglets Équipement, Talents, Héros, Survie. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.menu);
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const d = GameState.data;

    this.add
      .text(cx, 260, 'ROGUELITE\nFANTASY', {
        fontFamily: '"Arial Black", "Trebuchet MS", sans-serif',
        fontSize: '80px',
        color: COLORS.gold,
        align: 'center',
        stroke: '#1a1020',
        strokeThickness: 12,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 470, `${getHero(d.selectedHero).name} · Niv. ${d.accountLevel} · ${d.gold} or`, {
        fontSize: '28px',
        color: COLORS.text,
      })
      .setOrigin(0.5);

    const statsText = this.add
      .text(cx, 520, '', { fontSize: '24px', color: COLORS.textMuted })
      .setOrigin(0.5);
    const refreshStats = (): void => {
      const s = GameState.heroStats();
      statsText.setText(`PV ${Math.round(s.maxHp)} · ATQ ${Math.round(s.attack)}`);
    };
    refreshStats();
    this.buildWeaponSelector(refreshStats);

    const button = this.add
      .text(cx, GAME_HEIGHT - 320, '  JOUER  ', {
        fontSize: '48px',
        color: '#14111a',
        backgroundColor: COLORS.gold,
        padding: { x: 24, y: 16 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on('pointerup', () => this.scene.start(SCENES.run, { chapterId: 'ch1' }));
  }

  /** Sélecteur d'arme : ◀ nom ▶ parmi les armes de l'inventaire. */
  private buildWeaponSelector(onChange: () => void): void {
    const cx = GAME_WIDTH / 2;
    const weapons = GameState.weapons();
    if (weapons.length === 0) return;

    this.add.text(cx, 610, 'ARME', { fontSize: '24px', color: COLORS.textMuted, fontStyle: 'bold' }).setOrigin(0.5);
    const name = this.add.text(cx, 690, '', { fontSize: '36px', fontStyle: 'bold', stroke: '#1a1020', strokeThickness: 6 }).setOrigin(0.5);
    const detail = this.add.text(cx, 750, '', { fontSize: '24px', color: COLORS.text, align: 'center', wordWrap: { width: 480 } }).setOrigin(0.5, 0);

    let index = Math.max(0, weapons.findIndex((w) => w.uid === GameState.data.equipped.weapon));
    const show = (): void => {
      const weapon = weapons[index];
      const def = getItem(weapon.defId);
      GameState.equipWeapon(weapon.uid);
      name.setText(def.name).setColor(RARITY_COLOR[weapon.rarity]);
      detail.setText(`${RARITY_LABEL[weapon.rarity]}\n${def.description}`);
      onChange();
    };
    const arrow = (x: number, label: string, step: number): void => {
      this.add
        .text(x, 690, label, { fontSize: '48px', color: '#14111a', backgroundColor: COLORS.gold, padding: { x: 30, y: 22 } })
        .setOrigin(0.5)
        .setVisible(weapons.length > 1)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          index = (index + step + weapons.length) % weapons.length;
          show();
        });
    };
    arrow(cx - 280, '◀', -1);
    arrow(cx + 280, '▶', 1);
    show();
  }
}
