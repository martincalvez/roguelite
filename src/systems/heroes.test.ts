import { describe, expect, it } from 'vitest';
import { canUnlockHero } from './heroes';

const hero = { id: 'seren', unlockCostGems: 300 } as const;

describe('déblocage des héros', () => {
  it('autorise le déblocage quand le joueur a assez de gemmes', () => {
    expect(canUnlockHero(hero, ['aldric'], 300)).toBe(true);
    expect(canUnlockHero(hero, ['aldric'], 420)).toBe(true);
  });

  it('refuse si les gemmes manquent ou si le héros est déjà débloqué', () => {
    expect(canUnlockHero(hero, ['aldric'], 299)).toBe(false);
    expect(canUnlockHero(hero, ['aldric', 'seren'], 900)).toBe(false);
  });

  it('permet de débloquer un héros gratuit', () => {
    expect(canUnlockHero({ id: 'aldric', unlockCostGems: 0 }, [], 0)).toBe(true);
  });
});
