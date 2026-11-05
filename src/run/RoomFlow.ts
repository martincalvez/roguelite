import Phaser from 'phaser';
import { ARENA, COLORS, GAME_WIDTH, POOLS } from '../config';
import { getChapter, getEnemy, PROGRESSION } from '../data';
import type { Enemy } from '../entities/Enemy';
import type { EnemyProjectile } from '../entities/EnemyProjectile';
import type { Projectile } from '../entities/Projectile';
import { XpOrb } from '../entities/XpOrb';
import type { EnemyDef } from '../types';
import type { RunContext } from './RunContext';
import type { SkillFlow } from './SkillFlow';

/**
 * Déroulement des salles : apparition des ennemis, orbes d'XP ramassés une fois la salle vidée,
 * porte de sortie, salle suivante (ou fin du chapitre).
 */
export class RoomFlow {
  private readonly xpOrbs: Phaser.Physics.Arcade.Group;
  private readonly door: Phaser.GameObjects.Rectangle;
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

    // Porte de sortie en haut de l'arène : invisible et inactive tant que la salle n'est pas vidée.
    this.door = scene.add.rectangle(GAME_WIDTH / 2, ARENA.y + 30, 150, 60, 0xffc83d).setStrokeStyle(6, COLORS.wallEdge).setDepth(10);
    scene.physics.add.existing(this.door, true);
    this.setDoor(false);
    scene.tweens.add({ targets: this.door, alpha: 0.55, duration: 450, yoyo: true, repeat: -1 });
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
    runState.room = index;
    this.enemiesAlive = 0;
    this.setDoor(false);
    for (const group of [enemyProjectiles, playerProjectiles]) {
      for (const shot of group.getChildren() as (EnemyProjectile | Projectile)[]) if (shot.active) shot.kill();
    }
    (player.body as Phaser.Physics.Arcade.Body).reset(GAME_WIDTH / 2, ARENA.y + ARENA.height * 0.75);
    this.spawnRoom(index);
    scene.events.emit('room-changed', index + 1, chapter.rooms.length);
    scene.cameras.main.resetFX();
    scene.cameras.main.fadeIn(250);
    // Le choix de l'ange attend la fin du fondu, pour qu'on voie la salle derrière.
    if (chapter.rooms[index].type === 'angel') scene.time.delayedCall(300, () => this.skills.openAngelChoice());
  }

  /** Salle vidée (ennemis morts, orbes ramassés, choix faits) : porte ouverte, ou victoire s'il n'y a plus de salle. */
  finishRoom(): void {
    const roomCount = getChapter(this.ctx.chapterId).rooms.length;
    if (this.ctx.runState.room >= roomCount - 1) this.endRun(true);
    else this.setDoor(true);
  }

  /** Fait apparaître les ennemis d'une salle du chapitre, dans la moitié haute de l'arène. */
  private spawnRoom(roomIndex: number): void {
    const { scene, enemies } = this.ctx;
    const chapter = getChapter(this.ctx.chapterId);
    const room = chapter.rooms[roomIndex];
    const margin = 60;
    for (const group of room.enemies ?? []) {
      const def = getEnemy(group.id);
      for (let i = 0; i < group.count; i++) {
        const x = Phaser.Math.Between(ARENA.x + margin, ARENA.x + ARENA.width - margin);
        const y = Phaser.Math.Between(ARENA.y + margin, ARENA.y + ARENA.height / 2 - margin);
        const enemy = enemies.get(x, y) as Enemy | null;
        if (!enemy) continue; // pool plein : on ne compte que les ennemis réellement créés
        enemy.spawn(def, x, y, scene.time.now, chapter.difficulty);
        this.enemiesAlive++;
      }
    }
  }

  private setDoor(open: boolean): void {
    this.doorOpen = open;
    this.door.setVisible(open);
    (this.door.body as Phaser.Physics.Arcade.StaticBody).enable = open;
  }

  private enterDoor(): void {
    if (!this.doorOpen || this.ctx.runState.ended) return;
    this.setDoor(false);
    this.load(this.ctx.runState.room + 1);
  }

  private onEnemyDied(def: EnemyDef, x: number, y: number): void {
    this.ctx.runState.gold += def.gold;
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
      if (!list[i].active) continue;
      list[i].pullTowards(player.x, player.y, PROGRESSION.orbMagnetSpeed);
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
