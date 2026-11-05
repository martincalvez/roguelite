import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, SCENES } from '../config';
import { cloudEnabled } from '../cloud/client';
import { Sync } from '../cloud/syncManager';
import { getHero } from '../data';
import { accountXpToNext } from '../systems/progression';
import { syncLabel } from '../ui/syncLabel';
import { GameState } from '../state/GameState';

/** Accueil illustré, adapté au téléphone. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.menu);
  }

  create(): void {
    // Un conflit de synchro attend une décision : on la demande tout de suite (jamais en plein run).
    if (Sync.status === 'conflict') {
      this.scene.start(SCENES.conflict);
      return;
    }
    const cx = GAME_WIDTH / 2;
    const d = GameState.data;
    const stats = GameState.heroStats();

    this.drawBackdrop();
    this.add.rectangle(cx, 58, 690, 80, 0x06385b).setStrokeStyle(5, 0x052743);
    this.add.rectangle(cx, 54, 678, 68, 0x158cc0).setStrokeStyle(3, 0x63e1ff);
    this.add.text(cx, 54, 'ROGUELITE FANTASY', {
      fontFamily: '"Arial Black", "Trebuchet MS", sans-serif', fontSize: '39px', color: '#ffe45a',
      stroke: '#252044', strokeThickness: 9, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.rectangle(cx, 123, 590, 48, 0x062d50, 0.93).setStrokeStyle(3, 0x50ceff);
    this.add.text(cx, 123, `✦ ${d.gold} OR       ◆ ${d.gems} GEMMES`, {
      fontSize: '23px', color: '#ffffff', fontStyle: 'bold', stroke: '#14213d', strokeThickness: 4,
    }).setOrigin(0.5);

    this.drawHeroStage(d.selectedHero);
    this.add.text(cx, 535, getHero(d.selectedHero).name.toUpperCase(), {
      fontSize: '36px', color: getHero(d.selectedHero).appearance.accentColor, fontStyle: 'bold',
      stroke: '#14213d', strokeThickness: 8,
    }).setOrigin(0.5);
    this.add.rectangle(cx, 580, 560, 48, 0x082f50, 0.88).setStrokeStyle(3, 0x47caff);
    this.add.text(cx, 580, `NIV. ${d.accountLevel}     ❤ ${Math.round(stats.maxHp)}     ⚔ ${Math.round(stats.attack)}`, {
      fontSize: '23px', color: '#ffffff', fontStyle: 'bold', stroke: '#14213d', strokeThickness: 4,
    }).setOrigin(0.5);

    // Niveau de compte : barre d'XP.
    const barWidth = 440;
    this.add.rectangle(cx, 630, barWidth, 23, 0x061b31, 0.8).setStrokeStyle(3, 0x112745);
    const fill = Phaser.Math.Clamp(d.accountXp / accountXpToNext(d.accountLevel), 0, 1);
    this.add.rectangle(cx - barWidth / 2, 630, Math.max(8, barWidth * fill), 23, 0x60fa38).setOrigin(0, 0.5);
    this.add
      .text(cx, 630, 'EXPÉRIENCE', { fontSize: '16px', color: '#ffffff', fontStyle: 'bold', stroke: '#1a1020', strokeThickness: 4 })
      .setOrigin(0.5);

    // Statut de la synchro cloud, discret, en haut.
    const status = this.add.text(cx, 674, '', { fontSize: '18px', fontStyle: 'bold', stroke: '#1a1020', strokeThickness: 4 }).setOrigin(0.5);
    const refreshStatus = (): void => {
      const label = syncLabel(Sync.status);
      status.setText(label?.text ?? '').setColor(label?.color ?? '#ffffff');
      if (Sync.status === 'conflict') this.scene.start(SCENES.conflict);
    };
    refreshStatus();
    const offStatus = Sync.onChange(refreshStatus);
    // La sauvegarde a été remplacée par celle du cloud : on redessine le menu avec les nouvelles valeurs.
    const offReplaced = Sync.onDataReplaced(() => this.scene.restart());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offStatus();
      offReplaced();
    });

    this.menuButton(cx, 750, 'JOUER', 45, () => this.scene.start(SCENES.chapters), '#ffc928', 450, 104);
    const left = 180;
    const right = GAME_WIDTH - left;
    this.menuButton(left, 875, 'HÉROS', 29, () => this.scene.start(SCENES.heroes), '#ed4db7', 310, 88);
    this.menuButton(right, 875, 'ÉQUIPEMENT', 27, () => this.scene.start(SCENES.equipment), '#258fe4', 310, 88);
    this.menuButton(left, 980, 'FAMILIERS', 27, () => this.scene.start(SCENES.pets), '#31c8d8', 310, 88);
    this.menuButton(right, 980, 'COFFRES', 29, () => this.scene.start(SCENES.chests), '#a846e3', 310, 88);
    this.menuButton(left, 1085, 'TALENTS', 29, () => this.scene.start(SCENES.talents), '#e99e20', 310, 88);
    this.menuButton(right, 1085, 'COMPTE', 29, () => this.scene.start(SCENES.account), cloudEnabled ? '#288edb' : '#69788d', 310, 88);
  }

  private drawBackdrop(): void {
    const g = this.add.graphics();
    g.fillGradientStyle(0x28c5d0, 0x168da8, 0x087287, 0x07516e, 1).fillRect(0, 0, GAME_WIDTH, 1280);
    g.fillStyle(0x9cf15a, 1).fillEllipse(360, 395, 670, 330);
    g.fillStyle(0x52d54d, 1).fillEllipse(360, 395, 610, 278);
    g.fillStyle(0x39bfe2, 1).fillEllipse(360, 450, 510, 70);
    g.fillStyle(0x1b91ce, 1).fillEllipse(360, 452, 430, 45);
    g.fillStyle(0x9deaff, 0.8).fillEllipse(260, 443, 70, 12).fillEllipse(493, 459, 84, 14);
    g.lineStyle(4, 0xd8fff2, 0.28);
    for (let i = 0; i < 8; i++) {
      const x = 36 + i * 95;
      g.lineBetween(x, 195, x + 70, 340);
      g.lineBetween(x + 48, 650, x - 10, 770);
    }
    for (const [x, y, scale] of [[62, 330, 1], [650, 345, 0.9], [96, 480, 0.65], [625, 470, 0.7]] as const) {
      g.fillStyle(0x8b5b31, 1).fillRoundedRect(x - 10 * scale, y, 20 * scale, 80 * scale, 8);
      g.fillStyle(0x12a978, 1).fillCircle(x, y, 36 * scale);
      g.fillStyle(0x5be36c, 1).fillCircle(x - 14 * scale, y - 11 * scale, 23 * scale);
      g.lineStyle(4, 0x07583f, 0.65).strokeCircle(x, y, 36 * scale);
    }
  }

  private drawHeroStage(heroId: string): void {
    const cx = GAME_WIDTH / 2;
    const glow = this.add.circle(cx, 365, 132, 0xffe260, 0.18);
    this.tweens.add({ targets: glow, scale: 1.12, alpha: 0.28, duration: 1400, yoyo: true, repeat: -1 });
    this.add.ellipse(cx, 468, 210, 40, 0x07533f, 0.4);
    const customSprite = heroId === 'aldric';
    const hero = this.add.image(cx - 38, 376, `hero-${heroId}`).setDisplaySize(200, customSprite ? 200 : 250);
    this.tweens.add({ targets: hero, y: 364, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    const pet = GameState.equippedPet();
    if (pet?.def.petAppearance && this.textures.exists(`pet-${pet.def.id}`)) {
      const companion = this.add.image(cx + 150, 410, `pet-${pet.def.id}`).setDisplaySize(100, 100);
      this.tweens.add({ targets: companion, y: 399, duration: 950, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: 120 });
    }
    this.add.circle(cx - 120, 308, 7, 0xffffff, 0.85);
    this.add.circle(cx + 28, 269, 5, 0xfff075, 1);
    this.add.circle(cx + 179, 333, 6, 0xffffff, 0.9);
  }

  /** Cartes tactiles avec ombre, contour épais et reflet. */
  private menuButton(x: number, y: number, label: string, fontSize: number, onClick: () => void, background = COLORS.gold, width = 310, height = 88): void {
    this.add.rectangle(x, y + 8, width + 4, height + 4, 0x072842).setStrokeStyle(5, 0x071e35);
    const face = this.add.rectangle(x, y, width, height, Phaser.Display.Color.HexStringToColor(background).color).setStrokeStyle(5, 0x082a48);
    this.add.rectangle(x, y - height / 2 + 7, width - 18, 7, 0xffffff, 0.34);
    this.add.text(x, y, label, {
      fontSize: `${fontSize}px`, color: '#ffffff', fontStyle: 'bold', stroke: '#17223d', strokeThickness: 6,
    }).setOrigin(0.5);
    face.setInteractive({ useHandCursor: true }).on('pointerup', onClick);
  }
}
