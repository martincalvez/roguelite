// Logique pure des compétences de run (sans Phaser).
import { getSkill } from '../data';
import type { SkillDef, StatModifier } from '../types';

/**
 * Tire `count` compétences distinctes, pondérées par `weight`, en excluant celles qui ont
 * atteint maxStacks. Renvoie moins de `count` si le choix est épuisé.
 */
export function drawSkills(
  all: SkillDef[],
  stacks: Record<string, number>,
  count: number,
  rng: () => number = Math.random,
): SkillDef[] {
  const pool = all.filter((s) => (stacks[s.id] ?? 0) < s.maxStacks);
  const picked: SkillDef[] = [];
  while (picked.length < count && pool.length > 0) {
    const total = pool.reduce((sum, s) => sum + s.weight, 0);
    let roll = rng() * total;
    let index = 0;
    while (index < pool.length - 1 && roll >= pool[index].weight) {
      roll -= pool[index].weight;
      index++;
    }
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}

/** Modificateurs de stats donnés par les compétences 'stat' prises, multipliés par leurs stacks. */
export function skillStatModifiers(stacks: Record<string, number>): StatModifier[] {
  const mods: StatModifier[] = [];
  for (const [id, count] of Object.entries(stacks)) {
    const effect = getSkill(id).effect;
    if (effect.kind !== 'stat') continue;
    for (const m of effect.modifiers) mods.push({ ...m, value: m.value * count });
  }
  return mods;
}
