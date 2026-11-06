import Phaser from 'phaser';
import { ARENA, GAME_HEIGHT, GAME_WIDTH, HUD_HEIGHT, PLAYER_SPAWN, POOLS, SCENES } from '../config';
import { ARENA_DECOR, ARENA_TEMPLATES, getChapter, LUCKY_WHEEL, SURVIVAL } from '../data';
import { Enemy } from '../entities/Enemy';
import { EnemyProjectile } from '../entities/EnemyProjectile';
import { LobbedProjectile } from '../entities/LobbedProjectile';
import { PetFollower } from '../entities/PetFollower';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { endRun } from '../run/endRun';
import { LuckyWheel } from '../run/LuckyWheel';
import { RoomFlow } from '../run/RoomFlow';
import { SurvivalHazards } from '../run/SurvivalHazards';
import type { RunContext } from '../run/RunContext';
import { ShotController } from '../run/ShotController';
import { SkillFlow } from '../run/SkillFlow';
import { GameState } from '../state/GameState';
import { RunState } from '../state/RunState';
import { buildArenaLayout, type ArenaLayout, type ArenaPoint } from '../systems/arenaLayout';
import { arenaLineOfSight, findArenaPath } from '../systems/navigation';
import { Fx } from '../ui/Fx';
import { Hud } from '../ui/Hud';
import { VirtualJoystick } from '../ui/VirtualJoystick';

interface RunData {
  chapterId?: string;
  mode?: 'campaign' | 'survival';
}

interface EnemyRoute {
  refreshAt: number;
  playerX: number;
  playerY: number;
  enemyX: number;
  enemyY: number;
  waypoint: ArenaPoint;
}

/**
 * Scène de combat : monte l'arène, le héros, les pools et le HUD, puis délègue à des contrôleurs
 * (src/run/) : ShotController (tir), SkillFlow (choix de compétence), RoomFlow (salles, porte, XP),
 * endRun (fin et butin).
 * Zone de jeu : bandeau HUD en haut (HUD_HEIGHT), arène entourée de murs en dessous.
 */
export class RunScene extends Phaser.Scene {
  private chapterId = 'ch1';
  private mode: 'campaign' | 'survival' = 'campaign';
  private ctx!: RunContext;
  private fx!: Fx;
  private shots!: ShotController;
  private rooms!: RoomFlow;
  private hazards?: SurvivalHazards;
  private pet?: PetFollower;
  private startBonusLocked = false;
  private enemyRoutes = new WeakMap<Enemy, EnemyRoute>();
  private arena!: ArenaLayout;
  private lastArenaTemplateId?: string;
  private blocks!: Phaser.Physics.Arcade.StaticGroup;
  private readonly arenaVisuals: Phaser.GameObjects.GameObject[] = [];
  private readonly lobbedProjectiles: LobbedProjectile[] = [];

  constructor() {
    super(SCENES.run);
  }

  init(data: RunData): void {
    this.chapterId = data?.chapterId ?? 'ch1';
    this.mode = data?.mode ?? 'campaign';
  }

  create(): void {
    this.physics.resume();
    this.arenaVisuals.length = 0;
    this.lobbedProjectiles.length = 0;
    this.lastArenaTemplateId = undefined;
    this.arena = this.createArenaLayout();
    this.blocks = this.physics.add.staticGroup();
    this.buildArena(this.arena);
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
    new Hud(this, player.hp, player.maxHp, runState.level, runState.xp, runState.xpNeeded, 1,
      this.mode === 'survival' ? SURVIVAL.roomCount : getChapter(this.chapterId).rooms.length, this.mode);
    this.fx = new Fx(this);

    const enemies = this.physics.add.group({ classType: Enemy, maxSize: POOLS.enemies });
    const enemyProjectiles = this.physics.add.group({ classType: EnemyProjectile, maxSize: POOLS.enemyProjectiles });
    const playerProjectiles = this.physics.add.group({ classType: Projectile, maxSize: POOLS.playerProjectiles });
    for (let i = 0; i < POOLS.lobbedProjectiles; i++) this.lobbedProjectiles.push(new LobbedProjectile(this));
    this.ctx = {
      scene: this,
      chapterId: this.chapterId,
      mode: this.mode,
      player,
      arena: this.arena,
      refreshArena: () => this.refreshArena(),
      runState,
      joystick,
      enemies,
      enemyProjectiles,
      playerProjectiles,
    };

    // Contrôleurs. SkillFlow prévient RoomFlow quand le choix de l'ange est fait (la salle est alors terminée).
    this.shots = new ShotController(this.ctx);
    const skills = new SkillFlow(this.ctx, this.shots, () => this.rooms.finishRoom());
    this.rooms = new RoomFlow(this.ctx, skills, (victory) => endRun(this.ctx, victory));
    if (this.mode === 'survival') this.hazards = new SurvivalHazards(this.ctx);

    this.physics.add.collider(enemies, enemies);
    // Blocs de pierre : ils arrêtent le héros et les ennemis, et absorbent les projectiles.
    this.physics.add.collider(player, this.blocks);
    this.physics.add.collider(enemies, this.blocks);
    this.physics.add.collider(enemyProjectiles, this.blocks, (shot) => this.onEnemyProjectileImpact(shot as EnemyProjectile));
    this.physics.add.collider(playerProjectiles, this.blocks, (shot) => (shot as Projectile).kill());
    // Dégâts au joueur : contact avec un ennemi, ou projectile ennemi.
    this.physics.add.overlap(player, enemies, (_p, e) => player.takeDamage((e as Enemy).damage, this.time.now));
    this.physics.add.overlap(player, enemyProjectiles, (_p, shot) => {
      const projectile = shot as EnemyProjectile;
      if (!projectile.active) return;
      const explosion = projectile.detonate();
      if (explosion) this.enemyExplosion(explosion.x, explosion.y, explosion.damage, explosion.radius);
      else player.takeDamage(projectile.damage, this.time.now);
    });

    // Les projectiles disparaissent en touchant un mur.
    this.physics.world.on('worldbounds', (body: Phaser.Physics.Arcade.Body) => {
      if (body.gameObject instanceof EnemyProjectile) this.onEnemyProjectileImpact(body.gameObject);
      else if (body.gameObject instanceof Projectile) body.gameObject.kill();
    });
    this.events.on('enemy-shoot', this.onEnemyShoot, this);
    this.events.on('enemy-fireball', this.onEnemyFireball, this);
    this.events.on('enemy-lob', this.onEnemyLob, this);
    this.events.on('player-died', this.onPlayerDied, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off('enemy-shoot', this.onEnemyShoot, this);
      this.events.off('enemy-fireball', this.onEnemyFireball, this);
      this.events.off('enemy-lob', this.onEnemyLob, this);
      this.events.off('player-died', this.onPlayerDied, this);
      for (const projectile of this.lobbedProjectiles) projectile.destroy();
    });
    this.events.on('room-changed', () => {
      this.enemyRoutes = new WeakMap<Enemy, EnemyRoute>();
      for (const projectile of this.lobbedProjectiles) projectile.kill();
    });

    this.rooms.load(0);
    // La référence ouvre par un pouvoir, puis une récompense très brève avant le premier combat.
    this.openStartingChoice(skills);

    // Pause compacte, comme dans la référence ; le menu reste accessible depuis le panneau.
    const pause = this.add.rectangle(66, HUD_HEIGHT / 2, 84, 72, 0x102a43, 0.92).setStrokeStyle(5, 0x315b78).setInteractive({ useHandCursor: true });
    this.add.rectangle(53, HUD_HEIGHT / 2, 11, 34, 0xffffff).setStrokeStyle(2, 0x10243a);
    this.add.rectangle(79, HUD_HEIGHT / 2, 11, 34, 0xffffff).setStrokeStyle(2, 0x10243a);
    pause.on('pointerup', () => {
      if (this.startBonusLocked || this.runStateIsOver()) return;
      this.scene.launch(SCENES.pause);
      this.scene.pause();
    });
  }

  update(time: number, delta: number): void {
    this.fx.update(time);
    const { player, runState, enemies, arena } = this.ctx;
    if (runState.ended || this.startBonusLocked) return;
    this.updateLobbedProjectiles(time);
    player.updateMovement(time);
    this.hazards?.update(time);
    this.pet?.update(time, delta, player.x, player.y);
    this.shots.updateOrbs(time);
    const list = enemies.getChildren() as Enemy[];
    for (let i = 0; i < list.length; i++) {
      if (!list[i].active) continue;
      const enemy = list[i];
      const from = { x: enemy.x - ARENA.x, y: enemy.y - ARENA.y };
      const target = { x: player.x - ARENA.x, y: player.y - ARENA.y };
      const visible = arenaLineOfSight(arena, from, target, enemy.def.radius * 1.1);
      let waypoint = target;
      if (!visible) waypoint = this.enemyWaypoint(enemy, from, target, time);
      enemy.updateAI(time, player.x, player.y, waypoint.x + ARENA.x, waypoint.y + ARENA.y, visible);
    }
    this.shots.updateAutoFire(time);
    this.rooms.update();
  }

  private onEnemyShoot(x: number, y: number, angle: number, speed: number, damage: number): void {
    const projectile = this.ctx.enemyProjectiles.get(x, y) as EnemyProjectile | null;
    projectile?.fire(x, y, angle, speed, damage);
  }

  private onEnemyFireball(x: number, y: number, angle: number, speed: number, damage: number, radius: number): void {
    const projectile = this.ctx.enemyProjectiles.get(x, y) as EnemyProjectile | null;
    projectile?.fire(x, y, angle, speed, damage, 'fireball', radius);
  }

  private onEnemyLob(
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    damage: number,
    radius: number,
    duration: number,
  ): void {
    const projectile = this.lobbedProjectiles.find((entry) => !entry.isActive);
    projectile?.launch(this.time.now, x, y, targetX, targetY, damage, radius, duration);
  }

  private onEnemyProjectileImpact(projectile: EnemyProjectile): void {
    const explosion = projectile.detonate();
    if (explosion) this.enemyExplosion(explosion.x, explosion.y, explosion.damage, explosion.radius);
  }

  private updateLobbedProjectiles(time: number): void {
    for (const projectile of this.lobbedProjectiles) {
      const impact = projectile.update(time);
      if (impact) this.enemyExplosion(impact.x, impact.y, impact.damage, impact.radius);
    }
  }

  /** Une explosion ne touche le héros que s'il reste dans son rayon, donc elle peut être esquivée. */
  private enemyExplosion(x: number, y: number, damage: number, radius: number): void {
    this.events.emit('enemy-explosion', x, y, radius);
    const body = this.ctx.player.body as Phaser.Physics.Arcade.Body;
    const hitRadius = radius + Math.max(body.halfWidth, body.halfHeight) * 0.45;
    if (Phaser.Math.Distance.Between(this.ctx.player.x, this.ctx.player.y, x, y) <= hitRadius) {
      this.ctx.player.takeDamage(damage, this.time.now);
    }
  }

  /** Recompose uniquement le décor et les colliders statiques : joueur, HUD et pools restent intacts. */
  private refreshArena(): void {
    for (const visual of this.arenaVisuals.splice(0)) visual.destroy();
    this.blocks.clear(true, true);
    this.arena = this.createArenaLayout();
    this.buildArena(this.arena);
    this.ctx.arena = this.arena;
    this.enemyRoutes = new WeakMap<Enemy, EnemyRoute>();
  }

  /** Chaque salle reçoit l'un des plans originaux et ne répète pas immédiatement le précédent. */
  private createArenaLayout(): ArenaLayout {
    const arena = buildArenaLayout(
      ARENA_DECOR,
      ARENA.width,
      ARENA.height,
      { x: PLAYER_SPAWN.x - ARENA.x, y: PLAYER_SPAWN.y - ARENA.y },
      {
        rng: Math.random,
        templates: ARENA_TEMPLATES,
        excludedTemplateId: this.lastArenaTemplateId,
      },
    );
    this.lastArenaTemplateId = arena.templateId;
    return arena;
  }

  private onPlayerDied(): void {
    endRun(this.ctx, false);
  }

  private runStateIsOver(): boolean {
    return this.ctx.runState.ended;
  }

  private openStartingChoice(skills: SkillFlow): void {
    this.startBonusLocked = true;
    this.physics.pause();
    skills.openStartingChoice(() => this.openStartWheel());
  }

  /** Une courte récompense au lancement, comme dans la référence, puis combat immédiatement. */
  private openStartWheel(): void {
    if (LUCKY_WHEEL.rewards.length === 0) {
      this.startBonusLocked = false;
      this.physics.resume();
      return;
    }
    this.physics.pause();
    new LuckyWheel(this.ctx, (reward) => {
      if (reward.kind === 'gold') this.ctx.runState.gold += reward.value;
      if (reward.kind === 'heal') this.ctx.player.heal(reward.value);
      if (reward.kind === 'xp') {
        const gained = this.ctx.runState.addXp(reward.value);
        const { level, xp, xpNeeded } = this.ctx.runState;
        this.events.emit('xp-changed', level, xp, xpNeeded);
        for (let i = gained - 1; i >= 0; i--) this.events.emit('level-up', level - i);
      }
      this.time.delayedCall(880, () => {
        this.startBonusLocked = false;
        this.physics.resume();
      });
    });
  }

  /** Calcule un détour uniquement lorsque la pierre coupe la route directe ; le résultat est réutilisé. */
  private enemyWaypoint(enemy: Enemy, from: ArenaPoint, target: ArenaPoint, time: number): ArenaPoint {
    let route = this.enemyRoutes.get(enemy);
    const movedEnough = route && (Math.hypot(route.playerX - target.x, route.playerY - target.y) > this.ctx.arena.cell * 0.7
      || Math.hypot(route.enemyX - from.x, route.enemyY - from.y) > this.ctx.arena.cell * 0.7);
    const reachedWaypoint = route && Math.hypot(route.waypoint.x - from.x, route.waypoint.y - from.y) < enemy.def.radius + 18;
    if (!route || time >= route.refreshAt || movedEnough || reachedWaypoint) {
      const path = findArenaPath(this.ctx.arena, from, target, enemy.def.radius * 1.1 + 8);
      route = {
        refreshAt: time + 280,
        playerX: target.x,
        playerY: target.y,
        enemyX: from.x,
        enemyY: from.y,
        waypoint: path[1] ?? target,
      };
      this.enemyRoutes.set(enemy, route);
    }
    return route.waypoint;
  }

  /**
   * Murs (rectangle plein), sol en tuile d'herbe texturée avec plaques de pierre et canaux d'eau,
   * puis blocs de pierre solides. Renvoie le groupe statique des blocs.
   */
  private buildArena(layout: ArenaLayout): void {
    const visual = getChapter(this.chapterId).visual;
    const color = (hex: string): number => Phaser.Display.Color.HexStringToColor(hex).color;
    const track = <T extends Phaser.GameObjects.GameObject>(object: T): T => {
      this.arenaVisuals.push(object);
      return object;
    };
    const top = HUD_HEIGHT;
    // Cadre original, plus lisible qu'un mur photographique répété : des dalles colorées et profondes.
    const frame = track(this.add.graphics().setDepth(-30));
    const wall = color(visual.wallColor);
    const edge = color(visual.wallEdgeColor);
    frame.fillStyle(edge, 1).fillRect(0, top, GAME_WIDTH, GAME_HEIGHT - top);
    frame.fillStyle(wall, 1).fillRoundedRect(6, top + 6, GAME_WIDTH - 12, GAME_HEIGHT - top - 12, 28);
    frame.fillStyle(0xffffff, 0.1).fillRoundedRect(12, top + 12, GAME_WIDTH - 24, 20, 10);
    frame.lineStyle(5, color(visual.accentColor), 0.75).strokeRoundedRect(7, top + 7, GAME_WIDTH - 14, GAME_HEIGHT - top - 14, 27);
    for (let x = 22; x < GAME_WIDTH; x += 92) {
      frame.fillStyle(edge, 0.4).fillRoundedRect(x, ARENA.y - 23, 66, 16, 7);
      frame.fillStyle(0xffffff, 0.16).fillRoundedRect(x + 7, ARENA.y - 20, 48, 4, 2);
    }

    // Sol : tuile d'herbe fournie par Martin, répétée et teintée par chapitre.
    track(this.add
      .tileSprite(ARENA.x + ARENA.width / 2, ARENA.y + ARENA.height / 2, ARENA.width, ARENA.height, 'tile-grass')
      .setTint(color(visual.floorTint))
      .setDepth(-20));

    // Herbes, paillettes et petites feuilles dessinent un sol vivant sans gêner les collisions.
    const flora = track(this.add.graphics().setDepth(-17));
    const grassAccent = color(visual.accentColor);
    for (let row = 0; row < layout.rows; row++) {
      for (let col = 0; col < layout.cols; col++) {
        const index = row * layout.cols + col;
        if (layout.tiles[index] !== 'grass' || (row * 7 + col * 11) % 3 !== 0) continue;
        const x = ARENA.x + (col + 0.34 + ((row + col) % 2) * 0.18) * layout.cell;
        const y = ARENA.y + (row + 0.7) * layout.cell;
        flora.lineStyle(3, grassAccent, 0.24);
        flora.lineBetween(x - 7, y + 5, x - 3, y - 7);
        flora.lineBetween(x, y + 6, x + 3, y - 9);
        flora.lineBetween(x + 7, y + 5, x + 10, y - 5);
        if ((row * 13 + col * 5) % 11 === 0) {
          flora.fillStyle(0xffffff, 0.56).fillCircle(x + 12, y - 8, 3);
          flora.fillStyle(grassAccent, 0.8).fillCircle(x + 16, y - 3, 4);
        }
      }
    }

    // Plaques de pierre et canaux d'eau, plats, posés sur l'herbe : ce sont des décors de sol,
    // pas des obstacles (seuls les blocs ci-dessous arrêtent le héros).
    const stone = color(visual.stoneColor);
    const water = color(visual.waterColor);
    const detail = track(this.add.graphics().setDepth(-18));
    for (let row = 0; row < layout.rows; row++) {
      for (let col = 0; col < layout.cols; col++) {
        const kind = layout.tiles[row * layout.cols + col];
        if (kind === 'grass') continue;
        const x = ARENA.x + col * layout.cell;
        const y = ARENA.y + row * layout.cell;
        const width = Math.min(layout.cell, ARENA.width - col * layout.cell);
        const height = Math.min(layout.cell, ARENA.height - row * layout.cell);
        track(this.add
          .tileSprite(x + width / 2, y + height / 2, width, height, kind === 'stone' ? 'stone-wall-texture' : 'water-texture')
          .setTint(kind === 'stone' ? stone : water)
          .setAlpha(kind === 'stone' ? 0.88 : 0.92)
          .setDepth(-19));
        if (kind === 'water') {
          // Quelques reflets posés sur la texture pour que les canaux restent lisibles.
          detail.fillStyle(0xffffff, 0.3);
          detail.fillRect(x + 10, y + height * 0.4, width - 20, 4);
          detail.fillRect(x + width * 0.3, y + height * 0.7, width * 0.45, 4);
        }
      }
    }

    // Rochers bas, colorés et très lisibles : leur volume suit exactement leur collider.
    const blocks = this.blocks;
    const blockArt = track(this.add.graphics().setDepth(-5));
    for (const block of layout.obstacles) {
      const x = ARENA.x + block.x + block.width / 2;
      const y = ARENA.y + block.y + block.height / 2;
      blockArt.fillStyle(0x081729, 0.25).fillEllipse(x + 5, y + block.height * 0.34, block.width * 1.04, block.height * 0.58);
      blockArt.fillStyle(color(visual.stoneEdgeColor), 1).fillRoundedRect(x - block.width / 2, y - block.height / 2, block.width, block.height, 16);
      blockArt.fillStyle(stone, 1).fillRoundedRect(x - block.width / 2 + 6, y - block.height / 2 + 4, block.width - 12, block.height - 10, 13);
      blockArt.fillStyle(0xffffff, 0.26).fillRoundedRect(x - block.width / 2 + 13, y - block.height / 2 + 10, Math.max(16, block.width * 0.64), 7, 4);
      blockArt.lineStyle(3, color(visual.accentColor), 0.22).lineBetween(x - block.width * 0.28, y + 2, x + block.width * 0.24, y + 2);
      blocks.add(this.add.rectangle(x, y, block.width, block.height, 0xffffff, 0).setVisible(false));
    }

    // Liseré sombre autour du sol, pour détacher les murs.
    track(this.add.rectangle(ARENA.x, ARENA.y, ARENA.width, ARENA.height).setOrigin(0, 0).setStrokeStyle(8, edge));
    track(this.add.rectangle(ARENA.x + ARENA.width / 2, ARENA.y + 4, ARENA.width - 24, 8, color(visual.accentColor), 0.9).setDepth(1));
  }
}
