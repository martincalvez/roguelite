import Phaser from 'phaser';
import { SCENES } from '../config';
import { ENEMIES, HEROES, ITEMS } from '../data';
import type { ItemDef } from '../types';

/** Charge les assets. Tant qu'il n'y a pas de sprites, génère des formes simples. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  preload(): void {
    this.load.image('item-amulette-braise', 'assets/twin-core.png');
    this.load.image('pet-familier_chouette', 'assets/generated/gemini-transparent/owl-pose-1.png');
    this.load.image('hero-aldric', 'assets/generated/gemini-transparent/aldric-view-r1-c1.png');
    this.load.spritesheet('hero-aldric-sheet', 'assets/generated/gemini-transparent/aldric-sheet.png', {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.image('tile-grass', 'assets/tiles/grass-tile.png');
    this.load.image('xp-orb', 'assets/generated/gemini-transparent/xp-gem.png');
    this.load.image('coin-gold', 'assets/generated/gemini-transparent/gold-coin.png');
    this.load.image('stone-wall-texture', 'assets/generated/gemini-transparent/stone-wall-texture.png');
    this.load.image('stone-pillar', 'assets/generated/gemini-transparent/stone-pillar.png');
    this.load.image('water-texture', 'assets/generated/gemini-transparent/water-texture.png');
    this.load.image('enemy-art-turret', 'assets/generated/gemini-transparent/red-turret.png');
    this.load.image('enemy-art-crystal-green', 'assets/generated/gemini-transparent/crystal-golem-green.png');
    this.load.image('enemy-art-crystal-pink', 'assets/generated/gemini-transparent/crystal-golem-pink.png');
    this.load.image('enemy-art-blue-knight', 'assets/generated/gemini-transparent/blue-knight-boss.png');
  }

  create(): void {
    this.makeCircle('player', 22, 0x3fa4ff, true);
    for (const hero of HEROES) {
      if (!this.textures.exists(`hero-${hero.id}`)) this.makeHeroTexture(hero);
    }
    this.makeArrow('projectile', 0xffd33f, 0xfff4a3);
    this.makeEnergyOrb('projectile-bolt', 0x36d8ff);
    this.makeShuriken('projectile-shuriken');
    this.makeEnergyOrb('enemy-projectile', 0xff3b6b);
    this.makeCircle('particle', 5, 0xffffff);
    this.makeCircle('orbit-orb', 14, 0xb35cff);
    if (!this.textures.exists('xp-orb')) this.makeCircle('xp-orb', 6, 0x5cff7a);
    // Un cercle par type d'ennemi, à sa couleur et son rayon (EnemyDef).
    for (const def of ENEMIES) {
      this.makeCircle(`enemy-${def.id}`, def.radius, Phaser.Display.Color.HexStringToColor(def.color).color);
    }
    for (const item of ITEMS) {
      if (item.slot === 'pet' && item.petAppearance && !this.textures.exists(`pet-${item.id}`)) this.makePetTexture(item);
    }
    this.scene.start(SCENES.menu);
  }

  private makePetTexture(item: ItemDef): void {
    const appearance = item.petAppearance;
    if (!appearance) return;
    const body = Phaser.Display.Color.HexStringToColor(appearance.bodyColor).color;
    const accent = Phaser.Display.Color.HexStringToColor(appearance.accentColor).color;
    const eyes = Phaser.Display.Color.HexStringToColor(appearance.eyeColor).color;
    const g = this.add.graphics();

    // Ombre et contour épais pour garder la silhouette lisible sur le sol du combat.
    g.fillStyle(0x1a1020, 0.2).fillEllipse(64, 114, 66, 16);
    g.lineStyle(7, 0x1a1020, 0.8);

    if (appearance.form === 'owl') {
      g.fillStyle(body, 1).fillEllipse(64, 66, 62, 72);
      g.fillEllipse(31, 71, 30, 42);
      g.fillEllipse(97, 71, 30, 42);
      g.fillStyle(accent, 1).fillEllipse(64, 77, 38, 42);
      g.fillStyle(body, 1).fillTriangle(39, 43, 39, 14, 58, 40).fillTriangle(70, 40, 89, 14, 89, 43);
      g.lineStyle(5, 0x1a1020, 0.75).strokeEllipse(64, 66, 62, 72);
      g.fillStyle(0xffffff, 1).fillCircle(51, 57, 11).fillCircle(77, 57, 11);
      g.fillStyle(eyes, 1).fillCircle(52, 58, 6).fillCircle(78, 58, 6);
      g.fillStyle(0x1a1020, 1).fillTriangle(58, 73, 70, 73, 64, 82);
      g.fillStyle(0xffb536, 1).fillEllipse(52, 103, 16, 8).fillEllipse(76, 103, 16, 8);
    } else if (appearance.form === 'dragon') {
      g.fillStyle(body, 1).fillTriangle(39, 46, 12, 18, 30, 66).fillTriangle(89, 46, 116, 18, 98, 66);
      g.fillTriangle(33, 77, 10, 95, 43, 90);
      g.fillStyle(accent, 1).fillEllipse(64, 79, 30, 38);
      g.fillStyle(body, 1).fillCircle(64, 61, 38);
      g.lineStyle(6, 0x1a1020, 0.8).strokeCircle(64, 61, 38);
      g.fillStyle(accent, 1).fillTriangle(39, 39, 40, 16, 55, 38).fillTriangle(73, 38, 88, 16, 89, 39);
      g.fillStyle(0xffffff, 1).fillCircle(51, 58, 10).fillCircle(77, 58, 10);
      g.fillStyle(eyes, 1).fillCircle(53, 59, 6).fillCircle(79, 59, 6);
      g.fillStyle(0x1a1020, 1).fillCircle(58, 75, 3).fillCircle(70, 75, 3);
    } else {
      g.fillStyle(body, 1).fillTriangle(33, 48, 18, 18, 53, 38).fillTriangle(75, 38, 110, 18, 95, 48);
      g.fillTriangle(42, 83, 50, 112, 62, 88).fillTriangle(66, 88, 78, 112, 86, 83);
      g.fillCircle(64, 62, 38);
      g.lineStyle(6, 0x1a1020, 0.8).strokeCircle(64, 62, 38);
      g.fillStyle(accent, 1).fillEllipse(64, 77, 36, 22);
      g.fillStyle(0xffffff, 1).fillCircle(51, 57, 10).fillCircle(77, 57, 10);
      g.fillStyle(eyes, 1).fillCircle(53, 58, 6).fillCircle(79, 58, 6);
      g.fillStyle(0x1a1020, 1).fillCircle(64, 74, 4);
    }

    g.fillStyle(0xffffff, 0.32).fillCircle(47, 43, 10);
    g.generateTexture(`pet-${item.id}`, 128, 128);
    g.destroy();
  }

  private makeHeroTexture(hero: (typeof HEROES)[number]): void {
    const look = hero.appearance;
    const outfit = Phaser.Display.Color.HexStringToColor(look.outfitColor).color;
    const accent = Phaser.Display.Color.HexStringToColor(look.accentColor).color;
    const hair = Phaser.Display.Color.HexStringToColor(look.hairColor).color;
    const eyes = Phaser.Display.Color.HexStringToColor(look.eyeColor).color;
    const g = this.add.graphics();

    g.fillStyle(0x152546, 0.28).fillEllipse(64, 148, 76, 18);
    // Cape and tunic with thick dark edges, designed to read both as a portrait and in combat.
    g.lineStyle(8, 0x18213b, 1);
    g.fillStyle(outfit, 1).fillTriangle(27, 82, 101, 82, 119, 143).strokeTriangle(27, 82, 101, 82, 119, 143);
    g.fillStyle(accent, 1).fillTriangle(27, 82, 7, 137, 39, 128).strokeTriangle(27, 82, 7, 137, 39, 128);
    g.fillStyle(outfit, 1).fillRoundedRect(37, 73, 54, 62, 16).strokeRoundedRect(37, 73, 54, 62, 16);
    g.fillStyle(0xffd29a, 1).fillEllipse(64, 60, 54, 62).lineStyle(6, 0x18213b, 1).strokeEllipse(64, 60, 54, 62);

    if (look.form === 'ranger') {
      g.fillStyle(hair, 1).fillEllipse(64, 35, 65, 33);
      g.fillStyle(outfit, 1).fillTriangle(24, 48, 42, 4, 61, 43).fillTriangle(68, 43, 91, 4, 104, 49);
      g.lineStyle(7, 0x18213b, 1).strokeTriangle(24, 48, 42, 4, 61, 43).strokeTriangle(68, 43, 91, 4, 104, 49);
      g.fillStyle(accent, 1).fillRoundedRect(36, 72, 56, 13, 5);
      // Tiny bow mark on the shoulder.
      g.lineStyle(6, accent, 1).lineBetween(93, 93, 112, 117).lineBetween(110, 94, 96, 119);
    } else {
      g.fillStyle(hair, 1).fillEllipse(64, 34, 69, 38);
      g.fillStyle(hair, 1).fillTriangle(30, 45, 18, 10, 54, 35).fillTriangle(64, 39, 71, 0, 87, 36).fillTriangle(78, 39, 110, 15, 97, 57);
      g.lineStyle(6, 0x18213b, 1).strokeEllipse(64, 34, 69, 38);
      g.fillStyle(accent, 1).fillTriangle(42, 101, 64, 127, 86, 101);
      // Bright magical gem on the chest.
      g.fillStyle(0x60f3ff, 1).fillTriangle(64, 91, 73, 101, 64, 111).fillTriangle(64, 91, 55, 101, 64, 111);
      g.lineStyle(5, accent, 1).lineBetween(103, 83, 116, 131);
      g.fillStyle(0x60f3ff, 1).fillCircle(116, 130, 8);
    }

    g.fillStyle(0xffffff, 1).fillEllipse(51, 60, 12, 16).fillEllipse(77, 60, 12, 16);
    g.fillStyle(eyes, 1).fillCircle(52, 61, 5).fillCircle(78, 61, 5);
    g.fillStyle(0x172139, 1).fillEllipse(64, 77, 8, 4);
    g.fillStyle(0xffffff, 0.38).fillCircle(44, 49, 9);
    g.generateTexture(`hero-${hero.id}`, 128, 160);
    g.destroy();
  }

  /** `facingMark` : petit point clair sur le bord droit, pour voir où regarde le héros (rotation 0 = droite). */
  private makeCircle(key: string, radius: number, color: number, facingMark = false): void {
    const g = this.add.graphics();
    const outline = Math.max(3, Math.round(radius * 0.2));
    g.fillStyle(color, 1).fillCircle(radius, radius, radius);
    // Reflet en haut à gauche : donne le côté « bonbon » du style cartoon.
    g.fillStyle(0xffffff, 0.35).fillCircle(radius * 0.65, radius * 0.6, radius * 0.3);
    g.lineStyle(outline, 0x1a1020, 0.7).strokeCircle(radius, radius, radius - outline / 2);
    if (facingMark) g.fillStyle(0xffffff, 1).fillCircle(radius * 2 - 8, radius, 5);
    g.generateTexture(key, radius * 2, radius * 2);
    g.destroy();
  }

  /** Flèche directionnelle épaisse, bord sombre et reflets dorés lisibles en mouvement. */
  private makeArrow(key: string, color: number, highlight: number): void {
    const g = this.add.graphics();
    g.fillStyle(0x143c5c, 0.24).fillEllipse(30, 33, 48, 8);
    g.lineStyle(10, 0x38210d, 1).lineBetween(9, 20, 45, 20);
    g.lineStyle(6, color, 1).lineBetween(9, 20, 45, 20);
    g.lineStyle(6, 0x38210d, 1).strokeTriangle(59, 20, 41, 5, 41, 35);
    g.fillStyle(color, 1).fillTriangle(59, 20, 41, 5, 41, 35);
    g.lineStyle(4, 0x38210d, 1).lineBetween(10, 20, 2, 10).lineBetween(10, 20, 2, 30);
    g.lineStyle(2, highlight, 1).lineBetween(12, 18, 43, 18);
    g.generateTexture(key, 64, 40);
    g.destroy();
  }

  /** Orbe d'énergie brillant, teinté selon le camp et le type de projectile. */
  private makeEnergyOrb(key: string, color: number): void {
    const g = this.add.graphics();
    g.fillStyle(color, 0.18).fillCircle(24, 24, 23);
    g.fillStyle(color, 0.45).fillCircle(24, 24, 17);
    g.lineStyle(4, 0x172b49, 1).strokeCircle(24, 24, 12);
    g.fillStyle(color, 1).fillCircle(24, 24, 10);
    g.fillStyle(0xffffff, 0.9).fillCircle(20, 19, 4);
    g.generateTexture(key, 48, 48);
    g.destroy();
  }

  /** Shuriken à quatre branches qui pivote dans la direction de son tir. */
  private makeShuriken(key: string): void {
    const g = this.add.graphics();
    g.fillStyle(0x263551, 1).fillPoints([
      new Phaser.Geom.Point(32, 2), new Phaser.Geom.Point(38, 24), new Phaser.Geom.Point(62, 32),
      new Phaser.Geom.Point(38, 38), new Phaser.Geom.Point(32, 62), new Phaser.Geom.Point(26, 38),
      new Phaser.Geom.Point(2, 32), new Phaser.Geom.Point(26, 26),
    ], true);
    g.fillStyle(0xb9f5ff, 1).fillPoints([
      new Phaser.Geom.Point(32, 6), new Phaser.Geom.Point(36, 26), new Phaser.Geom.Point(58, 32),
      new Phaser.Geom.Point(36, 36), new Phaser.Geom.Point(32, 58), new Phaser.Geom.Point(28, 36),
      new Phaser.Geom.Point(6, 32), new Phaser.Geom.Point(28, 28),
    ], true);
    g.fillStyle(0x289fff, 1).fillCircle(32, 32, 7);
    g.generateTexture(key, 64, 64);
    g.destroy();
  }
}
