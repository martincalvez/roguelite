import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, SCENES } from '../config';
import { cloudEnabled } from '../cloud/client';
import { Sync } from '../cloud/syncManager';
import { getHero } from '../data';
import { accountXpToNext } from '../systems/progression';
import { syncLabel } from '../ui/syncLabel';
import { GameState } from '../state/GameState';

/** Menu principal : une liste de gros boutons (JOUER, ÉQUIPEMENT…). */
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

    this.add
      .text(cx, 240, 'ROGUELITE\nFANTASY', {
        fontFamily: '"Arial Black", "Trebuchet MS", sans-serif',
        fontSize: '80px',
        color: COLORS.gold,
        align: 'center',
        stroke: '#1a1020',
        strokeThickness: 12,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 450, `${getHero(d.selectedHero).name} · Niv. ${d.accountLevel} · ${d.gold} or · ${d.gems} gemmes`, {
        fontSize: '28px',
        color: COLORS.text,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 500, `PV ${Math.round(stats.maxHp)} · ATQ ${Math.round(stats.attack)}`, {
        fontSize: '24px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);

    // Niveau de compte : barre d'XP.
    const barWidth = 360;
    this.add.rectangle(cx, 548, barWidth, 22, 0x000000, 0.45).setStrokeStyle(3, 0x1a1020);
    const fill = Phaser.Math.Clamp(d.accountXp / accountXpToNext(d.accountLevel), 0, 1);
    this.add.rectangle(cx - barWidth / 2, 548, barWidth * fill, 22, COLORS.xp).setOrigin(0, 0.5);
    this.add
      .text(cx, 548, `Niveau de compte ${d.accountLevel}`, { fontSize: '16px', color: '#ffffff', fontStyle: 'bold', stroke: '#1a1020', strokeThickness: 4 })
      .setOrigin(0.5);

    // Statut de la synchro cloud, discret, en haut.
    const status = this.add.text(cx, 36, '', { fontSize: '20px', fontStyle: 'bold', stroke: '#1a1020', strokeThickness: 4 }).setOrigin(0.5);
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

    this.menuButton(cx, 610, '  JOUER  ', 52, () => this.scene.start(SCENES.run, { chapterId: 'ch1' }));
    this.menuButton(cx, 710, '   HÉROS   ', 36, () => this.scene.start(SCENES.heroes), '#ff75d3');
    this.menuButton(cx, 800, ' ÉQUIPEMENT ', 36, () => this.scene.start(SCENES.equipment));
    this.menuButton(cx, 890, '   FAMILIERS   ', 36, () => this.scene.start(SCENES.pets), '#76d9ff');
    this.menuButton(cx, 980, '   COFFRES   ', 36, () => this.scene.start(SCENES.chests));
    this.menuButton(cx, 1070, '   TALENTS   ', 36, () => this.scene.start(SCENES.talents));
    // Grisé si le cloud n'est pas configuré (l'écran explique alors pourquoi).
    this.menuButton(cx, 1160, '   COMPTE   ', 36, () => this.scene.start(SCENES.account), cloudEnabled ? COLORS.gold : '#9aa5a0');
  }

  /** Gros bouton doré (hauteur ≥ 88 px, règle mobile d'abord). */
  private menuButton(x: number, y: number, label: string, fontSize: number, onClick: () => void, background: string = COLORS.gold): void {
    this.add
      .text(x, y, label, {
        fontSize: `${fontSize}px`,
        color: '#14111a',
        backgroundColor: background,
        padding: { x: 28, y: 24 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', onClick);
  }
}
