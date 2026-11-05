import { describe, expect, it } from 'vitest';
import { getPassive, getSkill } from '../data';
import { fixedRng, seededRng } from '../test/rng';
import type { SkillDef } from '../types';
import { computeShotEffects, drawSkills, passiveStatModifiers, skillStatModifiers } from './skills';

const skill = (id: string, weight: number, maxStacks = 3): SkillDef => ({
  id,
  name: id,
  description: '',
  weight,
  maxStacks,
  effect: { kind: 'diagonal' },
});

describe('drawSkills', () => {
  const pool = [skill('a', 10), skill('b', 5), skill('c', 5), skill('d', 1)];

  it('renvoie des compétences distinctes, au nombre demandé', () => {
    const picked = drawSkills(pool, {}, 3, seededRng(1));
    expect(picked).toHaveLength(3);
    expect(new Set(picked.map((s) => s.id)).size).toBe(3);
  });

  it('exclut les compétences qui ont atteint leur maximum de stacks', () => {
    for (let seed = 0; seed < 50; seed++) {
      const picked = drawSkills(pool, { a: 3 }, 3, seededRng(seed));
      expect(picked.map((s) => s.id)).not.toContain('a');
    }
  });

  it('renvoie moins que demandé quand le choix est épuisé', () => {
    const picked = drawSkills(pool, { a: 3, b: 3, c: 3 }, 3, seededRng(2));
    expect(picked.map((s) => s.id)).toEqual(['d']);
    expect(drawSkills(pool, { a: 3, b: 3, c: 3, d: 3 }, 3)).toEqual([]);
  });

  it('respecte les poids : un tirage bas prend la première, un tirage haut la dernière', () => {
    expect(drawSkills(pool, {}, 1, fixedRng(0))[0].id).toBe('a');
    expect(drawSkills(pool, {}, 1, fixedRng(0.999))[0].id).toBe('d');
  });

  it('les compétences lourdes sortent nettement plus souvent', () => {
    const rng = seededRng(42);
    const counts: Record<string, number> = { a: 0, d: 0 };
    for (let i = 0; i < 4000; i++) {
      const id = drawSkills(pool, {}, 1, rng)[0].id;
      if (id in counts) counts[id]++;
    }
    expect(counts.a).toBeGreaterThan(counts.d * 5);
  });
});

describe('computeShotEffects', () => {
  it('commence sans effet', () => {
    expect(computeShotEffects({}, [])).toEqual({
      multishot: 0,
      diagonal: false,
      rear: false,
      pierce: 0,
      ricochet: 0,
      burn: null,
      freeze: null,
      orb: null,
    });
  });

  it('cumule les stacks des compétences', () => {
    const multishot = getSkill('tir_multiple').effect;
    if (multishot.kind !== 'multishot') throw new Error('donnée inattendue');
    const fx = computeShotEffects({ tir_multiple: 2 }, []);
    expect(fx.multishot).toBe(multishot.value * 2);
  });

  it('active diagonale et arrière', () => {
    const fx = computeShotEffects({ tir_diagonal: 1, tir_arriere: 1 }, []);
    expect(fx.diagonal).toBe(true);
    expect(fx.rear).toBe(true);
  });

  it('ajoute les passifs (une fois chacun) à ceux des compétences', () => {
    const passive = getPassive('fleche_bonus').effect;
    if (passive.kind !== 'multishot') throw new Error('donnée inattendue');
    const fx = computeShotEffects({ tir_multiple: 1 }, ['fleche_bonus']);
    expect(fx.multishot).toBe(1 + passive.value);
  });

  it('brûlure : on garde la meilleure, elle ne se cumule pas', () => {
    const fromSkill = getSkill('flamme').effect;
    const fromPassive = getPassive('feu_inne').effect;
    if (fromSkill.kind !== 'burn' || fromPassive.kind !== 'burn') throw new Error('donnée inattendue');
    const fx = computeShotEffects({ flamme: 1 }, ['feu_inne']);
    expect(fx.burn?.dps).toBe(Math.max(fromSkill.dps, fromPassive.dps));
  });

  it('orbes : le nombre se cumule avec les stacks', () => {
    const orb = getSkill('orbe').effect;
    if (orb.kind !== 'orb') throw new Error('donnée inattendue');
    expect(computeShotEffects({ orbe: 2 }, []).orb?.count).toBe(orb.count * 2);
  });
});

describe('modificateurs de stats', () => {
  it('compétences : valeur × stacks, seulement pour les compétences de stats', () => {
    const mods = skillStatModifiers({ force: 3, tir_multiple: 2 });
    expect(mods).toHaveLength(1);
    expect(mods[0].stat).toBe('attack');
    const force = getSkill('force').effect;
    if (force.kind !== 'stat') throw new Error('donnée inattendue');
    expect(mods[0].value).toBeCloseTo(force.modifiers[0].value * 3);
  });

  it('passifs de type stat uniquement', () => {
    expect(passiveStatModifiers(['arc_affute']).map((m) => m.stat)).toEqual(['attackSpeed']);
    expect(passiveStatModifiers(['fleche_bonus', 'feu_inne'])).toEqual([]);
  });
});
