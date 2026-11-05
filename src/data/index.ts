// Point d'entrée unique des données : le code n'importe jamais un JSON directement.
import type { ChapterDef, CombatConfig, ProgressionConfig, EnemyDef, HeroDef, ItemDef, PassiveDef, SkillDef, TalentDef } from '../types';
import itemsJson from './items.json';
import skillsJson from './skills.json';
import enemiesJson from './enemies.json';
import chaptersJson from './chapters.json';
import heroesJson from './heroes.json';
import passivesJson from './passives.json';
import talentsJson from './talents.json';
import combatJson from './combat.json';
import progressionJson from './progression.json';

export const ITEMS = itemsJson as ItemDef[];
export const SKILLS = skillsJson as SkillDef[];
export const ENEMIES = enemiesJson as EnemyDef[];
export const CHAPTERS = chaptersJson as ChapterDef[];
export const HEROES = heroesJson as HeroDef[];
export const PASSIVES = passivesJson as PassiveDef[];
export const TALENTS = talentsJson as TalentDef[];
export const COMBAT = combatJson as CombatConfig;
export const PROGRESSION = progressionJson as ProgressionConfig;

function byId<T extends { id: string }>(list: T[], kind: string) {
  const map = new Map(list.map((x) => [x.id, x]));
  return (id: string): T => {
    const found = map.get(id);
    if (!found) throw new Error(`${kind} inconnu : ${id}`);
    return found;
  };
}

export const getItem = byId(ITEMS, 'Objet');
export const getSkill = byId(SKILLS, 'Compétence');
export const getEnemy = byId(ENEMIES, 'Ennemi');
export const getChapter = byId(CHAPTERS, 'Chapitre');
export const getHero = byId(HEROES, 'Héros');
export const getPassive = byId(PASSIVES, 'Passif');
export const getTalent = byId(TALENTS, 'Talent');
