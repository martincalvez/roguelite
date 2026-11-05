import Phaser from 'phaser';
import { ARENA, COLORS, FLOOR_TILE, GAME_HEIGHT, GAME_WIDTH, HUD_HEIGHT, POOLS, SCENES } from '../config';
import { CHAPTERS, COMBAT, getChapter, getEnemy, getSkill, ITEMS, LOOT, PROGRESSION, SKILLS } from '../data';
import { Enemy } from '../entities/Enemy';
import { EnemyProjectile } from '../entities/EnemyProjectile';
import { Player } from '../entities/Player';
import { OrbitOrbs } from '../entities/OrbitOrbs';
import { Projectile } from '../entities/Projectile';
import { XpOrb } from '../entities/XpOrb';
import { GameState } from '../state/GameState';
import { RunState } from '../state/RunState';
import { damageAmount, rollCrit } from '../systems/combat';
import { rollLoot } from '../systems/loot';
import { accountXpForRun } from '../systems/progression';
import { computeShotEffects, drawSkills, skillStatModifiers, type ShotEffects } from '../systems/skills';
import type { EnemyDef, RunRewards, SkillDef } from '../types';
import type { LootData } from './LootScene';
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
  private shotEffects!: ShotEffects;
  private orbs!: OrbitOrbs;
  private projectileTexture = 'projectile';
  private projectileSpeedFactor = 1;
  private weaponPierce = 0;
  private door!: Phaser.GameObjects.Rectangle;
  private doorOpen = false;
  private angelPending = false; // salle de l'ange : le choix est en cours
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
    this.doorOpen = false;
    this.angelPending = false;
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
    this.runState.passives = GameState.startingPassives();
    this.loadWeapon();
    this.refreshShotEffects();
    new Hud(this, this.player.hp, this.player.maxHp, this.runState.level, this.runState.xp, this.runState.xpNeeded, 1, getChapter(this.chapterId).rooms.length);
    this.fx = new Fx(this);

    this.enemies = this.physics.add.group({ classType: Enemy, maxSize: POOLS.enemies });
    this.enemyProjectiles = this.physics.add.group({ classType: EnemyProjectile, maxSize: POOLS.enemyProjectiles });
    this.playerProjectiles = this.physics.add.group({ classType: Projectile, maxSize: POOLS.playerProjectiles });
    this.xpOrbs = this.physics.add.group({ classType: XpOrb, maxSize: POOLS.xpOrbs });
    this.orbs = new OrbitOrbs(this);
    this.applyOrbEffect();
    this.physics.add.overlap(this.orbs.group, this.enemies, (_o, e) => this.onOrbHit(e as Enemy));
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.player, this.xpOrbs, (_p, orb) => this.collectOrb(orb as XpOrb));
    // Dégâts au joueur : contact avec un ennemi, ou projectile ennemi.
    this.physics.add.overlap(this.player, this.enemies, (_p, e) =>
      this.player.takeDamage((e as Enemy).damage, this.time.now),
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

    this.buildDoor();
    this.loadRoom(0);

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
    this.orbs.update(time, this.player.x, this.player.y);
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
      this.finishRoom();
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
      title: `Niveau ${level} !`,
      subtitle: 'Choisis une compétence',
      choices,
      stacks: this.runState.skills,
      onPick: (skill) => this.applySkill(skill),
    };
    this.scene.launch(SCENES.skillPick, data);
  }

  /** Enregistre la compétence choisie. Les effets de tir et d'orbe passent par shotEffects ; 'stat' et 'heal' sont appliqués ici. */
  private applySkill(skill: SkillDef): void {
    this.runState.addSkill(skill.id);
    this.refreshShotEffects();
    this.applyOrbEffect();
    if (skill.effect.kind === 'stat') {
      this.player.setStats(GameState.heroStats(skillStatModifiers(this.runState.skills)));
    } else if (skill.effect.kind === 'heal') {
      this.player.heal(skill.effect.value);
    }
    this.picking = false;
    this.scene.resume();
    if (this.angelPending) {
      this.angelPending = false;
      this.finishRoom();
    }
    this.openSkillPick(); // un autre niveau gagné en même temps ?
  }

  /** Au retour du choix : le doigt a pu être relevé pendant la pause, on remet le joystick à zéro. */
  private onResume(): void {
    this.cameras.main.resetFX(); // un fondu interrompu par la pause ne doit pas rester à moitié noir
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
    const target = this.nearestEnemy(this.player.x, this.player.y);
    if (!target) return;

    this.player.faceTowards(target.x, target.y);
    if (time < this.nextShotAt) return;

    const stats = this.player.stats;
    this.nextShotAt = time + 1000 / stats.attackSpeed;
    const isCrit = rollCrit(stats.critChance);
    const damage = damageAmount(stats.attack, isCrit, stats.critDamage);
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    this.fireVolley(angle, damage, isCrit);
  }

  /** Ennemi vivant le plus proche d'un point, en ignorant ceux déjà touchés par `projectile` s'il est donné. */
  private nearestEnemy(x: number, y: number, projectile?: Projectile): Enemy | null {
    const list = this.enemies.getChildren() as Enemy[];
    let best: Enemy | null = null;
    let bestDist = Infinity;
    for (let i = 0; i < list.length; i++) {
      if (!list[i].active || projectile?.hasHit(list[i])) continue;
      const d = Phaser.Math.Distance.Squared(x, y, list[i].x, list[i].y);
      if (d < bestDist) {
        bestDist = d;
        best = list[i];
      }
    }
    return best;
  }

  /** Une salve : projectiles parallèles vers l'avant, + diagonales et arrière selon les compétences. */
  private fireVolley(angle: number, damage: number, isCrit: boolean): void {
    const fx = this.shotEffects;
    const count = 1 + fx.multishot;
    const sideX = -Math.sin(angle);
    const sideY = Math.cos(angle);
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * COMBAT.multishotSpacing;
      this.shoot(this.player.x + sideX * offset, this.player.y + sideY * offset, angle, damage, isCrit);
    }
    if (fx.diagonal) {
      const spread = Phaser.Math.DegToRad(COMBAT.diagonalAngleDeg);
      this.shoot(this.player.x, this.player.y, angle - spread, damage, isCrit);
      this.shoot(this.player.x, this.player.y, angle + spread, damage, isCrit);
    }
    if (fx.rear) this.shoot(this.player.x, this.player.y, angle + Math.PI, damage, isCrit);
  }

  private shoot(x: number, y: number, angle: number, damage: number, isCrit: boolean): void {
    const projectile = this.playerProjectiles.get(x, y) as Projectile | null;
    projectile?.fire(
      x,
      y,
      angle,
      this.player.stats.projectileSpeed * this.projectileSpeedFactor,
      damage,
      isCrit,
      this.shotEffects.pierce,
      this.shotEffects.ricochet,
      this.projectileTexture,
    );
  }

  /** Recalcule les effets de tir : compétences, passifs de départ, et perforation de l'arme. */
  private refreshShotEffects(): void {
    this.shotEffects = computeShotEffects(this.runState.skills, this.runState.passives);
    this.shotEffects.pierce += this.weaponPierce;
  }

  /** Lit l'arme équipée : apparence du projectile, vitesse (bolt lent, shuriken rapide) et perforation. */
  private loadWeapon(): void {
    const weapon = GameState.equippedWeapon()?.def.weapon;
    const kind = weapon?.projectile ?? 'arrow';
    this.projectileTexture = kind === 'arrow' ? 'projectile' : `projectile-${kind}`;
    this.projectileSpeedFactor = COMBAT.projectileSpeedMultiplier[kind];
    this.weaponPierce = weapon?.pierce ?? 0;
  }

  private applyOrbEffect(): void {
    const orb = this.shotEffects.orb;
    this.orbs.setOrbs(orb?.count ?? 0, orb?.damage ?? 0);
  }

  /** Un orbe touche un ennemi : dégâts, avec un délai avant de pouvoir le retoucher. */
  private onOrbHit(enemy: Enemy): void {
    const time = this.time.now;
    if (!enemy.active || time < enemy.nextOrbHitAt) return;
    enemy.nextOrbHitAt = time + COMBAT.orbHitCooldownMs;
    const dx = enemy.x - this.player.x;
    const dy = enemy.y - this.player.y;
    const len = Math.hypot(dx, dy) || 1;
    enemy.takeDamage(this.orbs.damage, false, dx / len, dy / len, time);
  }

  private onProjectileHit(projectile: Projectile, enemy: Enemy): void {
    if (!projectile.active || !enemy.active || projectile.hasHit(enemy)) return;
    // Direction du coup, lue avant tout changement de vitesse du projectile.
    const v = (projectile.body as Phaser.Physics.Arcade.Body).velocity;
    const len = Math.hypot(v.x, v.y) || 1;
    projectile.registerHit(enemy);
    enemy.takeDamage(projectile.damage, projectile.isCrit, v.x / len, v.y / len, this.time.now);
    if (enemy.active) {
      const { burn, freeze } = this.shotEffects;
      if (burn) enemy.applyBurn(burn.dps, burn.duration, this.time.now);
      if (freeze) enemy.applyFreeze(freeze.slow, freeze.duration, this.time.now);
    }

    if (projectile.pierceLeft > 0) {
      projectile.pierceLeft--; // traverse l'ennemi
      return;
    }
    if (projectile.ricochetLeft > 0) {
      const next = this.nearestEnemy(projectile.x, projectile.y, projectile);
      if (next) {
        projectile.ricochetLeft--;
        projectile.redirect(Phaser.Math.Angle.Between(projectile.x, projectile.y, next.x, next.y));
        return;
      }
    }
    projectile.kill();
  }

  private onEnemyDied(def: EnemyDef, x: number, y: number): void {
    this.runState.gold += def.gold;
    (this.xpOrbs.get(x, y) as XpOrb | null)?.spawn(x, y, def.xp);
    this.enemiesAlive--;
    if (this.enemiesAlive <= 0 && !this.ended) this.collecting = true;
  }

  private onPlayerDied(): void {
    if (!this.ended) this.endRun(false);
  }

  /**
   * Fin du run (mort ou victoire) : fige le jeu, ajoute les récompenses à la sauvegarde (une seule fois),
   * puis passe à l'écran de butin.
   */
  private endRun(victory: boolean): void {
    this.ended = true;
    this.physics.pause();
    this.joystick.setEnabled(false);
    this.player.setVelocity(0, 0);
    this.player.setAlpha(1);

    const chapter = getChapter(this.chapterId);
    const roomCount = chapter.rooms.length;
    const roomsCleared = victory ? roomCount : this.runState.room;
    const rewards: RunRewards = {
      gold: this.runState.gold,
      accountXp: accountXpForRun(roomsCleared, victory),
      items: rollLoot(LOOT, ITEMS, victory),
      clearedChapter: victory ? CHAPTERS.findIndex((c) => c.id === chapter.id) + 1 : null,
    };
    const { levelBefore, levelAfter } = GameState.applyRunRewards(rewards);
    const data: LootData = {
      victory,
      roomReached: this.runState.room + 1,
      roomCount,
      gold: rewards.gold,
      accountXp: rewards.accountXp,
      levelBefore,
      levelAfter,
      items: rewards.items,
    };

    this.cameras.main.fadeOut(450);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENES.loot, data));
  }

  private onEnemyShoot(x: number, y: number, angle: number, speed: number, damage: number): void {
    const projectile = this.enemyProjectiles.get(x, y) as EnemyProjectile | null;
    projectile?.fire(x, y, angle, speed, damage);
  }

  /** Porte de sortie en haut de l'arène : invisible et inactive tant que la salle n'est pas vidée. */
  private buildDoor(): void {
    this.door = this.add.rectangle(GAME_WIDTH / 2, ARENA.y + 30, 150, 60, 0xffc83d).setStrokeStyle(6, COLORS.wallEdge).setDepth(10);
    this.physics.add.existing(this.door, true);
    this.door.setVisible(false);
    (this.door.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    this.tweens.add({ targets: this.door, alpha: 0.55, duration: 450, yoyo: true, repeat: -1 });
    this.physics.add.overlap(this.player, this.door, () => this.enterDoor());
  }

  private openDoor(): void {
    this.doorOpen = true;
    this.door.setVisible(true);
    (this.door.body as Phaser.Physics.Arcade.StaticBody).enable = true;
  }

  private closeDoor(): void {
    this.doorOpen = false;
    this.door.setVisible(false);
    (this.door.body as Phaser.Physics.Arcade.StaticBody).enable = false;
  }

  private enterDoor(): void {
    if (!this.doorOpen || this.ended) return;
    this.closeDoor();
    this.loadRoom(this.runState.room + 1);
  }

  /** Salle vidée (ennemis morts, orbes ramassés, choix faits) : porte ouverte, ou victoire s'il n'y a plus de salle. */
  private finishRoom(): void {
    const roomCount = getChapter(this.chapterId).rooms.length;
    if (this.runState.room >= roomCount - 1) this.endRun(true);
    else this.openDoor();
  }

  /** Charge une salle : le héros repart du bas (PV, XP et compétences conservés). */
  private loadRoom(index: number): void {
    const chapter = getChapter(this.chapterId);
    this.runState.room = index;
    this.enemiesAlive = 0;
    this.closeDoor();
    for (const group of [this.enemyProjectiles, this.playerProjectiles]) {
      for (const shot of group.getChildren() as (EnemyProjectile | Projectile)[]) if (shot.active) shot.kill();
    }
    (this.player.body as Phaser.Physics.Arcade.Body).reset(GAME_WIDTH / 2, ARENA.y + ARENA.height * 0.75);
    this.spawnRoom(index);
    this.events.emit('room-changed', index + 1, chapter.rooms.length);
    this.cameras.main.resetFX();
    this.cameras.main.fadeIn(250);
    // Le choix de l'ange attend la fin du fondu, pour qu'on voie la salle derrière.
    if (chapter.rooms[index].type === 'angel') this.time.delayedCall(300, () => this.openAngelChoice());
  }

  /** Salle de l'ange : pas d'ennemis, soin de 40 % ou une compétence rare. */
  private openAngelChoice(): void {
    const rare = SKILLS.filter((s) => s.weight <= COMBAT.angelRareMaxWeight && s.effect.kind !== 'heal');
    const choices = [getSkill('soin'), ...drawSkills(rare, this.runState.skills, 1)];
    this.angelPending = true;
    this.picking = true;
    this.scene.pause();
    const data: SkillPickData = {
      title: 'Ange',
      subtitle: 'Choisis une bénédiction',
      choices,
      stacks: this.runState.skills,
      onPick: (skill) => this.applySkill(skill),
    };
    this.scene.launch(SCENES.skillPick, data);
  }

  /** Fait apparaître les ennemis d'une salle du chapitre, dans la moitié haute de l'arène. */
  private spawnRoom(roomIndex: number): void {
    const chapter = getChapter(this.chapterId);
    const room = chapter.rooms[roomIndex];
    const margin = 60;
    for (const group of room.enemies ?? []) {
      const def = getEnemy(group.id);
      for (let i = 0; i < group.count; i++) {
        const x = Phaser.Math.Between(ARENA.x + margin, ARENA.x + ARENA.width - margin);
        const y = Phaser.Math.Between(ARENA.y + margin, ARENA.y + ARENA.height / 2 - margin);
        const enemy = this.enemies.get(x, y) as Enemy | null;
        if (!enemy) continue; // pool plein : on ne compte que les ennemis réellement créés
        enemy.spawn(def, x, y, this.time.now, chapter.difficulty);
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
