import Phaser from 'phaser';
import { ARENA, COLORS, GAME_HEIGHT, GAME_WIDTH, HUD_HEIGHT, POOLS, SCENES, WALL_THICKNESS } from '../config';
import { getChapter, getEnemy } from '../data';
import { Enemy } from '../entities/Enemy';
import { EnemyProjectile } from '../entities/EnemyProjectile';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { GameState } from '../state/GameState';
import { damageAmount, rollCrit } from '../systems/combat';
import { VirtualJoystick } from '../ui/VirtualJoystick';

interface RunData {
  chapterId: string;
}

/**
 * Scène de combat, construite tâche par tâche (docs/TACHES.md, phase 1).
 * Zone de jeu : bandeau HUD en haut (HUD_HEIGHT), arène entourée de murs en dessous.
 */
export class RunScene extends Phaser.Scene {
  chapterId = 'ch1'; // utilisé dès la tâche 1.3 (ennemis du chapitre)
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private enemyProjectiles!: Phaser.Physics.Arcade.Group;
  private playerProjectiles!: Phaser.Physics.Arcade.Group;
  private nextShotAt = 0;

  constructor() {
    super(SCENES.run);
  }

  init(data: RunData): void {
    this.chapterId = data?.chapterId ?? 'ch1';
  }

  create(): void {
    this.buildArena();
    this.physics.world.setBounds(ARENA.x, ARENA.y, ARENA.width, ARENA.height);

    this.player = new Player(this, GAME_WIDTH / 2, ARENA.y + ARENA.height * 0.75);
    this.player.setJoystick(new VirtualJoystick(this));

    this.enemies = this.physics.add.group({ classType: Enemy, maxSize: POOLS.enemies });
    this.enemyProjectiles = this.physics.add.group({ classType: EnemyProjectile, maxSize: POOLS.enemyProjectiles });
    this.playerProjectiles = this.physics.add.group({ classType: Projectile, maxSize: POOLS.playerProjectiles });
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.playerProjectiles, this.enemies, (a, b) => this.onProjectileHit(a as Projectile, b as Enemy));

    // Les projectiles ennemis disparaissent en touchant un mur.
    this.physics.world.on('worldbounds', (body: Phaser.Physics.Arcade.Body) => {
      if (body.gameObject instanceof EnemyProjectile || body.gameObject instanceof Projectile) body.gameObject.kill();
    });
    this.events.on('enemy-shoot', this.onEnemyShoot, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off('enemy-shoot', this.onEnemyShoot, this));

    this.spawnRoom(0);

    // Bandeau HUD (vide pour l'instant) : seul le retour au menu y figure.
    this.add
      .text(24, HUD_HEIGHT / 2, '← Menu', {
        fontSize: '28px',
        color: COLORS.textMuted,
        padding: { x: 16, y: 30 },
      })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start(SCENES.menu));
  }

  update(time: number): void {
    this.player.updateMovement();
    const list = this.enemies.getChildren() as Enemy[];
    for (let i = 0; i < list.length; i++) {
      if (list[i].active) list[i].updateAI(time, this.player.x, this.player.y);
    }
    this.updateAutoFire(time);
  }

  /** Tire sur l'ennemi le plus proche : à l'arrêt, ou en permanence si settings.alwaysShoot. */
  private updateAutoFire(time: number): void {
    if (this.player.isMoving && !GameState.data.settings.alwaysShoot) return;
    const target = this.nearestEnemy();
    if (!target) return;

    this.player.faceTowards(target.x, target.y);
    if (time < this.nextShotAt) return;

    const stats = this.player.stats;
    this.nextShotAt = time + 1000 / stats.attackSpeed;
    const isCrit = rollCrit(stats.critChance);
    const damage = damageAmount(stats.attack, isCrit, stats.critDamage);
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    (this.playerProjectiles.get(this.player.x, this.player.y) as Projectile | null)?.fire(
      this.player.x,
      this.player.y,
      angle,
      stats.projectileSpeed,
      damage,
      isCrit,
    );
  }

  private nearestEnemy(): Enemy | null {
    const list = this.enemies.getChildren() as Enemy[];
    let best: Enemy | null = null;
    let bestDist = Infinity;
    for (let i = 0; i < list.length; i++) {
      if (!list[i].active) continue;
      const d = Phaser.Math.Distance.Squared(this.player.x, this.player.y, list[i].x, list[i].y);
      if (d < bestDist) {
        bestDist = d;
        best = list[i];
      }
    }
    return best;
  }

  private onProjectileHit(projectile: Projectile, enemy: Enemy): void {
    if (!projectile.active || !enemy.active) return;
    projectile.kill();
    enemy.takeDamage(projectile.damage);
  }

  private onEnemyShoot(x: number, y: number, angle: number, speed: number, damage: number): void {
    const projectile = this.enemyProjectiles.get(x, y) as EnemyProjectile | null;
    projectile?.fire(x, y, angle, speed, damage);
  }

  /** Fait apparaître les ennemis d'une salle du chapitre, dans la moitié haute de l'arène. */
  private spawnRoom(roomIndex: number): void {
    const room = getChapter(this.chapterId).rooms[roomIndex];
    const margin = 60;
    for (const group of room.enemies ?? []) {
      const def = getEnemy(group.id);
      for (let i = 0; i < group.count; i++) {
        const x = Phaser.Math.Between(ARENA.x + margin, ARENA.x + ARENA.width - margin);
        const y = Phaser.Math.Between(ARENA.y + margin, ARENA.y + ARENA.height / 2 - margin);
        (this.enemies.get(x, y) as Enemy | null)?.spawn(def, x, y, this.time.now);
      }
    }
  }

  /** Murs (rectangle plein) puis sol par-dessus : il reste une bordure de WALL_THICKNESS. */
  private buildArena(): void {
    const top = HUD_HEIGHT;
    this.add
      .rectangle(0, top, GAME_WIDTH, GAME_HEIGHT - top, COLORS.wall)
      .setOrigin(0, 0);
    this.add
      .rectangle(WALL_THICKNESS, top + WALL_THICKNESS, ARENA.width, ARENA.height, COLORS.floor)
      .setOrigin(0, 0);
  }
}
