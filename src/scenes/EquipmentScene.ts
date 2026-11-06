import Phaser from 'phaser';
import { FUSION_COUNT, COLORS, GAME_HEIGHT, GAME_WIDTH, RARITY_COLOR, RARITY_LABEL, RARITY_ORDER, SCENES, SCROLL_TYPES, SLOT_TYPE_LABEL } from '../config';
import { getItem, getPassive } from '../data';
import { GameState } from '../state/GameState';
import { describeModifier, EQUIP_SLOTS, formatStat, STAT_LABEL, statDiff, targetSlot } from '../systems/equipment';
import { itemModifiers } from '../systems/stats';
import { nextRarity, pickFusionInputs } from '../systems/fusion';
import { canUpgrade, maxLevel, upgradeCost } from '../systems/upgrade';
import type { EquipSlot, ItemInstance } from '../types';
import { clearScene } from '../ui/clearScene';

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
const INK = 0x140d25;
const LIGHT_BLUE = 0x35bfff;

// Mise en page (720 × 1280, rien d'important dans les 60 px du bas)
const SLOT_SIZE = 102;
const SLOT_GAP = 12;
const SLOT_Y = 316;
const VIEW_TOP = 438;
const VIEW_BOTTOM = 1190;
const COLS = 4;
const CARD_W = 160;
const CARD_H = 166;
const CARD_GAP = 14;
const DRAG_THRESHOLD = 12;

const rarityColor = (r: ItemInstance['rarity']): number => Phaser.Display.Color.HexStringToColor(RARITY_COLOR[r]).color;
const CARD_TINT: Record<ItemInstance['rarity'], number> = {
  common: 0x647896,
  rare: 0x187bc8,
  epic: 0x7a32be,
  legendary: 0xbb7a10,
  mythic: 0xbc3157,
};

/** Écran équipement : 6 slots, inventaire défilant, détail d'un objet avec différence de stats. */
export class EquipmentScene extends Phaser.Scene {
  private scrollY = 0;
  private maxScroll = 0;
  private content!: Phaser.GameObjects.Container;
  private maskShape?: Phaser.GameObjects.Graphics;
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
    this.maskShape?.destroy(); // le masque n'est pas dans la liste d'affichage : on le détruit à part
    clearScene(this);
    this.detail = [];
    const d = GameState.data;
    const cx = GAME_WIDTH / 2;

    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x074f89);
    const motif = this.add.graphics();
    motif.lineStyle(4, 0x51d5ff, 0.12);
    for (let y = 210; y < GAME_HEIGHT; y += 140) {
      motif.lineBetween(0, y, GAME_WIDTH, y + 170);
      motif.lineBetween(GAME_WIDTH, y, 0, y + 170);
    }
    this.add.rectangle(cx, 194, GAME_WIDTH, 390, 0x0e82bd, 0.2);
    this.add.rectangle(cx, 58, 694, 86, 0x051d43).setStrokeStyle(6, 0x020d24);
    this.add.rectangle(cx, 54, 682, 72, 0x168dcc).setStrokeStyle(4, 0x68ddff);
    this.add.text(cx, 56, 'ÉQUIPEMENT', { fontSize: '40px', color: '#ffe45a', fontStyle: 'bold', ...STROKE, strokeThickness: 8 }).setOrigin(0.5);
    this.add
      .text(22, 56, '‹', { fontSize: '48px', color: '#ffffff', padding: { x: 22, y: 18 }, ...STROKE, strokeThickness: 6 })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start(SCENES.menu));
    this.add.rectangle(250, 116, 292, 52, 0x09294e, 0.94).setStrokeStyle(3, 0x219ddd);
    this.add.rectangle(548, 116, 126, 52, 0x09294e, 0.94).setStrokeStyle(3, 0x52df88);
    this.add.text(250, 116, `✦ ${d.gold}`, { fontSize: '25px', color: '#ffda52', fontStyle: 'bold', ...STROKE, strokeThickness: 4 }).setOrigin(0.5);
    this.add.text(548, 116, `◆ ${d.gems}`, { fontSize: '25px', color: '#70ff9b', fontStyle: 'bold', ...STROKE, strokeThickness: 4 }).setOrigin(0.5);
    this.buildStats();
    this.buildScrolls();
    this.buildSlots();
    this.buildInventory();
    this.setScroll(keepScroll);
  }

  private buildStats(): void {
    const s = GameState.heroStats();
    const stat = (x: number, icon: string, label: string, value: number, color: number): void => {
      this.add.rectangle(x, 177, 202, 54, 0x072f5d, 0.94).setStrokeStyle(3, color);
      this.add.text(x - 75, 177, icon, { fontSize: '27px', color: '#ffffff', ...STROKE, strokeThickness: 4 }).setOrigin(0.5);
      this.add.text(x - 36, 177, label, { fontSize: '17px', color: '#bcecff', fontStyle: 'bold' }).setOrigin(0, 0.5);
      this.add.text(x + 88, 177, String(value), { fontSize: '23px', color: '#ffffff', fontStyle: 'bold', ...STROKE, strokeThickness: 4 }).setOrigin(1, 0.5);
    };
    stat(126, '♥', 'PV', Math.round(s.maxHp), 0xf66e77);
    stat(360, '⚔', 'ATQ', Math.round(s.attack), 0xffc53d);
    stat(594, '➤', 'VIT', Math.round(s.moveSpeed), 0x60dbff);
  }

  /** Rangée des parchemins possédés, par type d'objet. */
  private buildScrolls(): void {
    const scrolls = GameState.data.scrolls;
    this.add.rectangle(GAME_WIDTH / 2, 228, 650, 34, 0x05315f, 0.82).setStrokeStyle(2, 0x168ccc);
    const text = SCROLL_TYPES.map((t) => `${SLOT_TYPE_LABEL[t]} ${scrolls[t]}`).join('  ·  ');
    this.add.text(GAME_WIDTH / 2, 228, text, { fontSize: '17px', color: '#e8f8ff', fontStyle: 'bold', ...STROKE, strokeThickness: 3 }).setOrigin(0.5);
  }

  private buildSlots(): void {
    const total = EQUIP_SLOTS.length * SLOT_SIZE + (EQUIP_SLOTS.length - 1) * SLOT_GAP;
    const startX = (GAME_WIDTH - total) / 2 + SLOT_SIZE / 2;
    this.add.text(GAME_WIDTH / 2, 268, 'ÉQUIPÉ', { fontSize: '22px', color: '#ffffff', fontStyle: 'bold', ...STROKE, strokeThickness: 4 }).setOrigin(0.5);
    EQUIP_SLOTS.forEach((slot, i) => {
      const x = startX + i * (SLOT_SIZE + SLOT_GAP);
      const uid = GameState.data.equipped[slot];
      const item = uid ? GameState.data.inventory.find((it) => it.uid === uid) : undefined;
      const color = item ? rarityColor(item.rarity) : 0x555555;
      this.add.rectangle(x + 2, SLOT_Y + 5, SLOT_SIZE, SLOT_SIZE, 0x03132f, 0.84).setStrokeStyle(6, 0x020d20);
      const face = this.add.rectangle(x, SLOT_Y, SLOT_SIZE, SLOT_SIZE, item ? CARD_TINT[item.rarity] : 0x18365a, 0.98).setStrokeStyle(5, color);
      this.add.rectangle(x, SLOT_Y - SLOT_SIZE / 2 + 10, SLOT_SIZE - 12, 8, color, item ? 1 : 0.4);
      this.add.text(x, SLOT_Y - SLOT_SIZE / 2 + 22, SLOT_LABEL[slot], { fontSize: '13px', color: item ? '#ffffff' : '#a6c8de', fontStyle: 'bold', ...STROKE, strokeThickness: 3 }).setOrigin(0.5);
      if (item) {
        const def = getItem(item.defId);
        this.drawItemIcon(x, SLOT_Y - 3, item.defId, def.slot, rarityColor(item.rarity)).setScale(0.55);
        this.add.text(x, SLOT_Y + 36, `NIV. ${item.level}`, { fontSize: '15px', color: '#fff4d2', fontStyle: 'bold', ...STROKE, strokeThickness: 3 }).setOrigin(0.5);
        face.setInteractive({ useHandCursor: true }).on('pointerup', () => this.openDetail(item));
      } else {
        this.add.text(x, SLOT_Y + 4, '+', { fontSize: '40px', color: '#79a4c3', fontStyle: 'bold', ...STROKE, strokeThickness: 4 }).setOrigin(0.5);
      }
    });
  }

  private buildInventory(): void {
    const items = [...GameState.data.inventory].sort(
      (a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || getItem(a.defId).name.localeCompare(getItem(b.defId).name),
    );
    this.add.rectangle(GAME_WIDTH / 2, 390, 690, 58, 0x052b59).setStrokeStyle(4, LIGHT_BLUE);
    this.add.text(GAME_WIDTH / 2, 390, `COLLECTION  ·  ${items.length}`, { fontSize: '28px', color: '#fff4d2', fontStyle: 'bold', ...STROKE, strokeThickness: 5 }).setOrigin(0.5);

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
      const card = this.add.rectangle(x + 3, y + 8, CARD_W + 4, CARD_H + 4, 0x031329, 0.9).setStrokeStyle(7, INK);
      const face = this.add.rectangle(x, y, CARD_W, CARD_H, CARD_TINT[item.rarity], 1).setStrokeStyle(6, rarityColor(item.rarity));
      const inner = this.add.rectangle(x, y + 1, CARD_W - 14, CARD_H - 14, 0x0a1e44, 0.2).setStrokeStyle(2, 0xffffff, 0.34);
      const glint = this.add.graphics().fillStyle(0xffffff, 0.2).fillTriangle(x - CARD_W / 2 + 8, y - CARD_H / 2 + 8, x + CARD_W / 2 - 8, y - CARD_H / 2 + 8, x - CARD_W / 2 + 8, y - 2);
      const rarityBanner = this.add.rectangle(x, y - CARD_H / 2 + 16, 102, 26, rarityColor(item.rarity)).setStrokeStyle(2, INK);
      const rarityName = this.add.text(x, rarityBanner.y, RARITY_LABEL[item.rarity].toUpperCase(), { fontSize: '14px', color: '#fff9e9', fontStyle: 'bold', ...STROKE, strokeThickness: 3 }).setOrigin(0.5);
      const icon = this.drawItemIcon(x, y - 13, item.defId, def.slot, rarityColor(item.rarity)).setScale(0.88);
      const name = this.add
        .text(x, y + 48, def.name, { fontSize: '19px', color: '#ffffff', fontStyle: 'bold', align: 'center', wordWrap: { width: CARD_W - 14 }, ...STROKE, strokeThickness: 4 })
        .setOrigin(0.5);
      const levelPill = this.add.rectangle(x, y + CARD_H / 2 - 17, 104, 28, 0x071632, 0.82).setStrokeStyle(2, 0xffffff, 0.45);
      const meta = this.add.text(x, levelPill.y, `NIV. ${item.level}`, { fontSize: '16px', color: '#fff4d2', fontStyle: 'bold', ...STROKE, strokeThickness: 3 }).setOrigin(0.5);
      const slotBadge = this.add.circle(x - CARD_W / 2 + 17, y - CARD_H / 2 + 17, 14, 0x072145).setStrokeStyle(2, 0xffffff);
      const slotMark = this.add.text(slotBadge.x, slotBadge.y, def.slot === 'weapon' ? '⚔' : def.slot === 'armor' ? '✚' : def.slot === 'pet' ? '✦' : def.slot === 'amulet' ? '⌁' : '◆', { fontSize: '15px', color: '#fff4d2', fontStyle: 'bold', ...STROKE, strokeThickness: 2 }).setOrigin(0.5);
      this.content.add([card, face, inner, glint, rarityBanner, rarityName, icon, name, levelPill, meta, slotBadge, slotMark]);
      if (equippedUids.has(item.uid)) {
        const equipped = this.add.text(x + CARD_W / 2 - 6, y - CARD_H / 2 + 4, '✓', { fontSize: '22px', color: GREEN, fontStyle: 'bold', ...STROKE, strokeThickness: 3 }).setOrigin(1, 0);
        this.content.add(equipped);
      }
      face.setInteractive({ useHandCursor: true }).on('pointerup', (p: Phaser.Input.Pointer) => {
        // Un glissement n'ouvre rien ; une carte défilée sous les slots non plus.
        if (this.moved || p.y < VIEW_TOP || p.y > VIEW_BOTTOM || this.detail.length > 0) return;
        this.openDetail(item);
      });
    });

    const rows = Math.ceil(items.length / COLS);
    const contentHeight = rows * (CARD_H + CARD_GAP);
    this.maxScroll = Math.max(0, contentHeight - (VIEW_BOTTOM - VIEW_TOP));
    this.maskShape = this.make.graphics({}, false).fillRect(0, VIEW_TOP, GAME_WIDTH, VIEW_BOTTOM - VIEW_TOP);
    this.content.setMask(this.maskShape.createGeometryMask());
  }

  /** Illustrations originales : des silhouettes d'objets reconnaissables même sur un petit écran. */
  private drawItemIcon(x: number, y: number, id: string, slot: string, color: number): Phaser.GameObjects.Graphics | Phaser.GameObjects.Image {
    if (slot === 'pet' && this.textures.exists(`pet-${id}`)) return this.add.image(x, y, `pet-${id}`).setDisplaySize(66, 66);
    const g = this.add.graphics().setPosition(x, y);
    const ink = INK;
    if (id.includes('arc')) {
      g.lineStyle(15, ink, 1).beginPath().arc(-4, 0, 35, -1.14, 1.14, false).strokePath();
      g.lineStyle(9, color, 1).beginPath().arc(-4, 0, 35, -1.14, 1.14, false).strokePath();
      g.lineStyle(4, 0xfff0be, 1).lineBetween(10, -32, 10, 32);
      g.lineStyle(5, ink, 1).lineBetween(-27, 0, 28, 0);
      g.lineStyle(3, 0xfff0be, 1).lineBetween(-25, 0, 24, 0);
      g.fillStyle(0xffe15a, 1).fillTriangle(30, 0, 18, -8, 18, 8).lineStyle(3, ink, 1).strokeTriangle(30, 0, 18, -8, 18, 8);
    } else if (id.includes('baton')) {
      g.lineStyle(18, ink, 1).lineBetween(-20, 31, 16, -27);
      g.lineStyle(12, 0x8e4c24, 1).lineBetween(-20, 31, 16, -27);
      g.lineStyle(5, 0xf4bd55, 1).lineBetween(-17, 25, 10, -18);
      g.fillStyle(color, 1).fillCircle(20, -31, 19).lineStyle(6, ink, 1).strokeCircle(20, -31, 19);
      g.fillStyle(0xffffff, 0.85).fillCircle(14, -38, 6);
      g.fillStyle(0xffd85a, 1).fillTriangle(8, -19, 21, -50, 33, -19).lineStyle(4, ink, 1).strokeTriangle(8, -19, 21, -50, 33, -19);
    } else if (id.includes('lames')) {
      g.fillStyle(ink, 1).fillTriangle(-30, 25, 25, -35, 9, 15).fillTriangle(30, 25, -25, -35, -9, 15);
      g.fillStyle(color, 1).fillTriangle(-24, 24, 20, -29, 7, 13).fillTriangle(24, 24, -20, -29, -7, 13);
      g.lineStyle(8, 0xffd85b, 1).lineBetween(-15, -4, 18, 28).lineBetween(15, -4, -18, 28);
      g.lineStyle(3, 0xffffff, 0.8).lineBetween(-16, 14, 10, -18).lineBetween(16, 14, -10, -18);
    } else if (slot === 'armor') {
      g.fillStyle(ink, 1).fillRoundedRect(-34, -27, 68, 58, 14);
      g.fillStyle(color, 1).fillRoundedRect(-28, -24, 56, 53, 11);
      g.fillStyle(0x17365f, 0.75).fillRoundedRect(-16, -25, 32, 17, 6);
      g.fillStyle(0xffd65a, 1).fillTriangle(0, -5, 17, 5, 0, 25).fillTriangle(0, -5, -17, 5, 0, 25);
      g.lineStyle(5, 0xffefa9, 0.9).lineBetween(-22, -13, 22, -13);
      g.lineStyle(4, ink, 1).lineBetween(0, -7, 0, 27);
    } else if (slot === 'ring') {
      g.lineStyle(19, ink, 1).strokeEllipse(0, 6, 56, 40);
      g.lineStyle(12, 0xffc735, 1).strokeEllipse(0, 6, 56, 40);
      g.fillStyle(ink, 1).fillTriangle(0, -36, 18, -13, 0, -1).fillTriangle(0, -36, -18, -13, 0, -1);
      g.fillStyle(color, 1).fillTriangle(0, -31, 12, -15, 0, -6).fillTriangle(0, -31, -12, -15, 0, -6);
      g.fillStyle(0xffffff, 0.85).fillTriangle(-4, -27, 2, -25, -4, -19);
    } else if (slot === 'amulet') {
      g.lineStyle(7, ink, 1).beginPath().arc(0, -5, 28, 0.18, Math.PI - 0.18, false).strokePath();
      g.lineStyle(3, 0xffdf72, 1).beginPath().arc(0, -5, 28, 0.18, Math.PI - 0.18, false).strokePath();
      g.fillStyle(ink, 1).fillTriangle(0, -3, 22, 22, 0, 40).fillTriangle(0, -3, -22, 22, 0, 40);
      g.fillStyle(color, 1).fillTriangle(0, 3, 16, 22, 0, 34).fillTriangle(0, 3, -16, 22, 0, 34);
      g.fillStyle(0xfff4b5, 0.85).fillTriangle(-3, 10, 7, 20, -3, 25);
    } else {
      g.fillStyle(ink, 1).fillCircle(0, 0, 34);
      g.fillStyle(color, 1).fillCircle(0, 0, 27);
      g.fillStyle(0xffffff, 0.8).fillCircle(-10, -12, 7);
    }
    return g;
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
    add(this.add.rectangle(cx, 640, 650, 1010, 0xeac49d).setStrokeStyle(9, rarityColor(item.rarity)).setDepth(101));
    add(this.add.rectangle(cx, 174, 650, 78, 0xffc42b).setStrokeStyle(6, 0x9b4b13).setDepth(101));

    let y = 170;
    const line = (text: string, color: string, size: number, bold = false): void => {
      const t = add(
        this.add
          .text(cx, y, text, { fontSize: `${size}px`, color: color === COLORS.text ? '#fffaf0' : color === COLORS.textMuted ? '#714923' : color === GREEN ? '#087b35' : color === RED ? '#a51e39' : color, fontStyle: bold ? 'bold' : 'normal', align: 'center', wordWrap: { width: 580 }, ...(bold ? STROKE : {}) })
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
    button(cx - 150, equippedSlot ? ' Retirer ' : ' Équiper ', equippedSlot ? '#ff5864' : '#22aaff', () => {
      if (equippedSlot) GameState.unequip(equippedSlot);
      else GameState.equipItem(item.uid, slot);
      this.build();
    });
    button(cx + 170, ' Fermer ', '#ffc629', () => this.closeDetail());
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
