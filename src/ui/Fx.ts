import Phaser from 'phaser';
import { POOLS } from '../config';
import { COMBAT, ENEMIES } from '../data';
import type { EnemyDef } from '../types';
import { ArcadeFeedback } from './ArcadeFeedback';

const FLOAT_MS = 700; // durée d'un texte flottant
const RISE_PX = 70; // hauteur dont il monte

/**
 * Effets visuels, abonnés aux événements du jeu (aucune référence aux entités) :
 * chiffres de dégâts (jaunes, plus gros en critique), texte « Esquive »,
 * particules à la mort d'un ennemi, tremblement d'écran quand le joueur est touché.
 * Les textes et émetteurs sont réutilisés (pas d'allocation en plein combat).
 */
export class Fx {
  private readonly texts: Phaser.GameObjects.Text[] = [];
  private readonly bornAt: number[] = [];
  private readonly startY: number[] = [];
  private nextReuse = 0;
  private readonly emitters = new Map<string, Phaser.GameObjects.Particles.ParticleEmitter>();
  private readonly lootSprites: Phaser.GameObjects.Image[] = [];
  private readonly lootBornAt: number[] = [];
  private readonly lootStartX: number[] = [];
  private readonly lootStartY: number[] = [];
  private nextLootReuse = 0;
  private readonly feedback = new ArcadeFeedback();

  constructor(private readonly scene: Phaser.Scene) {
    // Un émetteur par type d'ennemi, teinté à sa couleur.
    for (const def of ENEMIES) {
      const color = Phaser.Display.Color.HexStringToColor(def.color).color;
      const emitter = scene.add
        .particles(0, 0, 'particle', {
          speed: { min: 100, max: 300 },
          lifespan: 450,
          scale: { start: 1.3, end: 0 },
          tint: color,
          emitting: false,
        })
        .setDepth(400);
      this.emitters.set(def.id, emitter);
    }

    // Pièces réutilisées : chaque élimination doit être satisfaisante, sans créer d'objets en boucle.
    if (scene.textures.exists('coin-gold')) {
      for (let i = 0; i < 24; i++) {
        this.lootSprites.push(scene.add.image(0, 0, 'coin-gold').setDisplaySize(18, 18).setVisible(false).setDepth(430));
        this.lootBornAt.push(0);
        this.lootStartX.push(0);
        this.lootStartY.push(0);
      }
    }

    scene.events.on('enemy-hit', this.onEnemyHit, this);
    scene.events.on('enemy-died', this.onEnemyDied, this);
    scene.events.on('player-shot', this.onPlayerShot, this);
    scene.events.on('player-dodged', this.onPlayerDodged, this);
    scene.events.on('player-hp-changed', this.onPlayerHurt, this);
    scene.events.on('level-up', this.onLevelUp, this);
    scene.events.on('wheel-spin', this.onWheelSpin, this);
    scene.events.on('wheel-reward', this.onWheelReward, this);
    scene.events.on('enemy-explosion', this.onEnemyExplosion, this);
    scene.events.on('enemy-dash', this.onEnemyDash, this);
    scene.input.once('pointerdown', () => this.feedback.unlock());
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off('enemy-hit', this.onEnemyHit, this);
      scene.events.off('enemy-died', this.onEnemyDied, this);
      scene.events.off('player-shot', this.onPlayerShot, this);
      scene.events.off('player-dodged', this.onPlayerDodged, this);
      scene.events.off('player-hp-changed', this.onPlayerHurt, this);
      scene.events.off('level-up', this.onLevelUp, this);
      scene.events.off('wheel-spin', this.onWheelSpin, this);
      scene.events.off('wheel-reward', this.onWheelReward, this);
      scene.events.off('enemy-explosion', this.onEnemyExplosion, this);
      scene.events.off('enemy-dash', this.onEnemyDash, this);
      this.feedback.dispose();
    });
  }

  /** À appeler à chaque frame : fait monter et s'effacer les textes flottants. */
  update(time: number): void {
    for (let i = 0; i < this.texts.length; i++) {
      const text = this.texts[i];
      if (!text.visible) continue;
      const t = (time - this.bornAt[i]) / FLOAT_MS;
      if (t >= 1) {
        text.setVisible(false);
      } else {
        text.setY(this.startY[i] - RISE_PX * t);
        text.setAlpha(1 - t * t);
      }
    }
    for (let i = 0; i < this.lootSprites.length; i++) {
      const loot = this.lootSprites[i];
      if (!loot.visible) continue;
      const t = (time - this.lootBornAt[i]) / 520;
      if (t >= 1) {
        loot.setVisible(false);
        continue;
      }
      const side = (i % 3) - 1;
      loot.setPosition(this.lootStartX[i] + side * 24 * t, this.lootStartY[i] - 46 * t + 32 * t * t);
      loot.setScale(0.72 + Math.sin(t * Math.PI) * 0.28);
      loot.setAngle(t * 300 + side * 22).setAlpha(1 - t * t);
    }
  }

  private onEnemyHit(x: number, y: number, amount: number, isCrit: boolean): void {
    this.showText(x, y, String(amount), '#ffe14a', isCrit ? 52 : 32);
    this.feedback.hit(isCrit);
  }

  private onPlayerShot(isCrit: boolean): void {
    this.feedback.shot(isCrit);
  }

  private onEnemyDied(def: EnemyDef, x: number, y: number): void {
    this.emitters.get(def.id)?.explode(COMBAT.deathParticles, x, y);
    this.showCoinBurst(x, y, def.boss ? 7 : def.gold >= 12 ? 3 : 2);
    if (def.gold >= 12 || def.boss) this.showText(x, y - def.radius - 18, `+${def.gold}`, '#ffe14a', def.boss ? 34 : 24);
    this.feedback.enemyDown(Boolean(def.boss));
  }

  private onPlayerDodged(x: number, y: number): void {
    this.showText(x, y - 40, 'Esquive', '#ffffff', 30);
  }

  private onPlayerHurt(): void {
    this.scene.cameras.main.shake(COMBAT.shakeMs, COMBAT.shakeIntensity);
    this.feedback.playerHurt();
  }

  private onLevelUp(): void {
    this.feedback.levelUp();
  }

  private onWheelSpin(): void {
    this.feedback.wheelSpin();
  }

  private onWheelReward(): void {
    this.feedback.wheelReward();
  }

  private onEnemyExplosion(x: number, y: number, radius: number): void {
    const burst = this.scene.add.particles(x, y, 'particle', {
      speed: { min: 80, max: 260 },
      lifespan: 360,
      scale: { start: 1.45, end: 0 },
      tint: [0xffe16b, 0xff643f, 0xa64cff],
      quantity: Math.max(10, Math.round(radius / 5)),
      emitting: false,
    });
    burst.explode();
    this.scene.time.delayedCall(420, () => burst.destroy());
    this.scene.cameras.main.shake(80, 0.0018);
  }

  /** Éclat très bref au départ d'une charge, sans nouvel émetteur ni surcharge mobile. */
  private onEnemyDash(def: EnemyDef, x: number, y: number): void {
    this.emitters.get(def.id)?.explode(Math.max(5, Math.round(COMBAT.deathParticles * 0.45)), x, y);
  }

  /** Prend un texte libre du pool (ou en crée un, ou recycle le plus ancien). */
  private showText(x: number, y: number, content: string, color: string, size: number): void {
    let index = -1;
    for (let i = 0; i < this.texts.length; i++) {
      if (!this.texts[i].visible) {
        index = i;
        break;
      }
    }
    if (index === -1) {
      if (this.texts.length < POOLS.floatingTexts) {
        const text = this.scene.add.text(0, 0, '', { fontStyle: 'bold' }).setOrigin(0.5).setDepth(500);
        this.texts.push(text);
        this.bornAt.push(0);
        this.startY.push(0);
        index = this.texts.length - 1;
      } else {
        index = this.nextReuse++ % this.texts.length;
      }
    }
    this.texts[index]
      .setText(content)
      .setColor(color)
      .setFontSize(size)
      .setStroke('#000000', 6)
      .setPosition(x, y)
      .setAlpha(1)
      .setVisible(true);
    this.bornAt[index] = this.scene.time.now;
    this.startY[index] = y;
  }

  private showCoinBurst(x: number, y: number, count: number): void {
    for (let j = 0; j < count && this.lootSprites.length > 0; j++) {
      const i = this.nextLootReuse++ % this.lootSprites.length;
      const loot = this.lootSprites[i];
      this.lootBornAt[i] = this.scene.time.now - j * 36;
      this.lootStartX[i] = x + Phaser.Math.Between(-10, 10);
      this.lootStartY[i] = y + Phaser.Math.Between(-6, 9);
      loot.setPosition(this.lootStartX[i], this.lootStartY[i]).setScale(0.72).setAlpha(1).setVisible(true);
    }
  }
}
