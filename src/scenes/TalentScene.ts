import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config';
import { TALENTS } from '../data';
import { GameState } from '../state/GameState';
import { describeModifier } from '../systems/equipment';
import { accountXpToNext } from '../systems/progression';
import { talentState } from '../systems/talents';
import { clearScene } from '../ui/clearScene';

const STROKE = { stroke: '#1a1020', strokeThickness: 5 };
const GREEN = '#5cff7a';
const CARD_H = 170;
const CARD_GAP = 16;
const FIRST_CARD_Y = 330;

/** Écran des talents : on dépense de l'or pour gagner des stats permanentes ; certains demandent un niveau de compte. */
export class TalentScene extends Phaser.Scene {
  constructor() {
    super(SCENES.talents);
  }

  create(): void {
    this.build();
  }

  /** (Re)construit l'écran : appelé au début et après chaque achat. */
  private build(message?: string): void {
    clearScene(this);
    const d = GameState.data;
    const cx = GAME_WIDTH / 2;

    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    this.add.text(cx, 60, 'TALENTS', { fontSize: '44px', color: COLORS.gold, fontStyle: 'bold', ...STROKE, strokeThickness: 8 }).setOrigin(0.5);
    this.add
      .text(24, 60, '← Retour', { fontSize: '26px', color: COLORS.text, padding: { x: 14, y: 28 } })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start(SCENES.menu));
    this.add.text(GAME_WIDTH - 24, 60, `${d.gold} or`, { fontSize: '26px', color: COLORS.gold, fontStyle: 'bold' }).setOrigin(1, 0.5);

    // Niveau de compte et barre d'XP.
    const barWidth = 480;
    this.add.text(cx, 150, `Niveau de compte ${d.accountLevel}`, { fontSize: '32px', color: COLORS.text, fontStyle: 'bold', ...STROKE }).setOrigin(0.5);
    this.add.rectangle(cx, 205, barWidth, 26, 0x000000, 0.45).setStrokeStyle(3, 0x1a1020);
    const need = accountXpToNext(d.accountLevel);
    this.add.rectangle(cx - barWidth / 2, 205, barWidth * Phaser.Math.Clamp(d.accountXp / need, 0, 1), 26, COLORS.xp).setOrigin(0, 0.5);
    this.add.text(cx, 205, `${d.accountXp} / ${need} XP`, { fontSize: '18px', color: '#ffffff', fontStyle: 'bold', ...STROKE, strokeThickness: 4 }).setOrigin(0.5);
    this.add.text(cx, 262, 'Gagne de l\'XP de compte à chaque run pour débloquer de nouveaux talents.', { fontSize: '18px', color: COLORS.textMuted, align: 'center', wordWrap: { width: 600 } }).setOrigin(0.5);

    TALENTS.forEach((def, i) => this.buildTalent(def, FIRST_CARD_Y + CARD_H / 2 + i * (CARD_H + CARD_GAP)));

    if (message) {
      const t = this.add.text(cx, 1150, message, { fontSize: '32px', color: GREEN, fontStyle: 'bold', ...STROKE }).setOrigin(0.5).setDepth(50);
      this.tweens.add({ targets: t, y: 1090, alpha: 0, duration: 1200, onComplete: () => t.destroy() });
    }
  }

  private buildTalent(def: (typeof TALENTS)[number], y: number): void {
    const d = GameState.data;
    const level = d.talents[def.id] ?? 0;
    const state = talentState(def, level, d.gold, d.accountLevel);
    const cx = GAME_WIDTH / 2;
    const locked = state.kind === 'locked';

    this.add.rectangle(cx, y, 650, CARD_H, 0x000000, locked ? 0.2 : 0.4).setStrokeStyle(6, locked ? 0x555555 : 0xffc83d);
    this.add.text(50, y - 62, def.name, { fontSize: '34px', color: locked ? COLORS.textMuted : '#ffffff', fontStyle: 'bold', ...STROKE }).setOrigin(0, 0);
    this.add.text(50, y - 14, `Niveau ${level} / ${def.maxLevel}`, { fontSize: '24px', color: COLORS.text }).setOrigin(0, 0);
    const perLevel = describeModifier(def.perLevel);
    const total = level > 0 ? `  (total ${describeModifier({ ...def.perLevel, value: def.perLevel.value * level })})` : '';
    this.add.text(50, y + 24, `${perLevel} par niveau${total}`, { fontSize: '20px', color: level > 0 ? GREEN : COLORS.textMuted, wordWrap: { width: 380 } }).setOrigin(0, 0);

    const bx = 540;
    if (state.kind === 'ok' || state.kind === 'poor') {
      const ok = state.kind === 'ok';
      const btn = this.add
        .text(bx, y, `Acheter\n${state.cost} or`, {
          fontSize: '26px',
          color: '#14111a',
          backgroundColor: ok ? COLORS.gold : '#9aa5a0',
          align: 'center',
          padding: { x: 18, y: 22 },
        })
        .setOrigin(0.5);
      if (ok) {
        btn.setInteractive({ useHandCursor: true }).on('pointerup', () => {
          if (GameState.buyTalent(def.id)) this.build(`${def.name} niveau ${level + 1} !`);
        });
      }
    } else if (state.kind === 'max') {
      this.add.text(bx, y, 'Niveau\nmax', { fontSize: '26px', color: COLORS.gold, fontStyle: 'bold', align: 'center' }).setOrigin(0.5);
    } else {
      this.add.text(bx, y, `Niveau de\ncompte ${state.requiredLevel}\nrequis`, { fontSize: '22px', color: '#ff9a9a', fontStyle: 'bold', align: 'center' }).setOrigin(0.5);
    }
  }
}
