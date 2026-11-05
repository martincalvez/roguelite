import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, HUD_HEIGHT } from '../config';
import type { EnemyDef } from '../types';

const BAR_X = 220;
const BAR_WIDTH = GAME_WIDTH - BAR_X - 24;
const BAR_HEIGHT = 36;
const XP_BAR_HEIGHT = 22;
const BOSS_BAR_WIDTH = 560;
const BOSS_BAR_HEIGHT = 28;
const BOSS_BAR_Y = HUD_HEIGHT + 56;

/**
 * Bandeau du haut : barre de PV avec valeur, barre d'XP avec niveau.
 * S'abonne à 'player-hp-changed', 'xp-changed', 'room-changed' et aux événements de boss ('boss-spawned', 'boss-hp').
 */
export class Hud {
  private readonly hpFill: Phaser.GameObjects.Rectangle;
  private readonly hpLabel: Phaser.GameObjects.Text;
  private readonly xpFill: Phaser.GameObjects.Rectangle;
  private readonly xpLabel: Phaser.GameObjects.Text;
  private readonly roomLabel: Phaser.GameObjects.Text;
  private readonly bossParts: Phaser.GameObjects.Components.Visible[];
  private readonly bossFill: Phaser.GameObjects.Rectangle;
  private readonly bossName: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, hp: number, maxHp: number, level: number, xp: number, xpNeeded: number, room: number, roomCount: number) {
    const hpY = HUD_HEIGHT / 2 - 16;
    const xpY = HUD_HEIGHT / 2 + 26;
    const textStyle = { color: '#ffffff', fontStyle: 'bold', stroke: '#1a1020', strokeThickness: 5 };

    scene.add.rectangle(BAR_X, hpY, BAR_WIDTH, BAR_HEIGHT, 0x000000, 0.45).setOrigin(0, 0.5);
    this.hpFill = scene.add.rectangle(BAR_X, hpY, BAR_WIDTH, BAR_HEIGHT, COLORS.hp).setOrigin(0, 0.5);
    this.hpLabel = scene.add.text(BAR_X + BAR_WIDTH / 2, hpY, '', { ...textStyle, fontSize: '26px' }).setOrigin(0.5);

    scene.add.rectangle(BAR_X, xpY, BAR_WIDTH, XP_BAR_HEIGHT, 0x000000, 0.45).setOrigin(0, 0.5);
    this.xpFill = scene.add.rectangle(BAR_X, xpY, BAR_WIDTH, XP_BAR_HEIGHT, COLORS.xp).setOrigin(0, 0.5);
    this.xpLabel = scene.add.text(BAR_X + BAR_WIDTH / 2, xpY, '', { ...textStyle, fontSize: '18px', strokeThickness: 4 }).setOrigin(0.5);

    this.roomLabel = scene.add.text(24, 14, '', { ...textStyle, fontSize: '22px', strokeThickness: 4 });
    // Barre de vie du boss, sous le bandeau : cachée tant qu'aucun boss n'est là.
    const bossX = (GAME_WIDTH - BOSS_BAR_WIDTH) / 2;
    const bossBg = scene.add.rectangle(bossX, BOSS_BAR_Y, BOSS_BAR_WIDTH, BOSS_BAR_HEIGHT, 0x000000, 0.6).setOrigin(0, 0.5).setStrokeStyle(4, 0x1a1020);
    this.bossFill = scene.add.rectangle(bossX, BOSS_BAR_Y, BOSS_BAR_WIDTH, BOSS_BAR_HEIGHT, 0xb35cff).setOrigin(0, 0.5);
    this.bossName = scene.add.text(GAME_WIDTH / 2, BOSS_BAR_Y - 30, '', { ...textStyle, fontSize: '28px' }).setOrigin(0.5);
    this.bossParts = [bossBg, this.bossFill, this.bossName];
    for (const part of [bossBg, this.bossFill, this.bossName]) part.setDepth(900);
    this.showBoss(false);

    this.setHp(hp, maxHp);
    this.setXp(level, xp, xpNeeded);
    this.setRoom(room, roomCount);

    scene.events.on('player-hp-changed', this.setHp, this);
    scene.events.on('xp-changed', this.setXp, this);
    scene.events.on('room-changed', this.setRoom, this);
    scene.events.on('boss-spawned', this.onBossSpawned, this);
    scene.events.on('boss-hp', this.setBossHp, this);
    scene.events.on('enemy-died', this.onEnemyDied, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off('player-hp-changed', this.setHp, this);
      scene.events.off('xp-changed', this.setXp, this);
      scene.events.off('room-changed', this.setRoom, this);
      scene.events.off('boss-spawned', this.onBossSpawned, this);
      scene.events.off('boss-hp', this.setBossHp, this);
      scene.events.off('enemy-died', this.onEnemyDied, this);
    });
  }

  private setHp(hp: number, maxHp: number): void {
    this.hpFill.width = BAR_WIDTH * Phaser.Math.Clamp(hp / maxHp, 0, 1);
    this.hpLabel.setText(`${Math.ceil(hp)} / ${Math.round(maxHp)}`);
  }

  private showBoss(visible: boolean): void {
    for (const part of this.bossParts) part.setVisible(visible);
  }

  private onBossSpawned(name: string, hp: number, maxHp: number): void {
    this.bossName.setText(name);
    this.setBossHp(hp, maxHp);
    this.showBoss(true);
  }

  private setBossHp(hp: number, maxHp: number): void {
    this.bossFill.width = BOSS_BAR_WIDTH * Phaser.Math.Clamp(hp / maxHp, 0, 1);
  }

  private onEnemyDied(def: EnemyDef): void {
    if (def.boss) this.showBoss(false);
  }

  private setRoom(room: number, roomCount: number): void {
    this.roomLabel.setText(`Salle ${room}/${roomCount}`);
  }

  private setXp(level: number, xp: number, xpNeeded: number): void {
    this.xpFill.width = BAR_WIDTH * Phaser.Math.Clamp(xp / xpNeeded, 0, 1);
    this.xpLabel.setText(`Niv. ${level}`);
  }
}
