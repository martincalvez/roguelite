// État du run en cours (réinitialisé à chaque partie). Ne touche jamais à la sauvegarde.
import { xpToNextLevel } from '../systems/progression';

export class RunState {
  level = 1;
  xp = 0;
  /** Compétences prises : id -> nombre de stacks. */
  skills: Record<string, number> = {};
  gold = 0;
  /** Index de la salle actuelle dans le chapitre. */
  room = 0;

  get xpNeeded(): number {
    return xpToNextLevel(this.level);
  }

  addSkill(id: string): void {
    this.skills[id] = (this.skills[id] ?? 0) + 1;
  }

  /** Ajoute de l'XP ; renvoie le nombre de niveaux gagnés. */
  addXp(amount: number): number {
    this.xp += amount;
    let gained = 0;
    while (this.xp >= this.xpNeeded) {
      this.xp -= this.xpNeeded;
      this.level++;
      gained++;
    }
    return gained;
  }
}
