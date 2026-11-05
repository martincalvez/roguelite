import { describe, expect, it } from 'vitest';
import { RARITY_ORDER } from '../config';
import { CHAPTERS, CHESTS, COMBAT, ENEMIES, HEROES, ITEMS, LOOT, PASSIVES, PROGRESSION, SKILLS, TALENTS, UPGRADE } from './index';

const ids = <T extends { id: string }>(list: T[]) => list.map((x) => x.id);

describe('identifiants', () => {
  it.each([
    ['objets', ITEMS],
    ['compétences', SKILLS],
    ['ennemis', ENEMIES],
    ['chapitres', CHAPTERS],
    ['héros', HEROES],
    ['passifs', PASSIVES],
    ['talents', TALENTS],
    ['coffres', CHESTS],
  ])('%s : pas d\'identifiant en double', (_name, list) => {
    const all = ids(list as { id: string }[]);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('références entre fichiers', () => {
  const passiveIds = new Set(ids(PASSIVES));
  const enemyIds = new Set(ids(ENEMIES));

  it('les passifs de rareté des objets existent, à des raretés valides', () => {
    for (const item of ITEMS) {
      for (const [rarity, passiveId] of Object.entries(item.rarityPassives ?? {})) {
        expect(RARITY_ORDER, `${item.id}`).toContain(rarity);
        expect(passiveIds.has(passiveId as string), `${item.id} → ${passiveId}`).toBe(true);
      }
    }
  });

  it('les passifs de héros existent', () => {
    for (const hero of HEROES) if (hero.passive) expect(passiveIds.has(hero.passive), hero.id).toBe(true);
  });

  it('chaque familier a une apparence et une palette valides', () => {
    const pets = ITEMS.filter((item) => item.slot === 'pet');
    expect(pets.length).toBeGreaterThan(0);
    for (const pet of pets) {
      expect(pet.petAppearance, pet.id).toBeDefined();
      expect(['owl', 'dragon', 'spirit'], pet.id).toContain(pet.petAppearance?.form);
      expect(pet.petAppearance?.bodyColor, pet.id).toMatch(/^#[0-9a-f]{6}$/i);
      expect(pet.petAppearance?.accentColor, pet.id).toMatch(/^#[0-9a-f]{6}$/i);
      expect(pet.petAppearance?.eyeColor, pet.id).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('chaque salle ne contient que des ennemis connus, en nombre positif', () => {
    for (const chapter of CHAPTERS) {
      chapter.rooms.forEach((room, i) => {
        for (const g of room.enemies ?? []) {
          expect(enemyIds.has(g.id), `${chapter.id} salle ${i + 1} : ${g.id}`).toBe(true);
          expect(g.count).toBeGreaterThan(0);
        }
        if (room.type === 'combat' || room.type === 'miniboss' || room.type === 'boss') {
          expect((room.enemies ?? []).length, `${chapter.id} salle ${i + 1} sans ennemi`).toBeGreaterThan(0);
        }
      });
    }
  });

  it('la compétence du soin de l\'ange existe', () => {
    expect(ids(SKILLS)).toContain('soin');
  });

  it('un héros de départ débloqué gratuitement existe', () => {
    expect(HEROES.some((h) => h.unlockCostGems === 0)).toBe(true);
  });
});

describe('cohérence des valeurs', () => {
  it('ennemis : PV, vitesse et rayon positifs ; tireurs avec distance ; boss avec configuration', () => {
    for (const e of ENEMIES) {
      expect(e.hp, e.id).toBeGreaterThan(0);
      expect(e.damage, e.id).toBeGreaterThan(0);
      expect(e.radius, e.id).toBeGreaterThan(0);
      expect(e.color, e.id).toMatch(/^#[0-9a-f]{6}$/i);
      if (e.behavior === 'shooter' || e.behavior === 'spreader') {
        expect(e.keepDistance, e.id).toBeGreaterThan(0);
        expect(e.fireRate, e.id).toBeGreaterThan(0);
        expect(e.projectileSpeed, e.id).toBeGreaterThan(0);
      }
      if (e.behavior === 'boss') expect(e.boss, e.id).toBeDefined();
    }
  });

  it('chapitres : une salle d\'ange ne contient pas d\'ennemis ; difficulté positive ; se finit par un boss', () => {
    for (const chapter of CHAPTERS) {
      expect(chapter.difficulty).toBeGreaterThan(0);
      for (const room of chapter.rooms) {
        expect(room.difficulty ?? 1).toBeGreaterThan(0);
        if (room.type === 'angel') expect(room.enemies ?? []).toEqual([]);
      }
      expect(chapter.rooms[chapter.rooms.length - 1].type).toBe('boss');
    }
  });

  it('talents : un coût par niveau, positif, niveau de compte requis ≥ 1', () => {
    for (const t of TALENTS) {
      expect(t.costGold, t.id).toHaveLength(t.maxLevel);
      expect(t.costGold.every((c) => c > 0), t.id).toBe(true);
      expect(t.requiredAccountLevel, t.id).toBeGreaterThanOrEqual(1);
    }
  });

  it('coffres : un prix (or ou gemmes) et au moins une rareté possible', () => {
    for (const c of CHESTS) {
      expect((c.costGold ?? 0) + (c.costGems ?? 0), c.id).toBeGreaterThan(0);
      const minIndex = c.minRarity ? RARITY_ORDER.indexOf(c.minRarity) : 0;
      const possible = RARITY_ORDER.filter((_, i) => i >= minIndex).some((r) => c.rarityWeights[r] > 0);
      expect(possible, c.id).toBe(true);
    }
  });

  it('compétences : poids et stacks maximum positifs', () => {
    for (const s of SKILLS) {
      expect(s.weight, s.id).toBeGreaterThan(0);
      expect(s.maxStacks, s.id).toBeGreaterThanOrEqual(1);
    }
  });

  it('butin : poids de raretés et de nombres d\'objets utilisables', () => {
    expect(LOOT.itemCountWeights.some((w) => w > 0)).toBe(true);
    expect(RARITY_ORDER.some((r) => LOOT.rarityWeights[r] > 0)).toBe(true);
    expect(LOOT.scrollCountWeights.some((w) => w > 0)).toBe(true);
  });

  it('progression, amélioration et combat : valeurs sensées', () => {
    expect(PROGRESSION.xpPerLevel.every((x) => x > 0)).toBe(true);
    expect(PROGRESSION.accountXpPerLevel.every((x) => x > 0)).toBe(true);
    expect(UPGRADE.goldBase).toBeGreaterThan(0);
    expect(UPGRADE.goldGrowth).toBeGreaterThanOrEqual(1);
    for (const r of RARITY_ORDER) expect(UPGRADE.maxLevelByRarity[r]).toBeGreaterThan(1);
    expect(COMBAT.roomDamageShare).toBeGreaterThanOrEqual(0);
    expect(COMBAT.roomDamageShare).toBeLessThanOrEqual(1);
  });
});
