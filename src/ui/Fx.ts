import Phaser from 'phaser';
import { POOLS } from '../config';
import { COMBAT, ENEMIES } from '../data';
import type { EnemyDef } from '../types';

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

    scene.events.on('enemy-hit', this.onEnemyHit, this);
    scene.events.on('enemy-died', this.onEnemyDied, this);
    scene.events.on('player-dodged', this.onPlayerDodged, this);
    scene.events.on('player-hp-changed', this.onPlayerHurt, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off('enemy-hit', this.onEnemyHit, this);
      scene.events.off('enemy-died', this.onEnemyDied, this);
      scene.events.off('player-dodged', this.onPlayerDodged, this);
      scene.events.off('player-hp-changed', this.onPlayerHurt, this);
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
  }

  private onEnemyHit(x: number, y: number, amount: number, isCrit: boolean): void {
    this.showText(x, y, String(amount), '#ffe14a', isCrit ? 52 : 32);
  }

  private onEnemyDied(def: EnemyDef, x: number, y: number): void {
    this.emitters.get(def.id)?.explode(COMBAT.deathParticles, x, y);
  }

  private onPlayerDodged(x: number, y: number): void {
    this.showText(x, y - 40, 'Esquive', '#ffffff', 30);
  }

  private onPlayerHurt(): void {
    this.scene.cameras.main.shake(COMBAT.shakeMs, COMBAT.shakeIntensity);
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
}
