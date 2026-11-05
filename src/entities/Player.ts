import Phaser from 'phaser';
import { COMBAT } from '../data';
import { GameState } from '../state/GameState';
import { rollDodge } from '../systems/combat';
import type { Stats } from '../types';
import type { VirtualJoystick } from '../ui/VirtualJoystick';

/**
 * Le héros. Déplacements ZQSD + flèches, diagonale normalisée.
 * La vitesse vient des stats (jamais modifiée directement : voir computeStats).
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys: Record<'Z' | 'Q' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private readonly moveVector = new Phaser.Math.Vector2();
  /** Ligne de la planche d'Aldric : bas, gauche, droite, haut. */
  private aldricFacingRow = 0;
  /** Stats courantes du héros. À remplacer via setStats() quand elles changent (compétences du run). */
  stats: Stats = GameState.heroStats();
  private joystick?: VirtualJoystick;
  hp: number;
  maxHp: number;
  private invulnerableUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, `hero-${GameState.data.selectedHero}`);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    if (GameState.data.selectedHero === 'aldric' && scene.textures.exists('hero-aldric-sheet')) {
      this.setTexture('hero-aldric-sheet', 0);
    }
    // Aldric est plus grand comme dans la référence ; le rayon de collision reste inchangé.
    this.setDisplaySize(GameState.data.selectedHero === 'aldric' ? 170 : 128, GameState.data.selectedHero === 'aldric' ? 170 : 160);
    this.maxHp = this.stats.maxHp;
    this.hp = this.maxHp;
    this.setCollideWorldBounds(true);
    this.setCenteredHitbox(24);

    const keyboard = scene.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys('Z,Q,S,D') as Player['keys'];
  }

  /**
   * Remplace les stats (résultat de computeStats). Si les PV max augmentent, les PV actuels
   * augmentent d'autant (sinon « +PV max » ne servirait à rien sur le moment).
   */
  setStats(stats: Stats): void {
    const gain = Math.max(0, stats.maxHp - this.maxHp);
    this.stats = stats;
    this.maxHp = stats.maxHp;
    this.hp = Math.min(this.hp + gain, this.maxHp);
    this.scene.events.emit('player-hp-changed', this.hp, this.maxHp);
  }

  /** Rend une fraction des PV max. */
  heal(fraction: number): void {
    this.hp = Math.min(this.maxHp, this.hp + this.maxHp * fraction);
    this.scene.events.emit('player-hp-changed', this.hp, this.maxHp);
  }

  setJoystick(joystick: VirtualJoystick): void {
    this.joystick = joystick;
  }

  /** Vecteur d'entrée (longueur 0 à 1) : le joystick prime sur le clavier s'il est actif. */
  getMoveVector(): Phaser.Math.Vector2 {
    if (this.joystick?.active) {
      return this.moveVector.copy(this.joystick.vector);
    }
    const left = this.cursors.left.isDown || this.keys.Q.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.Z.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;

    this.moveVector.set((right ? 1 : 0) - (left ? 1 : 0), (down ? 1 : 0) - (up ? 1 : 0));
    if (this.moveVector.lengthSq() > 1) this.moveVector.normalize();
    return this.moveVector;
  }

  get isMoving(): boolean {
    return this.moveVector.lengthSq() > 0;
  }

  /** Tourne le héros vers un point en tenant compte de l'orientation native de chaque sprite. */
  faceTowards(x: number, y: number): void {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, x, y);
    if (GameState.data.selectedHero === 'aldric' && this.texture.key === 'hero-aldric-sheet') {
      this.aldricFacingRow = this.rowForAngle(angle);
      this.setFrame(this.aldricFacingRow * 4);
      this.setRotation(0);
      return;
    }
    const spriteOffset = GameState.data.selectedHero === 'aldric' ? -Math.PI / 2 : 0;
    this.setRotation(angle + spriteOffset);
  }

  /**
   * Subit un coup, sauf pendant l'invulnérabilité. Une esquive donne la même invulnérabilité
   * (sinon un contact prolongé relancerait l'esquive à chaque frame).
   * Événements : 'player-dodged' (x, y), 'player-hp-changed' (hp, maxHp), 'player-died'.
   */
  takeDamage(amount: number, time: number): void {
    if (this.hp <= 0 || time < this.invulnerableUntil) return;
    this.invulnerableUntil = time + COMBAT.invulnerabilityMs;
    if (rollDodge(this.stats.dodge)) {
      this.scene.events.emit('player-dodged', this.x, this.y);
      return;
    }
    this.hp = Math.max(0, this.hp - amount);
    this.scene.events.emit('player-hp-changed', this.hp, this.maxHp);
    if (this.hp === 0) this.scene.events.emit('player-died');
  }

  /** À appeler à chaque frame depuis la scène. */
  updateMovement(time: number): void {
    // Clignotement pendant l'invulnérabilité.
    this.setAlpha(time < this.invulnerableUntil && Math.floor(time / 80) % 2 === 0 ? 0.3 : 1);
    const v = this.getMoveVector();
    if (GameState.data.selectedHero === 'aldric' && this.texture.key === 'hero-aldric-sheet') {
      if (v.lengthSq() > 0.001) {
        this.aldricFacingRow = Math.abs(v.x) > Math.abs(v.y) ? (v.x < 0 ? 1 : 2) : v.y < 0 ? 3 : 0;
        const frameColumn = Math.floor(time / 150) % 4;
        this.setFrame(this.aldricFacingRow * 4 + frameColumn);
      } else {
        this.setFrame(this.aldricFacingRow * 4);
      }
    }
    this.setVelocity(v.x * this.stats.moveSpeed, v.y * this.stats.moveSpeed);
  }

  private rowForAngle(angle: number): number {
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    if (Math.abs(x) > Math.abs(y)) return x < 0 ? 1 : 2;
    return y < 0 ? 3 : 0;
  }

  /** Le cercle reste centré même quand l'illustration utilise une planche plus grande que le héros. */
  private setCenteredHitbox(worldRadius: number): void {
    const scaleX = Math.max(Math.abs(this.scaleX), 0.001);
    const scaleY = Math.max(Math.abs(this.scaleY), 0.001);
    const radiusX = worldRadius / scaleX;
    const radiusY = worldRadius / scaleY;
    const radius = Math.min(radiusX, radiusY);
    const offsetX = (this.frame.width - radius * 2) / 2;
    const offsetY = (this.frame.height - radius * 2) / 2;
    this.setCircle(radius, offsetX, offsetY);
  }
}
