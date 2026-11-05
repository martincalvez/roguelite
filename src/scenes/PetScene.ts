import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, RARITY_COLOR, RARITY_LABEL, RARITY_ORDER, SCENES } from '../config';
import { getItem } from '../data';
import { GameState } from '../state/GameState';
import type { ItemInstance } from '../types';
import { describeModifier } from '../systems/equipment';
import { itemModifiers } from '../systems/stats';
import { clearScene } from '../ui/clearScene';

const VIEW_TOP = 690;
const VIEW_BOTTOM = 1180;
const CARD_WIDTH = 650;
const CARD_HEIGHT = 182;
const CARD_GAP = 14;

/** Gestion visuelle des familiers : compagnon actif, collection et équipement en un toucher. */
export class PetScene extends Phaser.Scene {
  private content!: Phaser.GameObjects.Container;
  private maskShape?: Phaser.GameObjects.Graphics;
  private maxScroll = 0;
  private scrollY = 0;
  private dragStartY = 0;
  private dragStartScroll = 0;
  private dragging = false;
  private moved = false;

  constructor() {
    super(SCENES.pets);
  }

  create(): void {
    this.scrollY = 0;
    this.build();
    const onDown = (pointer: Phaser.Input.Pointer): void => {
      if (pointer.y < VIEW_TOP || pointer.y > VIEW_BOTTOM) return;
      this.dragging = true;
      this.moved = false;
      this.dragStartY = pointer.y;
      this.dragStartScroll = this.scrollY;
    };
    const onMove = (pointer: Phaser.Input.Pointer): void => {
      if (!this.dragging || !pointer.isDown) return;
      const distance = pointer.y - this.dragStartY;
      if (Math.abs(distance) > 12) this.moved = true;
      if (this.moved) this.setScroll(this.dragStartScroll - distance);
    };
    const onUp = (): void => {
      this.dragging = false;
    };
    const onWheel = (_pointer: Phaser.Input.Pointer, _objects: unknown, _dx: number, dy: number): void => {
      this.setScroll(this.scrollY + dy);
    };
    this.input.on('pointerdown', onDown);
    this.input.on('pointermove', onMove);
    this.input.on('pointerup', onUp);
    this.input.on('wheel', onWheel);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', onDown);
      this.input.off('pointermove', onMove);
      this.input.off('pointerup', onUp);
      this.input.off('wheel', onWheel);
    });
  }

  private setScroll(value: number): void {
    this.scrollY = Phaser.Math.Clamp(value, 0, this.maxScroll);
    this.content.y = -this.scrollY;
  }

  private build(): void {
    this.maskShape?.destroy();
    clearScene(this);
    const cx = GAME_WIDTH / 2;
    const data = GameState.data;
    const pets = data.inventory
      .filter((item) => getItem(item.defId).slot === 'pet')
      .sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || getItem(a.defId).name.localeCompare(getItem(b.defId).name));
    const equipped = GameState.equippedPet();

    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x12679b);
    this.add.rectangle(cx, 145, GAME_WIDTH, 190, 0x1688bd, 0.72);
    this.add
      .text(26, 55, '← Retour', { fontSize: '26px', color: '#ffffff', fontStyle: 'bold', stroke: '#123553', strokeThickness: 5, padding: { x: 12, y: 22 } })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start(SCENES.menu));
    this.add
      .text(cx, 58, 'FAMILIERS', { fontSize: '44px', color: COLORS.gold, fontStyle: 'bold', stroke: '#17314f', strokeThickness: 9 })
      .setOrigin(0.5);
    this.add
      .rectangle(cx, 112, 610, 52, 0x0c4774)
      .setStrokeStyle(4, 0x092e53);
    this.add
      .text(cx, 112, `NIV. ${data.accountLevel}   ·   ${data.gold} OR   ·   ${data.gems} GEMMES`, { fontSize: '22px', color: '#ffffff', fontStyle: 'bold', stroke: '#17314f', strokeThickness: 4 })
      .setOrigin(0.5);

    this.buildShowcase(equipped?.instance);
    this.add
      .text(cx, 645, `COLLECTION  ·  ${pets.length}`, { fontSize: '30px', color: '#ffffff', fontStyle: 'bold', stroke: '#123553', strokeThickness: 6 })
      .setOrigin(0.5);
    this.buildCollection(pets);
  }

  private buildShowcase(item?: ItemInstance): void {
    const cx = GAME_WIDTH / 2;
    const panel = this.add.rectangle(cx, 380, 650, 480, 0x155187).setStrokeStyle(9, 0xffcf45);
    panel.setDepth(1);
    this.add.rectangle(cx, 380, 630, 460, 0x247cc1, 0.7).setDepth(1);
    this.add
      .text(cx, 183, item ? 'TON COMPAGNON' : 'CHOISIS TON COMPAGNON', {
        fontSize: '28px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#102d4c',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.add.image(cx - 92, 302, 'player').setDisplaySize(112, 112).setDepth(2);
    if (item) {
      const def = getItem(item.defId);
      const texture = `pet-${def.id}`;
      if (def.petAppearance && this.textures.exists(texture)) this.add.image(cx + 100, 293, texture).setDisplaySize(156, 156).setDepth(2);
      this.add
        .text(cx, 390, def.name, { fontSize: '36px', color: RARITY_COLOR[item.rarity], fontStyle: 'bold', stroke: '#172139', strokeThickness: 7 })
        .setOrigin(0.5)
        .setDepth(2);
      this.add
        .text(cx, 432, `${RARITY_LABEL[item.rarity]}  ·  Niv. ${item.level}`, { fontSize: '24px', color: '#ffffff', fontStyle: 'bold', stroke: '#172139', strokeThickness: 4 })
        .setOrigin(0.5)
        .setDepth(2);
      const modifiers = itemModifiers(item).map(describeModifier).join('   ·   ');
      this.add
        .text(cx, 465, def.description, { fontSize: '23px', color: '#f7f4ff', align: 'center', wordWrap: { width: 570 }, stroke: '#17314f', strokeThickness: 3 })
        .setOrigin(0.5)
        .setDepth(2);
      this.add
        .text(cx, 512, modifiers, { fontSize: '22px', color: '#f7f4ff', align: 'center', wordWrap: { width: 570 }, stroke: '#17314f', strokeThickness: 3 })
        .setOrigin(0.5)
        .setDepth(2);
      this.add
        .text(cx, 562, 'ÉQUIPÉ', { fontSize: '28px', color: '#193a34', fontStyle: 'bold', backgroundColor: '#69f59a', padding: { x: 34, y: 24 } })
        .setOrigin(0.5)
        .setDepth(2);
    } else {
      this.add
        .text(cx + 90, 315, 'Aucun familier équipé', { fontSize: '25px', color: '#ffffff', fontStyle: 'bold', stroke: '#17314f', strokeThickness: 5 })
        .setOrigin(0.5)
        .setDepth(2);
    }
  }

  private buildCollection(pets: ItemInstance[]): void {
    const columns = 1;
    const startX = GAME_WIDTH / 2;
    this.content = this.add.container(0, 0);
    const equippedUid = GameState.data.equipped.pet;

    pets.forEach((item, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = startX + column * (CARD_WIDTH + CARD_GAP);
      const y = VIEW_TOP + CARD_HEIGHT / 2 + row * (CARD_HEIGHT + CARD_GAP);
      const def = getItem(item.defId);
      const color = Phaser.Display.Color.HexStringToColor(RARITY_COLOR[item.rarity]).color;
      const card = this.add.rectangle(x, y, CARD_WIDTH, CARD_HEIGHT, 0x164475, 0.95).setStrokeStyle(6, color);
      this.content.add(card);

      const texture = `pet-${def.id}`;
      if (def.petAppearance && this.textures.exists(texture)) {
        this.content.add(this.add.image(x - 250, y, texture).setDisplaySize(104, 104));
      }
      this.content.add(
        this.add.text(x - 170, y - 48, def.name, {
          fontSize: '27px',
          color: RARITY_COLOR[item.rarity],
          fontStyle: 'bold',
          stroke: '#101f3c',
          strokeThickness: 5,
          wordWrap: { width: 360 },
        }).setOrigin(0, 0.5),
      );
      const statLabel = itemModifiers(item).map(describeModifier).join(' · ');
      this.content.add(
        this.add.text(x - 170, y + 8, `${RARITY_LABEL[item.rarity]} · Niv. ${item.level}   ·   ${statLabel}`, {
          fontSize: '22px',
          color: '#f4f4ff',
          stroke: '#101f3c',
          strokeThickness: 4,
          wordWrap: { width: 300 },
        }).setOrigin(0, 0.5),
      );

      const button = this.add
        .text(x + 205, y, equippedUid === item.uid ? 'ÉQUIPÉ' : 'ÉQUIPER', {
          fontSize: '25px',
          color: '#14243b',
          fontStyle: 'bold',
          backgroundColor: equippedUid === item.uid ? '#73e99b' : '#ffd447',
          padding: { x: 24, y: 26 },
        })
        .setOrigin(0.5);
      this.content.add(button);
      if (equippedUid !== item.uid) {
        button.setInteractive({ useHandCursor: true });
        button.on('pointerup', () => {
          if (this.moved) return;
          GameState.equipItem(item.uid, 'pet');
          this.build();
        });
      }
    });

    const rows = Math.ceil(pets.length / columns);
    const contentHeight = rows * (CARD_HEIGHT + CARD_GAP);
    this.maxScroll = Math.max(0, contentHeight - (VIEW_BOTTOM - VIEW_TOP));
    this.maskShape = this.make.graphics({}, false).fillRect(0, VIEW_TOP, GAME_WIDTH, VIEW_BOTTOM - VIEW_TOP);
    this.content.setMask(this.maskShape.createGeometryMask());
    this.setScroll(this.scrollY);
  }
}
