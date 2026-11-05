import Phaser from 'phaser';
import { FUSION_COUNT, COLORS, GAME_HEIGHT, GAME_WIDTH, RARITY_COLOR, RARITY_LABEL, RARITY_ORDER, SCENES, SCROLL_TYPES, SLOT_TYPE_LABEL } from '../config';
import { getItem, getPassive } from '../data';
import { GameState } from '../state/GameState';
import { describeModifier, EQUIP_SLOTS, formatStat, STAT_LABEL, statDiff, targetSlot } from '../systems/equipment';
import { itemModifiers } from '../systems/stats';
import { nextRarity, pickFusionInputs } from '../systems/fusion';
import { canUpgrade, maxLevel, upgradeCost } from '../systems/upgrade';
import type { EquipSlot, ItemInstance } from '../types';

const SLOT_LABEL: Record<EquipSlot, string> = {
  weapon: 'Arme',
  armor: 'Armure',
  ring1: 'Anneau',
  ring2: 'Anneau',
  amulet: 'Amulette',
  pet: 'Familier',
};

const GREEN = '#5cff7a';
const RED = '#ff6b7a';
const STROKE = { stroke: '#1a1020', strokeThickness: 5 };

// Mise en page (720 × 1280, rien d'important dans les 60 px du bas)
const SLOT_SIZE = 104;
const SLOT_GAP = 12;
const SLOT_Y = 215;
const VIEW_TOP = 310;
const VIEW_BOTTOM = 1200;
const COLS = 4;
const CARD_W = 160;
const CARD_H = 140;
const CARD_GAP = 14;
const DRAG_THRESHOLD = 12;

const rarityColor = (r: ItemInstance['rarity']): number => Phaser.Display.Color.HexStringToColor(RARITY_COLOR[r]).color;

/** Écran équipement : 6 slots, inventaire défilant, détail d'un objet avec différence de stats. */
export class EquipmentScene extends Phaser.Scene {
  private scrollY = 0;
  private maxScroll = 0;
  private content!: Phaser.GameObjects.Container;
  private detail: Phaser.GameObjects.GameObject[] = [];
  private dragging = false;
  private dragStartY = 0;
  private dragStartScroll = 0;
  private moved = false;

  constructor() {
    super(SCENES.equipment);
  }

  create(): void {
    this.scrollY = 0;
    this.detail = [];
    this.dragging = false;
    this.build();

    // Défilement : glisser au doigt ou molette, uniquement dans la zone de l'inventaire.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.detail.length > 0 || p.y < VIEW_TOP || p.y > VIEW_BOTTOM) return;
      this.dragging = true;
      this.moved = false;
      this.dragStartY = p.y;
      this.dragStartScroll = this.scrollY;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.dragging || !p.isDown) return;
      const dy = p.y - this.dragStartY;
      if (Math.abs(dy) > DRAG_THRESHOLD) this.moved = true;
      if (this.moved) this.setScroll(this.dragStartScroll - dy);
    });
    this.input.on('pointerup', () => (this.dragging = false));
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (this.detail.length === 0) this.setScroll(this.scrollY + dy);
    });
  }

  private setScroll(value: number): void {
    this.scrollY = Phaser.Math.Clamp(value, 0, this.maxScroll);
    this.content.y = -this.scrollY;
  }

  /** (Re)construit tout l'écran : appelé au début et après chaque changement d'équipement. */
  private build(): void {
    const keepScroll = this.scrollY;
    this.children.removeAll(true);
    this.detail = [];
    const d = GameState.data;
    const cx = GAME_WIDTH / 2;

    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    this.add.text(330, 60, 'ÉQUIPEMENT', { fontSize: '34px', color: COLORS.gold, fontStyle: 'bold', ...STROKE, strokeThickness: 7 }).setOrigin(0.5);
    this.add
      .text(24, 60, '← Retour', { fontSize: '26px', color: COLORS.text, padding: { x: 14, y: 28 } })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start(SCENES.menu));
    this.add.text(GAME_WIDTH - 24, 60, `${d.gold} or · ${d.gems} gemmes`, { fontSize: '20px', color: COLORS.gold, fontStyle: 'bold' }).setOrigin(1, 0.5);
    this.buildStats();
    this.buildScrolls();
    this.buildSlots();
    this.buildInventory();
    this.setScroll(keepScroll);
  }

  private buildStats(): void {
    const s = GameState.heroStats();
    this.add
      .text(GAME_WIDTH / 2, 118, `PV ${Math.round(s.maxHp)}  ·  ATQ ${Math.round(s.attack)}  ·  Vitesse ${Math.round(s.moveSpeed)}`, {
        fontSize: '26px',
        color: COLORS.text,
      })
      .setOrigin(0.5);
  }

  /** Rangée des parchemins possédés, par type d'objet. */
  private buildScrolls(): void {
    const scrolls = GameState.data.scrolls;
    const text = SCROLL_TYPES.map((t) => `${SLOT_TYPE_LABEL[t]} ${scrolls[t]}`).join('   ');
    this.add.text(GAME_WIDTH / 2, 152, `Parchemins : ${text}`, { fontSize: '16px', color: COLORS.textMuted }).setOrigin(0.5);
  }

  private buildSlots(): void {
    const total = EQUIP_SLOTS.length * SLOT_SIZE + (EQUIP_SLOTS.length - 1) * SLOT_GAP;
    const startX = (GAME_WIDTH - total) / 2 + SLOT_SIZE / 2;
    EQUIP_SLOTS.forEach((slot, i) => {
      const x = startX + i * (SLOT_SIZE + SLOT_GAP);
      const uid = GameState.data.equipped[slot];
      const item = uid ? GameState.data.inventory.find((it) => it.uid === uid) : undefined;
      const color = item ? rarityColor(item.rarity) : 0x555555;
      const box = this.add.rectangle(x, SLOT_Y, SLOT_SIZE, SLOT_SIZE, 0x000000, 0.4).setStrokeStyle(5, color);
      if (item) {
        const def = getItem(item.defId);
        this.add
          .text(x, SLOT_Y - 6, def.name, { fontSize: '17px', color: RARITY_COLOR[item.rarity], fontStyle: 'bold', align: 'center', wordWrap: { width: SLOT_SIZE - 10 } })
          .setOrigin(0.5);
        this.add.text(x, SLOT_Y + 38, `Niv. ${item.level}`, { fontSize: '16px', color: COLORS.textMuted }).setOrigin(0.5);
        box.setInteractive({ useHandCursor: true }).on('pointerup', () => this.openDetail(item));
      } else {
        this.add.text(x, SLOT_Y, SLOT_LABEL[slot], { fontSize: '17px', color: COLORS.textMuted }).setOrigin(0.5);
      }
    });
  }

  private buildInventory(): void {
    const items = [...GameState.data.inventory].sort(
      (a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || getItem(a.defId).name.localeCompare(getItem(b.defId).name),
    );
    this.add.text(GAME_WIDTH / 2, 285, 'INVENTAIRE', { fontSize: '24px', color: COLORS.textMuted, fontStyle: 'bold' }).setOrigin(0.5);

    const total = COLS * CARD_W + (COLS - 1) * CARD_GAP;
    const startX = (GAME_WIDTH - total) / 2 + CARD_W / 2;
    this.content = this.add.container(0, 0);
    const equippedUids = new Set(Object.values(GameState.data.equipped));

    items.forEach((item, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = startX + col * (CARD_W + CARD_GAP);
      const y = VIEW_TOP + CARD_H / 2 + row * (CARD_H + CARD_GAP);
      const def = getItem(item.defId);
      const card = this.add.rectangle(x, y, CARD_W, CARD_H, 0x000000, 0.35).setStrokeStyle(5, rarityColor(item.rarity));
      const name = this.add
        .text(x, y - 22, def.name, { fontSize: '20px', color: RARITY_COLOR[item.rarity], fontStyle: 'bold', align: 'center', wordWrap: { width: CARD_W - 16 } })
        .setOrigin(0.5);
      const meta = this.add.text(x, y + 38, `${SLOT_TYPE_LABEL[def.slot]} · Niv. ${item.level}`, { fontSize: '16px', color: COLORS.textMuted }).setOrigin(0.5);
      this.content.add([card, name, meta]);
      if (equippedUids.has(item.uid)) {
        this.content.add(this.add.text(x + CARD_W / 2 - 8, y - CARD_H / 2 + 6, 'Équipé', { fontSize: '14px', color: GREEN, fontStyle: 'bold' }).setOrigin(1, 0));
      }
      card.setInteractive({ useHandCursor: true }).on('pointerup', (p: Phaser.Input.Pointer) => {
        // Un glissement n'ouvre rien ; une carte défilée sous les slots non plus.
        if (this.moved || p.y < VIEW_TOP || p.y > VIEW_BOTTOM || this.detail.length > 0) return;
        this.openDetail(item);
      });
    });

    const rows = Math.ceil(items.length / COLS);
    const contentHeight = rows * (CARD_H + CARD_GAP);
    this.maxScroll = Math.max(0, contentHeight - (VIEW_BOTTOM - VIEW_TOP));
    const mask = this.make.graphics({}, false).fillRect(0, VIEW_TOP, GAME_WIDTH, VIEW_BOTTOM - VIEW_TOP);
    this.content.setMask(mask.createGeometryMask());
  }

  /** Panneau de détail : stats, passif, différence si équipé (ou retiré), boutons. */
  private openDetail(item: ItemInstance, banner?: string): void {
    if (this.detail.length > 0) return;
    const def = getItem(item.defId);
    const d = GameState.data;
    const equippedSlot = (Object.keys(d.equipped) as EquipSlot[]).find((s) => d.equipped[s] === item.uid);
    const cx = GAME_WIDTH / 2;
    const add = <T extends Phaser.GameObjects.GameObject>(obj: T): T => {
      this.detail.push(obj);
      return obj;
    };

    add(this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.78).setDepth(100).setInteractive());
    add(this.add.rectangle(cx, 640, 650, 1010, COLORS.background).setStrokeStyle(8, rarityColor(item.rarity)).setDepth(101));

    let y = 170;
    const line = (text: string, color: string, size: number, bold = false): void => {
      const t = add(
        this.add
          .text(cx, y, text, { fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal', align: 'center', wordWrap: { width: 580 }, ...(bold ? STROKE : {}) })
          .setOrigin(0.5, 0)
          .setDepth(102),
      );
      y += t.height + 12;
    };

    if (banner) line(banner, COLORS.gold, 30, true);
    line(def.name, RARITY_COLOR[item.rarity], 42, true);
    line(`${RARITY_LABEL[item.rarity]} · ${SLOT_TYPE_LABEL[def.slot]} · Niveau ${item.level}`, COLORS.textMuted, 24);
    line(def.description, COLORS.text, 26);
    y += 8;
    for (const m of itemModifiers(item)) line(describeModifier(m), COLORS.text, 28, true);
    if (item.level < maxLevel(item.rarity)) {
      const next = itemModifiers({ ...item, level: item.level + 1 }).map(describeModifier).join(' · ');
      line(`Niveau ${item.level + 1} : ${next}`, GREEN, 22);
    } else {
      line('Niveau maximum pour cette rareté', COLORS.textMuted, 22);
    }

    // Passifs de rareté : actifs en vert, à débloquer en gris.
    for (const [rarity, passiveId] of Object.entries(def.rarityPassives ?? {})) {
      if (!passiveId) continue;
      const unlocked = RARITY_ORDER.indexOf(item.rarity) >= RARITY_ORDER.indexOf(rarity as ItemInstance['rarity']);
      const p = getPassive(passiveId);
      line(`${RARITY_LABEL[rarity as ItemInstance['rarity']]} : ${p.name} — ${p.description}`, unlocked ? GREEN : COLORS.textMuted, 20);
    }

    // Différence de stats : équiper (ou retirer si déjà équipé).
    y += 14;
    const before = GameState.heroStats();
    let afterEquipped = { ...d.equipped };
    let slot: EquipSlot;
    let heading: string;
    if (equippedSlot) {
      slot = equippedSlot;
      delete afterEquipped[slot];
      heading = 'Si tu le retires :';
    } else {
      slot = targetSlot(def.slot, d.equipped);
      const replaced = d.equipped[slot] ? d.inventory.find((i) => i.uid === d.equipped[slot]) : undefined;
      afterEquipped = { ...d.equipped, [slot]: item.uid };
      heading = replaced ? `Remplace ${getItem(replaced.defId).name} :` : 'Si tu l\'équipes :';
    }
    line(heading, COLORS.textMuted, 24, true);
    const changes = statDiff(before, GameState.heroStatsWith(afterEquipped));
    if (changes.length === 0) line('Aucun changement', COLORS.textMuted, 24);
    for (const c of changes) {
      line(`${STAT_LABEL[c.stat]} : ${formatStat(c.stat, c.before)} → ${formatStat(c.stat, c.after)}`, c.after > c.before ? GREEN : RED, 26, true);
    }

    // Fusion : FUSION_COUNT exemplaires identiques (même objet, même rareté) → rareté supérieure.
    const upper = nextRarity(item.rarity);
    const copies = d.inventory.filter((i) => i.defId === item.defId && i.rarity === item.rarity).length;
    const fusionInputs = pickFusionInputs(d.inventory, item.defId, item.rarity, new Set(Object.values(d.equipped)));
    if (fusionInputs) {
      add(
        this.add
          .text(cx, 845, ` Fusionner (${FUSION_COUNT}) → ${RARITY_LABEL[upper as ItemInstance['rarity']]} `, {
            fontSize: '28px',
            color: '#14111a',
            backgroundColor: '#e08bff',
            padding: { x: 20, y: 28 },
          })
          .setOrigin(0.5)
          .setDepth(102)
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => this.openFuseConfirm(item, fusionInputs)),
      );
    } else if (upper) {
      add(this.add.text(cx, 845, `Fusion : ${copies}/${FUSION_COUNT} exemplaires identiques`, { fontSize: '22px', color: COLORS.textMuted }).setOrigin(0.5).setDepth(102));
    }

    // Amélioration : or + parchemins du type de l'objet.
    const scrollsOwned = d.scrolls[def.slot];
    const check = canUpgrade(item, d.gold, scrollsOwned);
    const cost = upgradeCost(item.level);
    let upgradeLabel: string;
    if (check.ok) upgradeLabel = ` Améliorer · ${cost.gold} or · ${cost.scrolls} parch. `;
    else if (check.reason === 'max') upgradeLabel = ' Niveau max ';
    else if (check.reason === 'gold') upgradeLabel = ` Or insuffisant (${cost.gold}) `;
    else upgradeLabel = ` Parchemins insuffisants (${scrollsOwned}/${cost.scrolls}) `;
    const upgrade = add(
      this.add
        .text(cx, 945, upgradeLabel, {
          fontSize: '28px',
          color: '#14111a',
          backgroundColor: check.ok ? '#8bd17c' : '#9aa5a0',
          padding: { x: 20, y: 28 },
        })
        .setOrigin(0.5)
        .setDepth(102),
    );
    if (check.ok) {
      upgrade.setInteractive({ useHandCursor: true }).on('pointerup', () => {
        GameState.upgradeItem(item.uid);
        this.build();
        this.openDetail(item);
      });
    }

    // Boutons (≥ 88 px de haut).
    const buttonY = 1070;
    const button = (x: number, label: string, bg: string, onClick: () => void): void => {
      add(
        this.add
          .text(x, buttonY, label, { fontSize: '36px', color: '#14111a', backgroundColor: bg, padding: { x: 26, y: 24 } })
          .setOrigin(0.5)
          .setDepth(102)
          .setInteractive({ useHandCursor: true })
          .on('pointerup', onClick),
      );
    };
    button(cx - 150, equippedSlot ? ' Retirer ' : ' Équiper ', equippedSlot ? '#ff9a9a' : COLORS.gold, () => {
      if (equippedSlot) GameState.unequip(equippedSlot);
      else GameState.equipItem(item.uid, slot);
      this.build();
    });
    button(cx + 170, ' Fermer ', '#d6f0dc', () => this.closeDetail());
  }

  private track<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.detail.push(obj);
    return obj;
  }

  /** Confirmation de fusion : montre ce qui est consommé, ce qui est perdu et le passif débloqué. */
  private openFuseConfirm(item: ItemInstance, inputs: ItemInstance[]): void {
    this.closeDetail();
    const def = getItem(item.defId);
    const upper = nextRarity(item.rarity) as ItemInstance['rarity'];
    const lostLevels = inputs.reduce((sum, i) => sum + (i.level - 1), 0);
    const unlockedId = def.rarityPassives?.[upper];
    const cx = GAME_WIDTH / 2;

    this.track(this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.8).setDepth(100).setInteractive());
    this.track(this.add.rectangle(cx, 640, 620, 640, COLORS.background).setStrokeStyle(8, rarityColor(upper)).setDepth(101));

    let y = 400;
    const line = (text: string, color: string, size: number, bold = false): void => {
      const t = this.track(
        this.add
          .text(cx, y, text, { fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal', align: 'center', wordWrap: { width: 540 }, ...(bold ? STROKE : {}) })
          .setOrigin(0.5, 0)
          .setDepth(102),
      );
      y += t.height + 16;
    };
    line('Fusionner ?', COLORS.gold, 40, true);
    line(`${FUSION_COUNT} × ${def.name} (${RARITY_LABEL[item.rarity]})\n→ 1 × ${def.name} (${RARITY_LABEL[upper]}), niveau 1`, COLORS.text, 26);
    if (lostLevels > 0) line(`Niveaux d'amélioration perdus : ${lostLevels}`, RED, 24, true);
    if (unlockedId) line(`Débloque : ${getPassive(unlockedId).name} — ${getPassive(unlockedId).description}`, GREEN, 22);

    const buttonY = 860;
    const button = (x: number, label: string, bg: string, onClick: () => void): void => {
      this.track(
        this.add
          .text(x, buttonY, label, { fontSize: '34px', color: '#14111a', backgroundColor: bg, padding: { x: 22, y: 24 } })
          .setOrigin(0.5)
          .setDepth(102)
          .setInteractive({ useHandCursor: true })
          .on('pointerup', onClick),
      );
    };
    button(cx - 140, ' Confirmer ', '#e08bff', () => {
      const result = GameState.fuseItems(item.defId, item.rarity);
      this.build();
      if (result) this.openDetail(result, 'Fusion réussie !');
    });
    button(cx + 170, ' Annuler ', '#d6f0dc', () => {
      this.closeDetail();
      this.openDetail(item);
    });
  }

  private closeDetail(): void {
    for (const obj of this.detail) obj.destroy();
    this.detail = [];
  }
}
