import { afterEach, describe, expect, it, vi } from 'vitest';

async function freshGameState() {
  vi.resetModules();
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  });
  const { GameState } = await import('./GameState');
  return GameState;
}

afterEach(() => vi.unstubAllGlobals());

describe('GameState — héros', () => {
  it('débite les gemmes une fois et sélectionne le héros débloqué', async () => {
    const state = await freshGameState();
    state.data.gems = 450;

    expect(state.unlockHero('seren')).toBe(true);
    expect(state.data.gems).toBe(150);
    expect(state.data.unlockedHeroes).toContain('seren');
    expect(state.data.selectedHero).toBe('seren');

    expect(state.unlockHero('seren')).toBe(false);
    expect(state.data.gems).toBe(150);
    expect(state.selectHero('aldric')).toBe(true);
    expect(state.data.selectedHero).toBe('aldric');
  });

  it('ne modifie pas la sauvegarde si le joueur manque de gemmes ou choisit un héros verrouillé', async () => {
    const state = await freshGameState();
    state.data.gems = 299;

    expect(state.unlockHero('seren')).toBe(false);
    expect(state.selectHero('seren')).toBe(false);
    expect(state.data.gems).toBe(299);
    expect(state.data.unlockedHeroes).toEqual(['aldric']);
    expect(state.data.selectedHero).toBe('aldric');
  });

  it('calcule les stats d’un héros aperçu sans changer le héros sélectionné', async () => {
    const state = await freshGameState();
    const preview = state.heroStatsFor('seren');

    expect(preview.attack).toBeGreaterThan(22);
    expect(preview.maxHp).toBe(170);
    expect(state.data.selectedHero).toBe('aldric');
  });
});
