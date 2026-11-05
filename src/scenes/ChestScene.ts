import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, RARITY_COLOR, RARITY_LABEL, RARITY_ORDER, SCENES, SLOT_TYPE_LABEL } from '../config';
import { CHESTS, getItem } from '../data';
import { GameState } from '../state/GameState';
import { canAffordChest, chestRarityWeights } from '../systems/chests';
import type { ChestDef, ItemInstance } from '../types';

const STROKE = { stroke: '#1a1020', strokeThickness: 5 };
const PALETTES: Record<string, { body: number; lid: number; band: number }> = {
  coffre_bois: { body: 0xa5642b, lid: 0xc98a3f, band: 0xffc83d },
  coffre_dore: { body: 0xe0a820, lid: 0xffd84a, band: 0x8a4fe0 },
};
const DEFAULT_PALETTE = PALETTES.coffre_bois;

const rarityHex = (r: ItemInstance['rarity']): number => Phaser.Display.Color.HexStringToColor(RARITY_COLOR[r]).color;

interface DrawnChest {
  container: Phaser.GameObjects.Container;
  lid: Phaser.GameObjects.Container;
}

/** Écran des coffres : on en choisit un, on paie, il s'ouvre avec une petite animation et révèle l'objet. */
export class ChestScene extends Phaser.Scene {
  private currency!: Phaser.GameObjects.Text;
  private reveal: Phaser.GameObjects.GameObject[] = [];
  private busy = false;

  constructor() {
    super(SCENES.chests);
  }

  create(): void {
    this.busy = false;
    this.reveal = [];
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    this.add.text(cx, 60, 'COFFRES', { fontSize: '44px', color: COLORS.gold, fontStyle: 'bold', ...STROKE, strokeThickness: 8 }).setOrigin(0.5);
    this.add
      .text(24, 60, '← Retour', { fontSize: '26px', color: COLORS.text, padding: { x: 14, y: 28 } })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start(SCENES.menu));
    this.currency = this.add.text(GAME_WIDTH - 24, 60, '', { fontSize: '22px', color: COLORS.gold, fontStyle: 'bold' }).setOrigin(1, 0.5);
    this.refreshCurrency();

    CHESTS.forEach((chest, i) => this.buildChestCard(chest, 300 + i * 400));
  }

  private refreshCurrency(): void {
    this.currency.setText(`${GameState.data.gold} or · ${GameState.data.gems} gemmes`);
  }

  /** Dessine un coffre fermé (corps, couvercle articulé à gauche, bandes, serrure). */
  private drawChest(x: number, y: number, scale: number, chestId: string): DrawnChest {
    const pal = PALETTES[chestId] ?? DEFAULT_PALETTE;
    const body = this.add.rectangle(0, 25, 170, 100, pal.body).setStrokeStyle(6, 0x1a1020);
    const band = this.add.rectangle(0, 25, 26, 100, pal.band).setStrokeStyle(4, 0x1a1020);
    const lock = this.add.circle(0, 10, 15, 0xfff4d6).setStrokeStyle(4, 0x1a1020);
    // Couvercle = rectangle + bande, articulé sur sa charnière à gauche (il pivote d'un bloc à l'ouverture).
    const lidShape = this.add.rectangle(0, 0, 170, 52, pal.lid).setOrigin(0, 1).setStrokeStyle(6, 0x1a1020);
    const lidBand = this.add.rectangle(85, 0, 26, 52, pal.band).setOrigin(0.5, 1).setStrokeStyle(4, 0x1a1020);
    const lid = this.add.container(-85, -25, [lidShape, lidBand]);
    const container = this.add.container(x, y, [body, band, lock, lid]).setScale(scale);
    return { container, lid };
  }

  private buildChestCard(chest: ChestDef, y: number): void {
    const cx = GAME_WIDTH / 2;
    const affordable = (): boolean => canAffordChest(chest, GameState.data.gold, GameState.data.gems);
    const panel = this.add.rectangle(cx, y, 640, 340, 0x000000, 0.35).setStrokeStyle(6, 0xffc83d).setInteractive({ useHandCursor: true });
    this.drawChest(190, y + 10, 1.05, chest.id);

    this.add.text(430, y - 150, chest.name, { fontSize: '30px', color: '#ffffff', fontStyle: 'bold', align: 'center', wordWrap: { width: 300 }, ...STROKE }).setOrigin(0.5, 0);
    const cost = chest.costGems ? `${chest.costGems} gemmes` : `${chest.costGold} or`;
    this.add.text(430, y - 104, cost, { fontSize: '30px', color: chest.costGems ? '#5cff7a' : COLORS.gold, fontStyle: 'bold' }).setOrigin(0.5, 0);

    // Chances de rareté (en pourcentage), seulement celles qui sont possibles.
    const odds = chestRarityWeights(chest).filter((o) => o.weight > 0);
    const total = odds.reduce((sum, o) => sum + o.weight, 0);
    const text = odds.map((o) => `${RARITY_LABEL[o.rarity]} ${Number(((o.weight / total) * 100).toFixed(1))} %`).join('\n');
    this.add.text(430, y - 58, text, { fontSize: '17px', color: COLORS.textMuted, align: 'center', lineSpacing: 2 }).setOrigin(0.5, 0);

    this.add
      .text(430, y + 118, '  OUVRIR  ', { fontSize: '32px', color: '#14111a', backgroundColor: COLORS.gold, padding: { x: 18, y: 24 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.openChest(chest, affordable()));
    panel.on('pointerup', () => this.openChest(chest, affordable()));
  }

  private openChest(chest: ChestDef, affordable: boolean): void {
    if (this.busy) return;
    if (!affordable) {
      this.toast(chest.costGems ? 'Pas assez de gemmes' : 'Pas assez d\'or');
      return;
    }
    const item = GameState.buyChest(chest.id);
    if (!item) return;
    this.busy = true;
    this.refreshCurrency();
    this.playOpening(chest, item);
  }

  /** Message rouge qui monte et s'efface. */
  private toast(message: string): void {
    const t = this.add
      .text(GAME_WIDTH / 2, 1120, message, { fontSize: '34px', color: '#ff6b7a', fontStyle: 'bold', ...STROKE })
      .setOrigin(0.5)
      .setDepth(300);
    this.tweens.add({ targets: t, y: 1050, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
  }

  private track<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.reveal.push(obj);
    return obj;
  }

  /** Animation : le coffre tremble, flash, le couvercle s'ouvre, des particules jaillissent et l'objet apparaît. */
  private playOpening(chest: ChestDef, item: ItemInstance): void {
    const cx = GAME_WIDTH / 2;
    const color = rarityHex(item.rarity);
    const def = getItem(item.defId);

    const dim = this.track(this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85).setDepth(100).setAlpha(0).setInteractive());
    this.tweens.add({ targets: dim, alpha: 1, duration: 200 });
    const drawn = this.drawChest(cx, 800, 1.9, chest.id);
    drawn.container.setDepth(101);
    this.track(drawn.container);

    // 1. Le coffre tremble.
    this.tweens.add({
      targets: drawn.container,
      angle: { from: -6, to: 6 },
      duration: 75,
      yoyo: true,
      repeat: 6,
      onComplete: () => {
        drawn.container.setAngle(0);
        this.burst(drawn, color, item, def.name);
      },
    });
  }

  private burst(drawn: DrawnChest, color: number, item: ItemInstance, name: string): void {
    const cx = GAME_WIDTH / 2;
    const def = getItem(item.defId);

    // 2. Flash blanc, couvercle qui s'ouvre, particules de la couleur de la rareté.
    const flash = this.track(this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0.9).setDepth(150));
    this.tweens.add({ targets: flash, alpha: 0, duration: 400 });
    this.tweens.add({ targets: drawn.lid, angle: -38, duration: 220, ease: 'Back.Out' });
    const emitter = this.track(
      this.add
        .particles(cx, 760, 'particle', { speed: { min: 200, max: 520 }, lifespan: 800, scale: { start: 1.8, end: 0 }, tint: color, emitting: false })
        .setDepth(140),
    );
    emitter.explode(30);

    // 3. L'objet apparaît au-dessus du coffre.
    const glow = this.track(this.add.circle(cx, 420, 230, color, 0.3).setDepth(120).setScale(0));
    this.tweens.add({ targets: glow, scale: 1, duration: 450, ease: 'Back.Out' });
    this.tweens.add({ targets: glow, alpha: 0.12, duration: 700, yoyo: true, repeat: -1, delay: 500 });

    const card = this.track(this.add.container(cx, 420, []).setDepth(160).setScale(0));
    const rect = this.add.rectangle(0, 0, 460, 300, COLORS.background).setStrokeStyle(10, color);
    const title = this.add.text(0, -90, name, { fontSize: '40px', color: RARITY_COLOR[item.rarity], fontStyle: 'bold', align: 'center', wordWrap: { width: 420 }, ...STROKE }).setOrigin(0.5);
    const meta = this.add.text(0, -25, `${RARITY_LABEL[item.rarity]} · ${SLOT_TYPE_LABEL[def.slot]}`, { fontSize: '28px', color: COLORS.text }).setOrigin(0.5);
    const desc = this.add.text(0, 55, def.description, { fontSize: '22px', color: COLORS.textMuted, align: 'center', wordWrap: { width: 410 } }).setOrigin(0.5);
    card.add([rect, title, meta, desc]);
    this.tweens.add({ targets: card, scale: 1, duration: 450, ease: 'Back.Out', delay: 150 });

    const rarityIndex = RARITY_ORDER.indexOf(item.rarity);
    if (rarityIndex >= 3) this.cameras.main.shake(250, 0.006);

    // 4. Bouton pour continuer (≥ 88 px).
    this.time.delayedCall(700, () => {
      this.track(
        this.add
          .text(cx, 1080, '  CONTINUER  ', { fontSize: '40px', color: '#14111a', backgroundColor: COLORS.gold, padding: { x: 24, y: 22 } })
          .setOrigin(0.5)
          .setDepth(170)
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => this.closeReveal()),
      );
    });
  }

  private closeReveal(): void {
    for (const obj of this.reveal) obj.destroy();
    this.reveal = [];
    this.tweens.killAll();
    this.busy = false;
  }
}
