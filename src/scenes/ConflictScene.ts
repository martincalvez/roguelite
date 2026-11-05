import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config';
import { Sync, type ConflictInfo } from '../cloud/syncManager';
import { clearScene } from '../ui/clearScene';

const STROKE = { stroke: '#1a1020', strokeThickness: 5 };

const formatDate = (value: number | string): string =>
  new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

/**
 * « Quelle sauvegarde garder ? » : affiché quand cet appareil et le cloud ont tous deux progressé.
 * Jamais d'écrasement silencieux : le joueur compare et choisit (ou décide plus tard).
 */
export class ConflictScene extends Phaser.Scene {
  private busy = false;
  private message = '';

  constructor() {
    super(SCENES.conflict);
  }

  create(): void {
    this.busy = false;
    this.message = '';
    if (!Sync.conflict) {
      this.scene.start(SCENES.menu);
      return;
    }
    this.render(Sync.conflict);
  }

  private render(info: ConflictInfo): void {
    clearScene(this);
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    this.add.text(cx, 90, 'Quelle sauvegarde garder ?', { fontSize: '40px', color: COLORS.gold, fontStyle: 'bold', align: 'center', wordWrap: { width: 640 }, ...STROKE, strokeThickness: 8 }).setOrigin(0.5);
    this.add
      .text(cx, 190, "Cet appareil et le cloud ont tous deux progressé. Celle que tu ne gardes pas sera remplacée.", { fontSize: '22px', color: COLORS.textMuted, align: 'center', wordWrap: { width: 620 } })
      .setOrigin(0.5, 0);

    this.card(300, 'CET APPAREIL', info.local, formatDate(info.local.date), 'Garder cet appareil', 'Remplace le cloud', () => void this.choose('local'));
    this.card(650, 'CLOUD', info.remote, formatDate(info.remote.date), 'Récupérer le cloud', 'Remplace cet appareil', () => void this.choose('cloud'));

    this.add
      .text(cx, 1095, '  Décider plus tard  ', { fontSize: '30px', color: '#14111a', backgroundColor: '#d6f0dc', padding: { x: 22, y: 24 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        if (!this.busy) this.scene.start(SCENES.menu);
      });

    if (this.message) {
      this.add.text(cx, 1175, this.message, { fontSize: '22px', color: '#ff9a9a', fontStyle: 'bold', align: 'center', wordWrap: { width: 620 } }).setOrigin(0.5, 0);
    }
  }

  private card(y: number, title: string, s: ConflictInfo['local'] | ConflictInfo['remote'], date: string, label: string, sub: string, onPick: () => void): void {
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, y + 150, 640, 330, 0x000000, 0.4).setStrokeStyle(6, 0xffc83d);
    this.add.text(cx, y + 20, title, { fontSize: '30px', color: '#ffffff', fontStyle: 'bold', ...STROKE }).setOrigin(0.5, 0);
    const lines = [
      `Niveau de compte ${s.accountLevel}  ·  Chapitre ${s.bestChapter}`,
      `${s.gold} or  ·  ${s.gems} gemmes  ·  ${s.items} objets`,
      `Modifiée le ${date}`,
    ];
    this.add.text(cx, y + 68, lines.join('\n'), { fontSize: '24px', color: COLORS.text, align: 'center', lineSpacing: 8 }).setOrigin(0.5, 0);
    this.add
      .text(cx, y + 255, `${label}\n${sub}`, { fontSize: '26px', color: '#14111a', backgroundColor: COLORS.gold, align: 'center', padding: { x: 22, y: 16 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        if (!this.busy) onPick();
      });
  }

  private async choose(choice: 'local' | 'cloud'): Promise<void> {
    this.busy = true;
    const status = await Sync.resolveConflict(choice);
    this.busy = false;
    if (status === 'synced') {
      this.scene.start(SCENES.menu);
      return;
    }
    this.message = 'Synchro indisponible pour le moment. Réessaie plus tard ; rien n\'a été modifié.';
    if (Sync.conflict) this.render(Sync.conflict);
  }
}
