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
  /** Stats courantes du héros. À remplacer via setStats() quand elles changent (compétences du run). */
  stats: Stats = GameState.heroStats();
  private joystick?: VirtualJoystick;
  hp: number;
  maxHp: number;
  private invulnerableUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.maxHp = this.stats.maxHp;
    this.hp = this.maxHp;
    this.setCollideWorldBounds(true);
    this.setCircle(this.width / 2);

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

  /** Tourne le héros vers un point (le repère visuel de la texture pointe vers la droite). */
  faceTowards(x: number, y: number): void {
    this.setRotation(Phaser.Math.Angle.Between(this.x, this.y, x, y));
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
    this.setVelocity(v.x * this.stats.moveSpeed, v.y * this.stats.moveSpeed);
  }
}
