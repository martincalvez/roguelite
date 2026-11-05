import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config';
import { getHero, getPassive, HEROES } from '../data';
import { GameState } from '../state/GameState';
import { canUnlockHero } from '../systems/heroes';
import { clearScene } from '../ui/clearScene';

const VIEW_TOP = 690;
const VIEW_BOTTOM = 1190;
const CARD_HEIGHT = 190;
const CARD_GAP = 16;

/** Galerie des héros : aperçu des stats, sélection et déblocage avec les gemmes du joueur. */
export class HeroScene extends Phaser.Scene {
  private content!: Phaser.GameObjects.Container;
  private maskShape?: Phaser.GameObjects.Graphics;
  private maxScroll = 0;
  private scrollY = 0;
  private dragStartY = 0;
  private dragStartScroll = 0;
  private dragging = false;
  private moved = false;

  constructor() {
    super(SCENES.heroes);
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
    const onUp = (): void => { this.dragging = false; };
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
    const d = GameState.data;
    const selected = getHero(d.selectedHero);

    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x075794);
    const pattern = this.add.graphics();
    pattern.lineStyle(3, 0x51cfff, 0.11);
    for (let y = 210; y < GAME_HEIGHT; y += 150) {
      pattern.lineBetween(0, y, GAME_WIDTH, y + 170);
      pattern.lineBetween(GAME_WIDTH, y, 0, y + 170);
    }
    this.add.rectangle(cx, 130, GAME_WIDTH, 205, 0x1688bd, 0.55);

    this.add.text(26, 56, '← Retour', { fontSize: '26px', color: '#ffffff', fontStyle: 'bold', stroke: '#123553', strokeThickness: 5, padding: { x: 12, y: 22 } })
      .setOrigin(0, 0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.scene.start(SCENES.menu));
    this.add.text(cx, 56, 'HÉROS', { fontSize: '46px', color: COLORS.gold, fontStyle: 'bold', stroke: '#17314f', strokeThickness: 9 }).setOrigin(0.5);
    this.add.rectangle(cx, 115, 610, 52, 0x0c4774).setStrokeStyle(4, 0x092e53);
    this.add.text(cx, 115, `NIV. ${d.accountLevel}   ·   ${d.gems} GEMMES`, { fontSize: '24px', color: '#ffffff', fontStyle: 'bold', stroke: '#17314f', strokeThickness: 4 }).setOrigin(0.5);

    this.buildShowcase(selected.id);
    this.add.text(cx, 642, `TA COLLECTION  ·  ${d.unlockedHeroes.length}/${HEROES.length}`, { fontSize: '29px', color: '#ffffff', fontStyle: 'bold', stroke: '#123553', strokeThickness: 6 }).setOrigin(0.5);
    this.buildCards();
  }

  private buildShowcase(heroId: string): void {
    const cx = GAME_WIDTH / 2;
    const hero = getHero(heroId);
    const stats = GameState.heroStatsFor(heroId);
    this.add.rectangle(cx, 382, 660, 450, 0x123c69).setStrokeStyle(9, 0xffcf45);
    this.add.rectangle(cx, 382, 640, 430, 0x218bd0, 0.84);
    this.add.text(cx, 190, 'HÉROS ACTIF', { fontSize: '27px', color: '#ffffff', fontStyle: 'bold', stroke: '#102d4c', strokeThickness: 6 }).setOrigin(0.5);

    const customSprite = hero.id === 'aldric';
    this.add.image(cx - 86, customSprite ? 350 : 337, `hero-${hero.id}`).setDisplaySize(customSprite ? 200 : 210, customSprite ? 234 : 262);
    const pet = GameState.equippedPet();
    if (pet?.def.petAppearance && this.textures.exists(`pet-${pet.def.id}`)) {
      this.add.image(cx + 177, 370, `pet-${pet.def.id}`).setDisplaySize(114, 114);
    }
    this.add.text(cx, 472, hero.name.toUpperCase(), { fontSize: '42px', color: hero.appearance.accentColor, fontStyle: 'bold', stroke: '#152139', strokeThickness: 8 }).setOrigin(0.5);
    this.add.text(cx, 510, hero.description, { fontSize: '21px', color: '#ffffff', align: 'center', wordWrap: { width: 590 }, stroke: '#17314f', strokeThickness: 3 }).setOrigin(0.5);
    const passive = hero.passive ? getPassive(hero.passive).name : 'Aucun passif de départ';
    this.add.text(cx, 542, `ATQ ${Math.round(stats.attack)}   ·   PV ${Math.round(stats.maxHp)}   ·   ${passive}`, {
      fontSize: '20px', color: '#ffffff', fontStyle: 'bold', align: 'center', wordWrap: { width: 600 }, stroke: '#102d4c', strokeThickness: 4,
    }).setOrigin(0.5);
  }

  private buildCards(): void {
    const cx = GAME_WIDTH / 2;
    const data = GameState.data;
    this.content = this.add.container(0, 0);

    HEROES.forEach((hero, index) => {
      const y = VIEW_TOP + CARD_HEIGHT / 2 + index * (CARD_HEIGHT + CARD_GAP);
      const unlocked = data.unlockedHeroes.includes(hero.id);
      const active = data.selectedHero === hero.id;
      const affordable = canUnlockHero(hero, data.unlockedHeroes, data.gems);
      const border = active ? 0xffcf45 : unlocked ? 0x70dcff : 0x9b75d1;
      this.content.add(this.add.rectangle(cx, y, 650, CARD_HEIGHT, unlocked ? 0x145283 : 0x283c69, 0.97).setStrokeStyle(6, border));
      const customSprite = hero.id === 'aldric';
      this.content.add(this.add.image(cx - 250, y, `hero-${hero.id}`).setDisplaySize(customSprite ? 112 : 100, customSprite ? 112 : 126));

      const name = this.add.text(cx - 176, y - 56, hero.name, {
        fontSize: '32px', color: hero.appearance.accentColor, fontStyle: 'bold', stroke: '#111f3b', strokeThickness: 6,
      }).setOrigin(0, 0.5);
      this.content.add(name);
      const stats = GameState.heroStatsFor(hero.id);
      const passive = hero.passive ? getPassive(hero.passive).name : 'Polyvalent';
      this.content.add(this.add.text(cx - 176, y - 15, `ATQ ${Math.round(stats.attack)}  ·  PV ${Math.round(stats.maxHp)}`, {
        fontSize: '21px', color: '#ffffff', fontStyle: 'bold', stroke: '#111f3b', strokeThickness: 4,
      }).setOrigin(0, 0.5));
      this.content.add(this.add.text(cx - 176, y + 26, `${hero.description}  ·  ${passive}`, {
        fontSize: '18px', color: '#edf7ff', wordWrap: { width: 300 }, stroke: '#111f3b', strokeThickness: 3,
      }).setOrigin(0, 0.5));

      let label = `DÉBLOQUER\n${hero.unlockCostGems} GEMMES`;
      let background = '#22d83d';
      if (active) { label = 'SÉLECTIONNÉ'; background = '#69f59a'; }
      else if (unlocked) { label = 'CHOISIR'; background = '#32baff'; }
      else if (!affordable) { label = `IL MANQUE\n${hero.unlockCostGems - data.gems} GEMMES`; background = '#69788d'; }
      const button = this.add.text(cx + 218, y, label, {
        fontSize: '21px', color: '#10233a', fontStyle: 'bold', align: 'center', backgroundColor: background, padding: { x: 15, y: 25 },
      }).setOrigin(0.5);
      this.content.add(button);
      if (!active && (unlocked || affordable)) {
        button.setInteractive({ useHandCursor: true }).on('pointerup', () => {
          if (this.moved) return;
          if (unlocked) GameState.selectHero(hero.id);
          else GameState.unlockHero(hero.id);
          this.build();
        });
      }
    });

    const contentHeight = HEROES.length * (CARD_HEIGHT + CARD_GAP);
    this.maxScroll = Math.max(0, contentHeight - (VIEW_BOTTOM - VIEW_TOP));
    this.maskShape = this.make.graphics({}, false).fillRect(0, VIEW_TOP, GAME_WIDTH, VIEW_BOTTOM - VIEW_TOP);
    this.content.setMask(this.maskShape.createGeometryMask());
    this.setScroll(this.scrollY);
  }
}
