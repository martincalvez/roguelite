// Logique pure des compétences de run (sans Phaser).
import { getPassive, getSkill } from '../data';
import type { SkillDef, SkillEffect, StatModifier } from '../types';

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

/** Effets cumulés qui changent la façon de tirer. */
export interface ShotEffects {
  multishot: number; // projectiles parallèles en plus
  diagonal: boolean;
  rear: boolean;
  pierce: number; // ennemis traversés
  ricochet: number; // rebonds
  burn: { dps: number; duration: number } | null; // brûlure appliquée aux ennemis touchés
  freeze: { slow: number; duration: number } | null; // ralentissement appliqué aux ennemis touchés
  orb: { count: number; damage: number } | null; // orbes protecteurs
}

/** Combine les compétences prises (× stacks) et les passifs de départ (×1) en effets de tir. */
export function computeShotEffects(stacks: Record<string, number>, passiveIds: string[]): ShotEffects {
  const out: ShotEffects = { multishot: 0, diagonal: false, rear: false, pierce: 0, ricochet: 0, burn: null, freeze: null, orb: null };
  const apply = (effect: SkillEffect, count: number): void => {
    switch (effect.kind) {
      case 'multishot':
        out.multishot += effect.value * count;
        break;
      case 'diagonal':
        out.diagonal = true;
        break;
      case 'rear':
        out.rear = true;
        break;
      case 'pierce':
        out.pierce += effect.value * count;
        break;
      case 'ricochet':
        out.ricochet += effect.value * count;
        break;
      case 'burn':
        // Pas cumulable : on garde le meilleur.
        out.burn = {
          dps: Math.max(out.burn?.dps ?? 0, effect.dps),
          duration: Math.max(out.burn?.duration ?? 0, effect.duration),
        };
        break;
      case 'freeze':
        out.freeze = {
          slow: Math.max(out.freeze?.slow ?? 0, effect.slow),
          duration: Math.max(out.freeze?.duration ?? 0, effect.duration),
        };
        break;
      case 'orb':
        out.orb = {
          count: (out.orb?.count ?? 0) + effect.count * count,
          damage: Math.max(out.orb?.damage ?? 0, effect.damage),
        };
        break;
      default:
        break; // stat, heal : traités ailleurs
    }
  };
  for (const [id, count] of Object.entries(stacks)) apply(getSkill(id).effect, count);
  for (const id of passiveIds) apply(getPassive(id).effect, 1);
  return out;
}
