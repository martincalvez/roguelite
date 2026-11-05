import Phaser from 'phaser';
import { ARENA, COLORS, FLOOR_TILE, GAME_HEIGHT, GAME_WIDTH, HUD_HEIGHT, POOLS, SCENES } from '../config';
import { getChapter, getEnemy, PROGRESSION, SKILLS } from '../data';
import { Enemy } from '../entities/Enemy';
import { EnemyProjectile } from '../entities/EnemyProjectile';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { XpOrb } from '../entities/XpOrb';
import { GameState } from '../state/GameState';
import { RunState } from '../state/RunState';
import { damageAmount, rollCrit } from '../systems/combat';
import { drawSkills, skillStatModifiers } from '../systems/skills';
import type { EnemyDef, SkillDef } from '../types';
import type { SkillPickData } from './SkillPickScene';
import { Fx } from '../ui/Fx';
import { Hud } from '../ui/Hud';
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
  private xpOrbs!: Phaser.Physics.Arcade.Group;
  private runState!: RunState;
  private pendingLevels: number[] = []; // niveaux gagnés dont le choix de compétence est à faire
  private picking = false;
  private collecting = false; // salle vidée : les orbes d'XP sont aspirés vers le héros
  private joystick!: VirtualJoystick;
  private fx!: Fx;
  private nextShotAt = 0;
  private enemiesAlive = 0;
  private ended = false;

  constructor() {
    super(SCENES.run);
  }

  init(data: RunData): void {
    this.chapterId = data?.chapterId ?? 'ch1';
    // La scène est réutilisée à chaque partie : on remet l'état à zéro.
    this.ended = false;
    this.collecting = false;
    this.pendingLevels = [];
    this.picking = false;
    this.enemiesAlive = 0;
    this.nextShotAt = 0;
  }

  create(): void {
    this.physics.resume();
    this.buildArena();
    this.physics.world.setBounds(ARENA.x, ARENA.y, ARENA.width, ARENA.height);

    this.player = new Player(this, GAME_WIDTH / 2, ARENA.y + ARENA.height * 0.75);
    this.joystick = new VirtualJoystick(this);
    this.player.setJoystick(this.joystick);
    this.runState = new RunState();
    new Hud(this, this.player.hp, this.player.maxHp, this.runState.level, this.runState.xp, this.runState.xpNeeded);
    this.fx = new Fx(this);

    this.enemies = this.physics.add.group({ classType: Enemy, maxSize: POOLS.enemies });
    this.enemyProjectiles = this.physics.add.group({ classType: EnemyProjectile, maxSize: POOLS.enemyProjectiles });
    this.playerProjectiles = this.physics.add.group({ classType: Projectile, maxSize: POOLS.playerProjectiles });
    this.xpOrbs = this.physics.add.group({ classType: XpOrb, maxSize: POOLS.xpOrbs });
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.player, this.xpOrbs, (_p, orb) => this.collectOrb(orb as XpOrb));
    // Dégâts au joueur : contact avec un ennemi, ou projectile ennemi.
    this.physics.add.overlap(this.player, this.enemies, (_p, e) =>
      this.player.takeDamage((e as Enemy).def.damage, this.time.now),
    );
    this.physics.add.overlap(this.player, this.enemyProjectiles, (_p, shot) => {
      const projectile = shot as EnemyProjectile;
      if (!projectile.active) return;
      projectile.kill();
      this.player.takeDamage(projectile.damage, this.time.now);
    });
    this.physics.add.overlap(this.playerProjectiles, this.enemies, (a, b) => this.onProjectileHit(a as Projectile, b as Enemy));

    // Les projectiles ennemis disparaissent en touchant un mur.
    this.physics.world.on('worldbounds', (body: Phaser.Physics.Arcade.Body) => {
      if (body.gameObject instanceof EnemyProjectile || body.gameObject instanceof Projectile) body.gameObject.kill();
    });
    this.events.on('enemy-shoot', this.onEnemyShoot, this);
    this.events.on('enemy-died', this.onEnemyDied, this);
    this.events.on('player-died', this.onPlayerDied, this);
    this.events.on('level-up', this.onLevelUp, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off('enemy-shoot', this.onEnemyShoot, this);
      this.events.off('enemy-died', this.onEnemyDied, this);
      this.events.off('player-died', this.onPlayerDied, this);
      this.events.off('level-up', this.onLevelUp, this);
      this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);
    });

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
    this.fx.update(time);
    if (this.ended) return;
    this.player.updateMovement(time);
    const list = this.enemies.getChildren() as Enemy[];
    for (let i = 0; i < list.length; i++) {
      if (list[i].active) list[i].updateAI(time, this.player.x, this.player.y);
    }
    this.updateAutoFire(time);
    if (this.collecting) this.pullOrbs();
  }

  /** Aspire les orbes vers le héros ; quand ils sont tous ramassés, affiche l'écran de fin. */
  private pullOrbs(): void {
    const list = this.xpOrbs.getChildren() as XpOrb[];
    let remaining = 0;
    for (let i = 0; i < list.length; i++) {
      if (!list[i].active) continue;
      list[i].pullTowards(this.player.x, this.player.y, PROGRESSION.orbMagnetSpeed);
      remaining++;
    }
    if (remaining === 0 && !this.picking && this.pendingLevels.length === 0) {
      this.collecting = false;
      this.endRun('Salle terminée', '#5cff7a');
    }
  }

  private onLevelUp(level: number): void {
    this.pendingLevels.push(level);
    if (!this.picking) this.openSkillPick();
  }

  /** Ouvre le choix pour le prochain niveau en attente : met le combat en pause. */
  private openSkillPick(): void {
    const level = this.pendingLevels.shift();
    if (level === undefined) return;
    const choices = drawSkills(SKILLS, this.runState.skills, 3);
    if (choices.length === 0) {
      this.openSkillPick(); // plus rien à proposer : on passe au niveau suivant
      return;
    }
    this.picking = true;
    this.scene.pause();
    const data: SkillPickData = {
      level,
      choices,
      stacks: this.runState.skills,
      onPick: (skill) => this.applySkill(skill),
    };
    this.scene.launch(SCENES.skillPick, data);
  }

  /** Enregistre la compétence choisie. Seuls 'stat' et 'heal' ont un effet pour l'instant. */
  private applySkill(skill: SkillDef): void {
    this.runState.addSkill(skill.id);
    if (skill.effect.kind === 'stat') {
      this.player.setStats(GameState.heroStats(skillStatModifiers(this.runState.skills)));
    } else if (skill.effect.kind === 'heal') {
      this.player.heal(skill.effect.value);
    }
    this.picking = false;
    this.scene.resume();
    this.openSkillPick(); // un autre niveau gagné en même temps ?
  }

  /** Au retour du choix : le doigt a pu être relevé pendant la pause, on remet le joystick à zéro. */
  private onResume(): void {
    this.joystick.setEnabled(false);
    this.joystick.setEnabled(true);
  }

  /** Ramasse un orbe (seulement pendant l'aspiration) : XP, barre du HUD, événement 'level-up'. */
  private collectOrb(orb: XpOrb): void {
    if (!this.collecting || !orb.active) return;
    const value = orb.value;
    orb.kill();
    const gained = this.runState.addXp(value);
    const { level, xp, xpNeeded } = this.runState;
    this.events.emit('xp-changed', level, xp, xpNeeded);
    for (let i = gained - 1; i >= 0; i--) this.events.emit('level-up', level - i);
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
    // Direction du coup, lue avant kill() qui remet la vitesse à zéro.
    const v = (projectile.body as Phaser.Physics.Arcade.Body).velocity;
    const len = Math.hypot(v.x, v.y) || 1;
    const dirX = v.x / len;
    const dirY = v.y / len;
    const { damage, isCrit } = projectile;
    projectile.kill();
    enemy.takeDamage(damage, isCrit, dirX, dirY, this.time.now);
  }

  private onEnemyDied(def: EnemyDef, x: number, y: number): void {
    this.runState.gold += def.gold;
    (this.xpOrbs.get(x, y) as XpOrb | null)?.spawn(x, y, def.xp);
    this.enemiesAlive--;
    if (this.enemiesAlive <= 0 && !this.ended) this.collecting = true;
  }

  private onPlayerDied(): void {
    if (!this.ended) this.endRun('Défaite', '#d94b4b');
  }

  /** Écran de fin (défaite ou salle terminée) : fige le jeu et propose de revenir au menu. */
  private endRun(title: string, color: string): void {
    this.ended = true;
    this.physics.pause();
    this.joystick.setEnabled(false);
    this.player.setVelocity(0, 0);
    this.player.setAlpha(1);

    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65).setDepth(2000);
    this.add.text(cx, GAME_HEIGHT / 2 - 100, title, { fontSize: '72px', color, fontStyle: 'bold' }).setOrigin(0.5).setDepth(2001);
    this.add
      .text(cx, GAME_HEIGHT / 2 + 80, '  MENU  ', {
        fontSize: '48px',
        color: '#14111a',
        backgroundColor: COLORS.gold,
        padding: { x: 24, y: 20 },
      })
      .setOrigin(0.5)
      .setDepth(2001)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start(SCENES.menu));
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
        const enemy = this.enemies.get(x, y) as Enemy | null;
        if (!enemy) continue; // pool plein : on ne compte que les ennemis réellement créés
        enemy.spawn(def, x, y, this.time.now);
        this.enemiesAlive++;
      }
    }
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
