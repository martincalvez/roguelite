import Phaser from 'phaser';
import { ARENA, GAME_WIDTH, PLAYER_SPAWN, POOLS } from '../config';
import { COMBAT, getChapter, getEnemy, HEROES, PROGRESSION, SURVIVAL } from '../data';
import type { Enemy } from '../entities/Enemy';
import type { EnemyProjectile } from '../entities/EnemyProjectile';
import type { Projectile } from '../entities/Projectile';
import { XpOrb } from '../entities/XpOrb';
import { GameState } from '../state/GameState';
import { pickEnemySpawn } from '../systems/arenaLayout';
import { survivalRoom } from '../systems/survival';
import type { EnemyDef } from '../types';
import type { RunContext } from './RunContext';
import type { SkillFlow } from './SkillFlow';

/**
 * Convertit la puissance relative du héros en pression de salle. Les renforts
 * ne s'appliquent ni au chapitre 1 ni au mode Survie, dont la progression a
 * déjà sa propre courbe.
 */
function roomThreat(chapterDifficulty: number, roomScale: number, powerRatio: number, survival: boolean): {
  hpScale: number;
  damageScale: number;
  extraEnemiesPerGroup: number;
} {
  const excessPower = Math.min(Math.max(powerRatio - 1, 0), COMBAT.gearScalingCap);
  const hpScale = chapterDifficulty * roomScale * (1 + excessPower * COMBAT.gearHpScalePerPower);
  const damageScale = chapterDifficulty * (1 + (roomScale - 1) * COMBAT.roomDamageShare)
    * (1 + excessPower * COMBAT.gearDamageScalePerPower);
  const chapterPressure = Math.max(0, chapterDifficulty - 1);
  const extraEnemiesPerGroup = survival
    ? 0
    : Math.min(
      Math.ceil(chapterDifficulty),
      Math.floor(chapterPressure * (1 + excessPower) * Math.sqrt(roomScale)),
    );

  return { hpScale, damageScale, extraEnemiesPerGroup };
}

/**
 * Déroulement des salles : apparition des ennemis, orbes d'XP ramassés une fois la salle vidée,
 * porte de sortie, salle suivante (ou fin du chapitre).
 */
export class RoomFlow {
  private readonly xpOrbs: Phaser.Physics.Arcade.Group;
  private readonly door: Phaser.GameObjects.Rectangle;
  private readonly doorArt: Phaser.GameObjects.Container;
  private readonly doorLabel: Phaser.GameObjects.Text;
  private doorOpen = false;
  private enemiesAlive = 0;
  private collecting = false; // salle vidée : les orbes d'XP sont aspirés vers le héros

  constructor(
    private readonly ctx: RunContext,
    private readonly skills: SkillFlow,
    private readonly endRun: (victory: boolean) => void,
  ) {
    const { scene, player } = ctx;
    this.xpOrbs = scene.physics.add.group({ classType: XpOrb, maxSize: POOLS.xpOrbs });
    scene.physics.add.overlap(player, this.xpOrbs, (_p, orb) => this.collectOrb(orb as XpOrb));

    // Porte de sortie en haut de l'arène : une vraie arche lumineuse, pas un simple rectangle.
    // Le collider est volontairement plus petit que l'illustration pour une entrée confortable au doigt.
    const doorX = GAME_WIDTH / 2;
    const doorY = ARENA.y + 42;
    this.door = scene.add.rectangle(doorX, doorY, 160, 58, 0xffffff, 0).setDepth(10);
    scene.physics.add.existing(this.door, true);
    const art = scene.add.graphics();
    art.fillStyle(0x352054, 0.9).fillRoundedRect(-104, -43, 208, 86, 24);
    art.lineStyle(7, 0x1b102c, 1).strokeRoundedRect(-104, -43, 208, 86, 24);
    art.fillStyle(0xb34be6, 0.96).fillRoundedRect(-94, -34, 188, 68, 18);
    art.fillStyle(0x6936a6, 0.96).fillRoundedRect(-80, -27, 160, 55, 14);
    art.lineStyle(4, 0xffdf56, 1).strokeRoundedRect(-94, -34, 188, 68, 18);
    art.fillStyle(0xfff3a2, 0.9).fillTriangle(-60, 8, -43, -15, -26, 8);
    art.fillTriangle(26, 8, 43, -15, 60, 8);
    art.fillStyle(0xffffff, 0.42).fillRoundedRect(-66, -22, 132, 8, 4);
    this.doorLabel = scene.add.text(0, 1, 'SORTIE', {
      fontSize: '25px', color: '#fff8df', fontStyle: 'bold', stroke: '#24123f', strokeThickness: 6,
    }).setOrigin(0.5);
    this.doorArt = scene.add.container(doorX, doorY, [art, this.doorLabel]).setDepth(11);
    const halo = scene.add.ellipse(0, 0, 226, 104, 0xe86dff, 0.18);
    this.doorArt.addAt(halo, 0);
    this.setDoor(false);
    scene.tweens.add({ targets: this.doorArt, scaleX: 1.04, scaleY: 1.04, alpha: 0.8, duration: 550, yoyo: true, repeat: -1 });
    scene.physics.add.overlap(player, this.door, () => this.enterDoor());

    scene.events.on('enemy-died', this.onEnemyDied, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off('enemy-died', this.onEnemyDied, this));
  }

  /** À appeler à chaque frame : aspire les orbes d'XP quand la salle est vidée. */
  update(): void {
    if (this.collecting) this.pullOrbs();
  }

  /** Charge une salle : le héros repart du bas (PV, XP et compétences conservés). */
  load(index: number): void {
    const { scene, player, runState, enemyProjectiles, playerProjectiles } = this.ctx;
    const chapter = getChapter(this.ctx.chapterId);
    const room = this.ctx.mode === 'survival' ? survivalRoom(index + 1) : chapter.rooms[index];
    runState.room = index;
    this.enemiesAlive = 0;
    this.collecting = false;
    this.setDoor(false);
    for (const group of [enemyProjectiles, playerProjectiles]) {
      for (const shot of group.getChildren() as (EnemyProjectile | Projectile)[]) if (shot.active) shot.kill();
    }
    // Une transition de salle ne doit jamais conserver de gemme visuelle ou de collider fantôme.
    for (const orb of this.xpOrbs.getChildren() as XpOrb[]) if (orb.active) orb.kill();
    (player.body as Phaser.Physics.Arcade.Body).reset(PLAYER_SPAWN.x, PLAYER_SPAWN.y);
    this.spawnRoom(index);
    scene.events.emit('room-changed', index + 1, this.roomCount());
    scene.cameras.main.resetFX();
    scene.cameras.main.fadeIn(250);
    // Le choix de l'ange attend la fin du fondu, pour qu'on voie la salle derrière.
    if (room.type === 'angel') scene.time.delayedCall(300, () => this.skills.openAngelChoice());
  }

  /** Salle vidée (ennemis morts, orbes ramassés, choix faits) : porte ouverte, ou victoire s'il n'y a plus de salle. */
  finishRoom(): void {
    const roomCount = this.roomCount();
    if (this.ctx.runState.room >= roomCount - 1) this.endRun(true);
    else this.setDoor(true);
  }

  /** Fait apparaître les ennemis d'une salle du chapitre, dans la moitié haute de l'arène, hors des blocs. */
  private spawnRoom(roomIndex: number): void {
    const { scene, enemies, arena, player } = this.ctx;
    const chapter = getChapter(this.ctx.chapterId);
    const room = this.ctx.mode === 'survival' ? survivalRoom(roomIndex + 1) : chapter.rooms[roomIndex];
    const margin = 60;
    // Les PV suivent le multiplicateur de la salle ; les dégâts n'en suivent qu'une partie.
    const roomScale = room.difficulty ?? 1;
    const base = HEROES.find((hero) => hero.id === GameState.data.selectedHero)?.base ?? HEROES[0].base;
    const offenseRatio = Math.sqrt((player.stats.attack / (base.attack + COMBAT.baselineWeaponAttack)) * (player.stats.attackSpeed / base.attackSpeed));
    const powerRatio = Math.max(offenseRatio, player.stats.maxHp / base.maxHp);
    const chapterDifficulty = this.ctx.mode === 'survival' ? 1 : chapter.difficulty;
    const threat = roomThreat(chapterDifficulty, roomScale, powerRatio, this.ctx.mode === 'survival');
    for (const group of room.enemies ?? []) {
      const def = getEnemy(group.id);
      // Les boss restent seuls. Les chapitres 2 et 3 gagnent plutôt des menaces concurrentes
      // qu'un simple sac à PV quand le joueur les surclasse par son équipement.
      const count = group.count + (def.boss ? 0 : threat.extraEnemiesPerGroup);
      for (let i = 0; i < count; i++) {
        // Case libre de la moitié haute ; à défaut (arène très remplie), tirage au hasard historique.
        const spot = pickEnemySpawn(arena);
        const x = spot ? ARENA.x + spot.x : Phaser.Math.Between(ARENA.x + margin, ARENA.x + ARENA.width - margin);
        const y = spot ? ARENA.y + spot.y : Phaser.Math.Between(ARENA.y + margin, ARENA.y + ARENA.height / 2 - margin);
        const enemy = enemies.get(x, y) as Enemy | null;
        if (!enemy) continue; // pool plein : on ne compte que les ennemis réellement créés
        enemy.spawn(def, x, y, scene.time.now, threat.hpScale, threat.damageScale);
        this.enemiesAlive++;
      }
    }
  }

  private roomCount(): number {
    return this.ctx.mode === 'survival' ? SURVIVAL.roomCount : getChapter(this.ctx.chapterId).rooms.length;
  }

  private setDoor(open: boolean): void {
    this.doorOpen = open;
    this.door.setVisible(open);
    this.doorArt.setVisible(open);
    (this.door.body as Phaser.Physics.Arcade.StaticBody).enable = open;
  }

  private enterDoor(): void {
    if (!this.doorOpen || this.ctx.runState.ended) return;
    this.setDoor(false);
    this.load(this.ctx.runState.room + 1);
  }

  private onEnemyDied(def: EnemyDef, x: number, y: number): void {
    this.ctx.runState.gold += def.gold;
    if (def.boss) this.ctx.runState.bossesKilled++;
    (this.xpOrbs.get(x, y) as XpOrb | null)?.spawn(x, y, def.xp);
    this.enemiesAlive--;
    if (this.enemiesAlive <= 0 && !this.ctx.runState.ended) this.collecting = true;
  }

  /** Aspire les orbes vers le héros ; quand ils sont tous ramassés (et les choix faits), la salle est terminée. */
  private pullOrbs(): void {
    const { player } = this.ctx;
    const list = this.xpOrbs.getChildren() as XpOrb[];
    let remaining = 0;
    for (let i = 0; i < list.length; i++) {
      const orb = list[i];
      if (!orb.active) continue;
      const playerBody = player.body as Phaser.Physics.Arcade.Body;
      const orbBody = orb.body as Phaser.Physics.Arcade.Body;
      const pickupRange = playerBody.halfWidth + orbBody.halfWidth;
      if (Phaser.Math.Distance.Between(player.x, player.y, orb.x, orb.y) <= pickupRange) {
        this.collectOrb(orb);
        continue;
      }
      orb.pullTowards(player.x, player.y, PROGRESSION.orbMagnetSpeed);
      remaining++;
    }
    if (remaining === 0 && !this.skills.busy) {
      this.collecting = false;
      this.finishRoom();
    }
  }

  /** Ramasse un orbe (seulement pendant l'aspiration) : XP, barre du HUD, événement 'level-up'. */
  private collectOrb(orb: XpOrb): void {
    if (!this.collecting || !orb.active) return;
    const { scene, runState } = this.ctx;
    const value = orb.value;
    orb.kill();
    const gained = runState.addXp(value);
    const { level, xp, xpNeeded } = runState;
    scene.events.emit('xp-changed', level, xp, xpNeeded);
    for (let i = gained - 1; i >= 0; i--) scene.events.emit('level-up', level - i);
  }
}
