import Phaser from 'phaser';
import { ARENA, COLORS, FLOOR_TILE, GAME_HEIGHT, GAME_WIDTH, HUD_HEIGHT, POOLS, SCENES } from '../config';
import { getChapter } from '../data';
import { Enemy } from '../entities/Enemy';
import { EnemyProjectile } from '../entities/EnemyProjectile';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { endRun } from '../run/endRun';
import { RoomFlow } from '../run/RoomFlow';
import type { RunContext } from '../run/RunContext';
import { ShotController } from '../run/ShotController';
import { SkillFlow } from '../run/SkillFlow';
import { GameState } from '../state/GameState';
import { RunState } from '../state/RunState';
import { Fx } from '../ui/Fx';
import { Hud } from '../ui/Hud';
import { VirtualJoystick } from '../ui/VirtualJoystick';

interface RunData {
  chapterId: string;
}

/**
 * Scène de combat : monte l'arène, le héros, les pools et le HUD, puis délègue à des contrôleurs
 * (src/run/) : ShotController (tir), SkillFlow (choix de compétence), RoomFlow (salles, porte, XP),
 * endRun (fin et butin).
 * Zone de jeu : bandeau HUD en haut (HUD_HEIGHT), arène entourée de murs en dessous.
 */
export class RunScene extends Phaser.Scene {
  private chapterId = 'ch1';
  private ctx!: RunContext;
  private fx!: Fx;
  private shots!: ShotController;
  private rooms!: RoomFlow;

  constructor() {
    super(SCENES.run);
  }

  init(data: RunData): void {
    this.chapterId = data?.chapterId ?? 'ch1';
  }

  create(): void {
    this.physics.resume();
    this.buildArena();
    this.physics.world.setBounds(ARENA.x, ARENA.y, ARENA.width, ARENA.height);

    const player = new Player(this, GAME_WIDTH / 2, ARENA.y + ARENA.height * 0.75);
    const joystick = new VirtualJoystick(this);
    player.setJoystick(joystick);
    const runState = new RunState();
    runState.passives = GameState.startingPassives();
    new Hud(this, player.hp, player.maxHp, runState.level, runState.xp, runState.xpNeeded, 1, getChapter(this.chapterId).rooms.length);
    this.fx = new Fx(this);

    const enemies = this.physics.add.group({ classType: Enemy, maxSize: POOLS.enemies });
    const enemyProjectiles = this.physics.add.group({ classType: EnemyProjectile, maxSize: POOLS.enemyProjectiles });
    const playerProjectiles = this.physics.add.group({ classType: Projectile, maxSize: POOLS.playerProjectiles });
    this.ctx = { scene: this, chapterId: this.chapterId, player, runState, joystick, enemies, enemyProjectiles, playerProjectiles };

    // Contrôleurs. SkillFlow prévient RoomFlow quand le choix de l'ange est fait (la salle est alors terminée).
    this.shots = new ShotController(this.ctx);
    const skills = new SkillFlow(this.ctx, this.shots, () => this.rooms.finishRoom());
    this.rooms = new RoomFlow(this.ctx, skills, (victory) => endRun(this.ctx, victory));

    this.physics.add.collider(enemies, enemies);
    // Dégâts au joueur : contact avec un ennemi, ou projectile ennemi.
    this.physics.add.overlap(player, enemies, (_p, e) => player.takeDamage((e as Enemy).damage, this.time.now));
    this.physics.add.overlap(player, enemyProjectiles, (_p, shot) => {
      const projectile = shot as EnemyProjectile;
      if (!projectile.active) return;
      projectile.kill();
      player.takeDamage(projectile.damage, this.time.now);
    });

    // Les projectiles disparaissent en touchant un mur.
    this.physics.world.on('worldbounds', (body: Phaser.Physics.Arcade.Body) => {
      if (body.gameObject instanceof EnemyProjectile || body.gameObject instanceof Projectile) body.gameObject.kill();
    });
    this.events.on('enemy-shoot', this.onEnemyShoot, this);
    this.events.on('player-died', this.onPlayerDied, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off('enemy-shoot', this.onEnemyShoot, this);
      this.events.off('player-died', this.onPlayerDied, this);
    });

    this.rooms.load(0);

    // Bandeau HUD : retour au menu.
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
    this.fx.update(time);
    const { player, runState, enemies } = this.ctx;
    if (runState.ended) return;
    player.updateMovement(time);
    this.shots.updateOrbs(time);
    const list = enemies.getChildren() as Enemy[];
    for (let i = 0; i < list.length; i++) {
      if (list[i].active) list[i].updateAI(time, player.x, player.y);
    }
    this.shots.updateAutoFire(time);
    this.rooms.update();
  }

  private onEnemyShoot(x: number, y: number, angle: number, speed: number, damage: number): void {
    const projectile = this.ctx.enemyProjectiles.get(x, y) as EnemyProjectile | null;
    projectile?.fire(x, y, angle, speed, damage);
  }

  private onPlayerDied(): void {
    endRun(this.ctx, false);
  }

  /** Murs (rectangle plein), puis sol en damier par-dessus : il reste une bordure de WALL_THICKNESS. */
  private buildArena(): void {
    const top = HUD_HEIGHT;
    this.add.rectangle(0, top, GAME_WIDTH, GAME_HEIGHT - top, COLORS.wall).setOrigin(0, 0);

    const floor = this.add.graphics();
    for (let row = 0; row * FLOOR_TILE < ARENA.height; row++) {
      for (let col = 0; col * FLOOR_TILE < ARENA.width; col++) {
        floor.fillStyle((row + col) % 2 === 0 ? COLORS.floor : COLORS.floorAlt, 1);
        floor.fillRect(
          ARENA.x + col * FLOOR_TILE,
          ARENA.y + row * FLOOR_TILE,
          Math.min(FLOOR_TILE, ARENA.width - col * FLOOR_TILE),
          Math.min(FLOOR_TILE, ARENA.height - row * FLOOR_TILE),
        );
      }
    }
    // Liseré sombre autour du sol, pour détacher les murs.
    this.add
      .rectangle(ARENA.x, ARENA.y, ARENA.width, ARENA.height)
      .setOrigin(0, 0)
      .setStrokeStyle(6, COLORS.wallEdge);
  }
}
