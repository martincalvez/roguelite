import Phaser from 'phaser';
import { SCENES } from '../config';
import { ENEMIES, HEROES, ITEMS } from '../data';
import type { EnemyDef, ItemDef } from '../types';

/** Charge les assets et dessine les éléments qui n'ont pas besoin d'un fichier image. */
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
    this.makeEnergyOrb('enemy-fireball', 0xff6d32);
    this.makeCircle('particle', 5, 0xffffff);
    this.makeCircle('orbit-orb', 14, 0xb35cff);
    if (!this.textures.exists('xp-orb')) this.makeCircle('xp-orb', 6, 0x5cff7a);
    // Chaque silhouette est produite ici pour garder les combats variés sans alourdir le jeu mobile.
    for (const def of ENEMIES) {
      this.makeEnemyTexture(def);
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

  /**
   * Silhouettes de combat originales : un rôle = une couleur, une forme et un détail de lecture.
   * Les textures ont toutes le même cadre afin que Enemy puisse harmoniser leur taille à partir du rayon gameplay.
   */
  private makeEnemyTexture(def: EnemyDef): void {
    const g = this.add.graphics();
    const outline = 0x172039;
    const ink = 0x10182a;
    const c = 80;
    const shadow = () => g.fillStyle(0x0d1830, 0.28).fillEllipse(c, 143, 106, 23);
    const ring = (x: number, y: number, radius: number, color: number, width = 6) => {
      g.fillStyle(color, 1).fillCircle(x, y, radius);
      g.lineStyle(width, outline, 1).strokeCircle(x, y, radius - width / 2);
    };
    const eye = (x: number, y: number, color: number, radius = 8) => {
      ring(x, y, radius, 0xf8f6e8, 3);
      g.fillStyle(color, 1).fillCircle(x + 1, y + 1, radius * 0.48);
      g.fillStyle(0xffffff, 0.92).fillCircle(x - 2, y - 2, radius * 0.2);
    };
    const gem = (x: number, y: number, size: number, color: number) => {
      g.fillStyle(color, 1).fillPoints([
        new Phaser.Geom.Point(x, y - size), new Phaser.Geom.Point(x + size * 0.78, y),
        new Phaser.Geom.Point(x, y + size), new Phaser.Geom.Point(x - size * 0.78, y),
      ], true);
      g.lineStyle(4, outline, 1).strokePoints([
        new Phaser.Geom.Point(x, y - size), new Phaser.Geom.Point(x + size * 0.78, y),
        new Phaser.Geom.Point(x, y + size), new Phaser.Geom.Point(x - size * 0.78, y),
      ], true);
      g.fillStyle(0xffffff, 0.5).fillTriangle(x - size * 0.28, y - size * 0.55, x + size * 0.38, y - size * 0.1, x - size * 0.2, y - size * 0.04);
    };

    shadow();
    switch (def.id) {
      case 'gobelin': {
        g.fillStyle(0x2b743f, 1).fillTriangle(46, 62, 19, 42, 42, 90).fillTriangle(114, 62, 141, 42, 118, 90);
        g.lineStyle(7, outline, 1).strokeTriangle(46, 62, 19, 42, 42, 90).strokeTriangle(114, 62, 141, 42, 118, 90);
        g.fillStyle(0x4ecb61, 1).fillEllipse(c, 101, 72, 78);
        g.lineStyle(7, outline, 1).strokeEllipse(c, 101, 72, 78);
        ring(56, 80, 17, 0x8bea64);
        ring(104, 80, 17, 0x8bea64);
        eye(57, 79, 0xffd84b, 7);
        eye(103, 79, 0xffd84b, 7);
        g.fillStyle(0x2c5131, 1).fillTriangle(69, 102, 91, 102, 80, 112);
        g.fillStyle(0xb9f47f, 1).fillTriangle(48, 124, 61, 115, 58, 135).fillTriangle(102, 124, 112, 115, 113, 135);
        break;
      }
      case 'archer_squelette': {
        g.lineStyle(10, 0x65462e, 1).lineBetween(121, 54, 128, 122).lineBetween(128, 54, 138, 121);
        g.lineStyle(3, 0xf8e8c2, 1).lineBetween(121, 54, 138, 121);
        g.fillStyle(0x8d6a4a, 1).fillTriangle(61, 95, 38, 139, 84, 139).fillTriangle(99, 95, 76, 139, 122, 139);
        g.lineStyle(7, outline, 1).strokeTriangle(61, 95, 38, 139, 84, 139).strokeTriangle(99, 95, 76, 139, 122, 139);
        ring(c, 72, 37, 0xffecc4, 7);
        g.fillStyle(ink, 1).fillEllipse(65, 73, 18, 22).fillEllipse(95, 73, 18, 22);
        g.fillStyle(0x55ddff, 1).fillCircle(65, 72, 5).fillCircle(95, 72, 5);
        g.fillStyle(0x8f5b43, 1).fillTriangle(70, 92, 90, 92, 80, 103);
        g.fillStyle(0x704a33, 1).fillRect(64, 109, 32, 7);
        break;
      }
      case 'shaman': {
        g.fillStyle(0x57258e, 1).fillTriangle(80, 37, 35, 136, 125, 136);
        g.lineStyle(8, outline, 1).strokeTriangle(80, 37, 35, 136, 125, 136);
        g.fillStyle(0x9e4dff, 1).fillTriangle(80, 45, 48, 126, 112, 126);
        ring(c, 80, 27, 0xe6a9ff, 5);
        g.fillStyle(0x4c2568, 1).fillEllipse(63, 79, 13, 18).fillEllipse(97, 79, 13, 18);
        g.fillStyle(0x69f6ff, 1).fillCircle(64, 80, 5).fillCircle(96, 80, 5);
        g.lineStyle(8, 0x724631, 1).lineBetween(122, 78, 132, 137);
        gem(121, 66, 13, 0xff48db);
        g.fillStyle(0xd960ff, 1).fillTriangle(53, 123, 80, 104, 107, 123);
        break;
      }
      case 'pyromancien_braise': {
        g.fillStyle(0x54213a, 1).fillTriangle(80, 28, 29, 139, 131, 139);
        g.lineStyle(8, outline, 1).strokeTriangle(80, 28, 29, 139, 131, 139);
        g.fillStyle(0xe4543a, 1).fillTriangle(80, 38, 46, 129, 114, 129);
        ring(c, 78, 29, 0x3a1b32, 5);
        eye(66, 79, 0xffdf5d, 7);
        eye(94, 79, 0xffdf5d, 7);
        g.fillStyle(0xffbd3a, 1).fillTriangle(80, 52, 94, 96, 80, 116).fillTriangle(80, 52, 66, 96, 80, 116);
        g.fillStyle(0xff6b38, 1).fillCircle(121, 73, 18);
        g.lineStyle(5, outline, 1).strokeCircle(121, 73, 16);
        break;
      }
      case 'lanceur_orage': {
        g.fillStyle(0x302566, 1).fillTriangle(80, 24, 31, 140, 129, 140);
        g.lineStyle(8, outline, 1).strokeTriangle(80, 24, 31, 140, 129, 140);
        g.fillStyle(0x7357db, 1).fillTriangle(80, 35, 48, 129, 112, 129);
        ring(c, 80, 30, 0x201b4b, 5);
        eye(66, 81, 0x78f5ff, 7);
        eye(94, 81, 0x78f5ff, 7);
        g.lineStyle(8, 0x7a4a34, 1).lineBetween(119, 54, 128, 136);
        gem(120, 47, 14, 0x64eaff);
        g.fillStyle(0xaa8dff, 1).fillTriangle(70, 112, 91, 112, 80, 129);
        break;
      }
      case 'ogre': {
        g.fillStyle(0x6b2834, 1).fillTriangle(50, 72, 34, 36, 64, 59).fillTriangle(110, 72, 126, 36, 96, 59);
        g.lineStyle(8, outline, 1).strokeTriangle(50, 72, 34, 36, 64, 59).strokeTriangle(110, 72, 126, 36, 96, 59);
        g.fillStyle(0xe75446, 1).fillEllipse(c, 99, 102, 88);
        g.lineStyle(9, outline, 1).strokeEllipse(c, 99, 102, 88);
        ring(59, 80, 17, 0xff7450, 5);
        ring(101, 80, 17, 0xff7450, 5);
        eye(60, 79, 0xfff05b, 8);
        eye(100, 79, 0xfff05b, 8);
        g.fillStyle(0xf9e6ba, 1).fillTriangle(64, 107, 74, 107, 69, 120).fillTriangle(86, 107, 96, 107, 91, 120);
        g.fillStyle(0x843333, 1).fillRoundedRect(45, 125, 70, 20, 8);
        break;
      }
      case 'scarabee_dore': {
        g.fillStyle(0x6d4222, 1).fillEllipse(c, 108, 92, 61);
        g.lineStyle(8, outline, 1).strokeEllipse(c, 108, 92, 61);
        g.fillStyle(0xefa92b, 1).fillEllipse(c, 93, 58, 78);
        g.lineStyle(7, outline, 1).strokeEllipse(c, 93, 58, 78);
        g.lineStyle(6, 0x6f421c, 1).lineBetween(80, 55, 80, 132).lineBetween(52, 83, 108, 83);
        g.fillStyle(0xffe36c, 1).fillEllipse(61, 78, 15, 28).fillEllipse(99, 78, 15, 28);
        eye(66, 104, 0x55eaff, 6);
        eye(94, 104, 0x55eaff, 6);
        g.lineStyle(7, 0x6d4222, 1).lineBetween(44, 118, 22, 134).lineBetween(116, 118, 138, 134);
        break;
      }
      case 'sentinelle_azur': {
        g.fillStyle(0x123d84, 1).fillTriangle(42, 117, 80, 30, 118, 117);
        g.lineStyle(8, outline, 1).strokeTriangle(42, 117, 80, 30, 118, 117);
        g.fillStyle(0x2d8ee8, 1).fillTriangle(52, 111, 80, 47, 108, 111);
        ring(c, 86, 28, 0x1ed3ff, 6);
        ring(c, 86, 14, 0x172c53, 4);
        g.fillStyle(0xc6fbff, 1).fillCircle(76, 81, 5);
        g.fillStyle(0x69eeff, 1).fillTriangle(52, 124, 42, 145, 69, 133).fillTriangle(108, 124, 118, 145, 91, 133);
        break;
      }
      case 'esprit_saphir': {
        g.fillStyle(0x4938a8, 1).fillTriangle(80, 29, 39, 122, 65, 113).fillTriangle(80, 29, 121, 122, 95, 113);
        g.lineStyle(8, outline, 1).strokeTriangle(80, 29, 39, 122, 65, 113).strokeTriangle(80, 29, 121, 122, 95, 113);
        g.fillStyle(0x755bff, 1).fillCircle(c, 81, 39).fillTriangle(43, 104, 59, 137, 72, 108).fillTriangle(88, 108, 101, 137, 117, 104);
        g.fillStyle(0xb8f4ff, 1).fillEllipse(80, 99, 37, 25);
        eye(65, 75, 0x54e9ff, 7);
        eye(95, 75, 0x54e9ff, 7);
        g.fillStyle(0xffffff, 0.42).fillCircle(63, 53, 13);
        break;
      }
      case 'golem_floral': {
        g.fillStyle(0x356c42, 1).fillCircle(49, 111, 25).fillCircle(111, 111, 25);
        ring(c, 92, 47, 0x5eac56, 8);
        g.fillStyle(0x83d95c, 1).fillCircle(80, 83, 32);
        g.lineStyle(6, 0x356c42, 1).lineBetween(80, 52, 80, 126).lineBetween(54, 92, 106, 92);
        eye(66, 80, 0xfff35a, 8);
        eye(94, 80, 0xfff35a, 8);
        g.fillStyle(0xf06aac, 1).fillCircle(80, 48, 13).fillCircle(58, 58, 9).fillCircle(102, 58, 9);
        break;
      }
      case 'gardien_racines': {
        g.fillStyle(0x2f5a3e, 1).fillTriangle(80, 24, 24, 134, 58, 124).fillTriangle(80, 24, 136, 134, 102, 124);
        g.lineStyle(9, outline, 1).strokeTriangle(80, 24, 24, 134, 58, 124).strokeTriangle(80, 24, 136, 134, 102, 124);
        ring(c, 90, 52, 0x79a948, 8);
        g.fillStyle(0xa4d654, 1).fillEllipse(80, 86, 73, 67);
        eye(60, 80, 0xffe963, 9);
        eye(100, 80, 0xffe963, 9);
        g.lineStyle(7, 0x5d3626, 1).lineBetween(44, 123, 116, 123);
        g.fillStyle(0xff75b5, 1).fillCircle(80, 39, 16);
        break;
      }
      case 'roi_ambre': {
        g.fillStyle(0x75371f, 1).fillEllipse(c, 105, 114, 84);
        g.lineStyle(9, outline, 1).strokeEllipse(c, 105, 114, 84);
        g.fillStyle(0xf4a321, 1).fillEllipse(c, 83, 78, 67);
        g.lineStyle(7, outline, 1).strokeEllipse(c, 83, 78, 67);
        g.fillStyle(0xffe766, 1).fillTriangle(49, 61, 61, 25, 75, 56).fillTriangle(85, 56, 99, 25, 111, 61);
        g.lineStyle(6, outline, 1).strokeTriangle(49, 61, 61, 25, 75, 56).strokeTriangle(85, 56, 99, 25, 111, 61);
        eye(64, 81, 0x57efff, 9);
        eye(96, 81, 0x57efff, 9);
        g.lineStyle(7, 0x7c361d, 1).lineBetween(80, 51, 80, 117);
        gem(80, 51, 12, 0xff5adb);
        break;
      }
      case 'chauve_souris_braise': {
        g.fillStyle(0x662857, 1).fillTriangle(67, 88, 10, 61, 42, 120).fillTriangle(93, 88, 150, 61, 118, 120);
        g.lineStyle(8, outline, 1).strokeTriangle(67, 88, 10, 61, 42, 120).strokeTriangle(93, 88, 150, 61, 118, 120);
        g.fillStyle(0xf15483, 1).fillTriangle(62, 77, 50, 40, 73, 63).fillTriangle(98, 77, 110, 40, 87, 63);
        ring(c, 91, 30, 0xff5f8f, 6);
        eye(68, 88, 0xffe457, 8);
        eye(92, 88, 0xffe457, 8);
        g.fillStyle(0xffcc55, 1).fillTriangle(74, 105, 86, 105, 80, 115);
        break;
      }
      case 'mage_ombre': {
        g.fillStyle(0x35105f, 1).fillTriangle(80, 30, 31, 139, 129, 139);
        g.lineStyle(8, outline, 1).strokeTriangle(80, 30, 31, 139, 129, 139);
        g.fillStyle(0x7d3bd9, 1).fillTriangle(80, 42, 47, 130, 113, 130);
        ring(c, 77, 31, 0x231340, 5);
        eye(66, 78, 0x68f2ff, 7);
        eye(94, 78, 0x68f2ff, 7);
        g.lineStyle(8, 0x653c2d, 1).lineBetween(124, 81, 132, 136);
        gem(122, 69, 12, 0xef55ff);
        break;
      }
      case 'elementaire_lave': {
        g.fillStyle(0x85322a, 1).fillTriangle(80, 25, 25, 133, 59, 121).fillTriangle(80, 25, 135, 133, 101, 121);
        g.lineStyle(9, outline, 1).strokeTriangle(80, 25, 25, 133, 59, 121).strokeTriangle(80, 25, 135, 133, 101, 121);
        g.fillStyle(0xf26335, 1).fillCircle(c, 87, 47);
        g.lineStyle(8, outline, 1).strokeCircle(c, 87, 43);
        g.lineStyle(6, 0xffd149, 1).lineBetween(52, 74, 76, 93).lineBetween(82, 52, 83, 122).lineBetween(107, 73, 86, 94);
        eye(63, 81, 0xfff263, 8);
        eye(97, 81, 0xfff263, 8);
        g.fillStyle(0xffde58, 1).fillTriangle(75, 109, 85, 109, 80, 119);
        break;
      }
      case 'golem_cendre': {
        g.fillStyle(0x55383e, 1).fillCircle(46, 111, 28).fillCircle(114, 111, 28);
        ring(c, 90, 54, 0x8b5960, 9);
        g.fillStyle(0x555d70, 1).fillEllipse(80, 84, 81, 72);
        g.lineStyle(7, 0x343747, 1).lineBetween(80, 47, 80, 127).lineBetween(42, 92, 118, 92);
        eye(61, 80, 0xff8d47, 10);
        eye(99, 80, 0xff8d47, 10);
        gem(80, 112, 15, 0xff633d);
        break;
      }
      case 'dragon_cendre': {
        g.fillStyle(0x6a2635, 1).fillTriangle(47, 91, 13, 50, 29, 126).fillTriangle(113, 91, 147, 50, 131, 126);
        g.lineStyle(9, outline, 1).strokeTriangle(47, 91, 13, 50, 29, 126).strokeTriangle(113, 91, 147, 50, 131, 126);
        g.fillStyle(0xe65537, 1).fillEllipse(c, 94, 90, 88);
        g.lineStyle(9, outline, 1).strokeEllipse(c, 94, 90, 88);
        g.fillStyle(0xff9f3f, 1).fillTriangle(52, 64, 58, 24, 74, 59).fillTriangle(86, 59, 102, 24, 108, 64);
        eye(63, 82, 0x5af4ff, 10);
        eye(97, 82, 0x5af4ff, 10);
        g.fillStyle(0xffdc58, 1).fillEllipse(80, 110, 33, 23);
        g.fillStyle(0x4b1f2b, 1).fillTriangle(68, 108, 92, 108, 80, 128);
        break;
      }
      default:
        ring(c, 87, 43, Phaser.Display.Color.HexStringToColor(def.color).color, 8);
        eye(64, 82, 0x54e9ff, 8);
        eye(96, 82, 0x54e9ff, 8);
    }

    g.fillStyle(0xffffff, 0.28).fillCircle(57, 54, 13);
    g.generateTexture(`enemy-${def.id}`, 160, 160);
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
