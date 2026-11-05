import Phaser from 'phaser';
import { ARENA, COLORS, GAME_HEIGHT, GAME_WIDTH, HUD_HEIGHT, PLAYER_SPAWN, POOLS, SCENES } from '../config';
import { ARENA_DECOR, getChapter } from '../data';
import { Enemy } from '../entities/Enemy';
import { EnemyProjectile } from '../entities/EnemyProjectile';
import { PetFollower } from '../entities/PetFollower';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { endRun } from '../run/endRun';
import { RoomFlow } from '../run/RoomFlow';
import type { RunContext } from '../run/RunContext';
import { ShotController } from '../run/ShotController';
import { SkillFlow } from '../run/SkillFlow';
import { GameState } from '../state/GameState';
import { RunState } from '../state/RunState';
import { buildArenaLayout, type ArenaLayout } from '../systems/arenaLayout';
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
  private pet?: PetFollower;

  constructor() {
    super(SCENES.run);
  }

  init(data: RunData): void {
    this.chapterId = data?.chapterId ?? 'ch1';
  }

  create(): void {
    this.physics.resume();
    const arena = buildArenaLayout(
      ARENA_DECOR,
      ARENA.width,
      ARENA.height,
      { x: PLAYER_SPAWN.x - ARENA.x, y: PLAYER_SPAWN.y - ARENA.y },
      Math.random,
    );
    const blocks = this.buildArena(arena);
    this.physics.world.setBounds(ARENA.x, ARENA.y, ARENA.width, ARENA.height);

    const player = new Player(this, PLAYER_SPAWN.x, PLAYER_SPAWN.y);
    const equippedPet = GameState.equippedPet();
    if (equippedPet?.def.petAppearance) {
      this.pet = new PetFollower(this, `pet-${equippedPet.def.id}`, player.x - 54, player.y - 46);
    }
    const joystick = new VirtualJoystick(this);
    player.setJoystick(joystick);
    const runState = new RunState();
    runState.passives = GameState.startingPassives();
    new Hud(this, player.hp, player.maxHp, runState.level, runState.xp, runState.xpNeeded, 1, getChapter(this.chapterId).rooms.length);
    this.fx = new Fx(this);

    const enemies = this.physics.add.group({ classType: Enemy, maxSize: POOLS.enemies });
    const enemyProjectiles = this.physics.add.group({ classType: EnemyProjectile, maxSize: POOLS.enemyProjectiles });
    const playerProjectiles = this.physics.add.group({ classType: Projectile, maxSize: POOLS.playerProjectiles });
    this.ctx = { scene: this, chapterId: this.chapterId, player, arena, runState, joystick, enemies, enemyProjectiles, playerProjectiles };

    // Contrôleurs. SkillFlow prévient RoomFlow quand le choix de l'ange est fait (la salle est alors terminée).
    this.shots = new ShotController(this.ctx);
    const skills = new SkillFlow(this.ctx, this.shots, () => this.rooms.finishRoom());
    this.rooms = new RoomFlow(this.ctx, skills, (victory) => endRun(this.ctx, victory));

    this.physics.add.collider(enemies, enemies);
    // Blocs de pierre : ils arrêtent le héros et les ennemis, et absorbent les projectiles.
    this.physics.add.collider(player, blocks);
    this.physics.add.collider(enemies, blocks);
    this.physics.add.collider(enemyProjectiles, blocks, (shot) => (shot as EnemyProjectile).kill());
    this.physics.add.collider(playerProjectiles, blocks, (shot) => (shot as Projectile).kill());
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

  update(time: number, delta: number): void {
    this.fx.update(time);
    const { player, runState, enemies } = this.ctx;
    if (runState.ended) return;
    player.updateMovement(time);
    this.pet?.update(time, delta, player.x, player.y);
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

  /**
   * Murs (rectangle plein), sol en tuile d'herbe texturée avec plaques de pierre et canaux d'eau,
   * puis blocs de pierre solides. Renvoie le groupe statique des blocs.
   */
  private buildArena(layout: ArenaLayout): Phaser.Physics.Arcade.StaticGroup {
    const visual = getChapter(this.chapterId).visual;
    const color = (hex: string): number => Phaser.Display.Color.HexStringToColor(hex).color;
    const top = HUD_HEIGHT;
    // Fond des murs, sous le sol : il reste visible comme bordure de l'arène.
    this.add
      .tileSprite(0, top, GAME_WIDTH, GAME_HEIGHT - top, 'stone-wall-texture')
      .setOrigin(0, 0)
      .setTint(color(visual.wallColor))
      .setDepth(-30);

    // Sol : tuile d'herbe fournie par Martin, répétée et teintée par chapitre.
    this.add
      .tileSprite(ARENA.x + ARENA.width / 2, ARENA.y + ARENA.height / 2, ARENA.width, ARENA.height, 'tile-grass')
      .setTint(color(visual.floorTint))
      .setDepth(-20);

    // Plaques de pierre et canaux d'eau, plats, posés sur l'herbe : ce sont des décors de sol,
    // pas des obstacles (seuls les blocs ci-dessous arrêtent le héros).
    const stone = color(visual.stoneColor);
    const water = color(visual.waterColor);
    const detail = this.add.graphics().setDepth(-18);
    for (let row = 0; row < layout.rows; row++) {
      for (let col = 0; col < layout.cols; col++) {
        const kind = layout.tiles[row * layout.cols + col];
        if (kind === 'grass') continue;
        const x = ARENA.x + col * layout.cell;
        const y = ARENA.y + row * layout.cell;
        const width = Math.min(layout.cell, ARENA.width - col * layout.cell);
        const height = Math.min(layout.cell, ARENA.height - row * layout.cell);
        this.add
          .tileSprite(x + width / 2, y + height / 2, width, height, kind === 'stone' ? 'stone-wall-texture' : 'water-texture')
          .setTint(kind === 'stone' ? stone : water)
          .setAlpha(kind === 'stone' ? 0.88 : 0.92)
          .setDepth(-19);
        if (kind === 'water') {
          // Quelques reflets posés sur la texture pour que les canaux restent lisibles.
          detail.fillStyle(0xffffff, 0.3);
          detail.fillRect(x + 10, y + height * 0.4, width - 20, 4);
          detail.fillRect(x + width * 0.3, y + height * 0.7, width * 0.45, 4);
        }
      }
    }

    // Blocs de pierre : ombre portée, bloc taillé, arête claire. Le groupe porte la collision.
    const blocks = this.physics.add.staticGroup();
    for (const block of layout.obstacles) {
      const x = ARENA.x + block.x + block.width / 2;
      const y = ARENA.y + block.y + block.height / 2;
      this.add.ellipse(x + 3, y + 7, block.width * 0.9, block.height * 0.55, 0x000000, 0.24).setDepth(-6);
      if (this.textures.exists('stone-pillar')) {
        // L'illustration a un bord transparent : la hitbox correspond à la silhouette visible.
        const collider = this.add.rectangle(x, y, block.width * 0.7, block.height, 0xffffff, 0).setVisible(false);
        blocks.add(collider);
        this.add
          .image(x, y, 'stone-pillar')
          .setDisplaySize(block.width * 1.25, block.height * 1.35)
          .setTint(stone)
          .setDepth(-5);
      } else {
        blocks.add(this.add.rectangle(x, y, block.width, block.height, stone).setStrokeStyle(7, color(visual.wallEdgeColor)).setDepth(-5));
      }
    }

    // Liseré sombre autour du sol, pour détacher les murs.
    this.add.rectangle(ARENA.x, ARENA.y, ARENA.width, ARENA.height).setOrigin(0, 0).setStrokeStyle(8, color(visual.wallEdgeColor));
    this.add.rectangle(ARENA.x + ARENA.width / 2, ARENA.y + 4, ARENA.width - 24, 8, color(visual.accentColor), 0.9).setDepth(1);
    return blocks;
  }
}
