import Phaser from 'phaser';
import { SCENES } from '../config';
import { COMBAT, getSkill, SKILLS } from '../data';
import type { SkillPickData } from '../scenes/SkillPickScene';
import { GameState } from '../state/GameState';
import { drawSkills, skillStatModifiers } from '../systems/skills';
import type { SkillDef } from '../types';
import type { RunContext } from './RunContext';
import type { ShotController } from './ShotController';

/**
 * Choix de compétence : à chaque niveau gagné (événement 'level-up') et dans la salle de l'ange,
 * met le combat en pause, propose les cartes puis applique le choix.
 */
export class SkillFlow {
  private pendingLevels: number[] = []; // niveaux gagnés dont le choix est à faire
  private picking = false;
  private angelPending = false; // salle de l'ange : le choix est en cours

  constructor(
    private readonly ctx: RunContext,
    private readonly shots: ShotController,
    private readonly onAngelDone: () => void,
  ) {
    const events = ctx.scene.events;
    events.on('level-up', this.onLevelUp, this);
    events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);
    events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      events.off('level-up', this.onLevelUp, this);
      events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);
    });
  }

  /** Vrai tant qu'un choix est ouvert ou en attente. */
  get busy(): boolean {
    return this.picking || this.pendingLevels.length > 0;
  }

  /** Salle de l'ange : pas d'ennemis, soin de 40 % ou une compétence rare. */
  openAngelChoice(): void {
    const rare = SKILLS.filter((s) => s.weight <= COMBAT.angelRareMaxWeight && s.effect.kind !== 'heal');
    const choices = [getSkill('soin'), ...drawSkills(rare, this.ctx.runState.skills, 1)];
    this.angelPending = true;
    this.launch('Ange', 'Choisis une bénédiction', choices);
  }

  /** Premier geste du run : une capacité utile tout de suite, avant que les ennemis ne bougent. */
  openStartingChoice(onDone: () => void): void {
    const choices = drawSkills(SKILLS, this.ctx.runState.skills, 3);
    this.launch('PREMIER POUVOIR', 'Choisis ton départ', choices, onDone);
  }

  private onLevelUp(level: number): void {
    this.pendingLevels.push(level);
    if (!this.picking) this.openLevelChoice();
  }

  /** Ouvre le choix pour le prochain niveau en attente. */
  private openLevelChoice(): void {
    const level = this.pendingLevels.shift();
    if (level === undefined) return;
    const choices = drawSkills(SKILLS, this.ctx.runState.skills, 3);
    if (choices.length === 0) {
      this.openLevelChoice(); // plus rien à proposer : on passe au niveau suivant
      return;
    }
    this.launch(`Niveau ${level} !`, 'Choisis une compétence', choices);
  }

  private launch(title: string, subtitle: string, choices: SkillDef[], onDone?: () => void): void {
    const { scene, runState } = this.ctx;
    this.picking = true;
    scene.scene.pause();
    const data: SkillPickData = {
      title,
      subtitle,
      choices,
      stacks: runState.skills,
      onPick: (skill) => this.applySkill(skill, onDone),
    };
    scene.scene.launch(SCENES.skillPick, data);
  }

  /** Enregistre la compétence choisie. Les effets de tir et d'orbe passent par ShotController ; 'stat' et 'heal' sont appliqués ici. */
  private applySkill(skill: SkillDef, onDone?: () => void): void {
    const { runState, player, scene } = this.ctx;
    runState.addSkill(skill.id);
    this.shots.refresh();
    if (skill.effect.kind === 'stat') {
      player.setStats(GameState.heroStats(skillStatModifiers(runState.skills)));
    } else if (skill.effect.kind === 'heal') {
      player.heal(skill.effect.value);
    }
    this.picking = false;
    scene.scene.resume();
    onDone?.();
    if (this.angelPending) {
      this.angelPending = false;
      this.onAngelDone();
    }
    this.openLevelChoice(); // un autre niveau gagné en même temps ?
  }

  /** Au retour du choix : le doigt a pu être relevé pendant la pause, on remet le joystick à zéro. */
  private onResume(): void {
    this.ctx.scene.cameras.main.resetFX(); // un fondu interrompu par la pause ne doit pas rester à moitié noir
    this.ctx.joystick.setEnabled(false);
    this.ctx.joystick.setEnabled(true);
  }
}
