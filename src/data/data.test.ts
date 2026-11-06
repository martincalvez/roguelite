import { describe, expect, it } from 'vitest';
import { ARENA, RARITY_ORDER } from '../config';
import { ARENA_DECOR, ARENA_TEMPLATES, CHAPTERS, CHESTS, COMBAT, ENCOUNTERS, ENEMIES, HEROES, ITEMS, LOOT, PASSIVES, PROGRESSION, SKILLS, SURVIVAL, TALENTS, UPGRADE } from './index';

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
    ['plans de salle', ARENA_TEMPLATES],
  ])('%s : pas d\'identifiant en double', (_name, list) => {
    const all = ids(list as { id: string }[]);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('références entre fichiers', () => {
  const passiveIds = new Set(ids(PASSIVES));
  const enemyIds = new Set(ids(ENEMIES));
  const encounterIds = new Set(ids(ENCOUNTERS.profiles));

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

  it('chaque profil de rencontre et chaque référence de vague existent', () => {
    expect(encounterIds.size).toBe(ENCOUNTERS.profiles.length);
    for (const id of [...ENCOUNTERS.campaignProfiles, ...ENCOUNTERS.survivalProfiles, ENCOUNTERS.bossProfile]) {
      expect(encounterIds.has(id), id).toBe(true);
    }
    for (const chapter of CHAPTERS) {
      for (const room of chapter.rooms) if (room.encounter) expect(encounterIds.has(room.encounter), room.encounter).toBe(true);
    }
    for (const id of SURVIVAL.encounterProfiles) expect(encounterIds.has(id), id).toBe(true);
  });

  it('chaque chapitre a 20 salles, deux salles d’ange, un mini-boss et un boss final', () => {
    for (const chapter of CHAPTERS) {
      expect(chapter.rooms, chapter.id).toHaveLength(20);
      expect(chapter.rooms[4].type, chapter.id).toBe('angel');
      expect(chapter.rooms[9].type, chapter.id).toBe('miniboss');
      expect(chapter.rooms[14].type, chapter.id).toBe('angel');
      expect(chapter.rooms[19].type, chapter.id).toBe('boss');
      expect(chapter.visual, chapter.id).toBeDefined();
      for (const color of Object.values(chapter.visual)) expect(color, chapter.id).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('la compétence du soin de l\'ange existe', () => {
    expect(ids(SKILLS)).toContain('soin');
  });

  it('un héros de départ débloqué gratuitement existe', () => {
    expect(HEROES.some((h) => h.unlockCostGems === 0)).toBe(true);
  });

  it('chaque héros a une apparence et un coût de déblocage valide', () => {
    for (const hero of HEROES) {
      expect(hero.unlockCostGems, hero.id).toBeGreaterThanOrEqual(0);
      expect(['ranger', 'mage'], hero.id).toContain(hero.appearance.form);
      expect(hero.appearance.outfitColor, hero.id).toMatch(/^#[0-9a-f]{6}$/i);
      expect(hero.appearance.accentColor, hero.id).toMatch(/^#[0-9a-f]{6}$/i);
      expect(hero.appearance.hairColor, hero.id).toMatch(/^#[0-9a-f]{6}$/i);
      expect(hero.appearance.eyeColor, hero.id).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('cohérence des valeurs', () => {
  it('décor d’arène : cases, couverture et chances dans des bornes valides', () => {
    expect(ARENA_DECOR.cell).toBeGreaterThan(0);
    expect(ARENA_DECOR.obstacleCoverage).toBeGreaterThanOrEqual(0);
    expect(ARENA_DECOR.obstacleCoverage).toBeLessThan(1);
    expect(ARENA_DECOR.obstacleMinCells).toBeGreaterThan(0);
    expect(ARENA_DECOR.obstacleMaxCells).toBeGreaterThanOrEqual(ARENA_DECOR.obstacleMinCells);
    expect(ARENA_DECOR.obstacleInset).toBeGreaterThanOrEqual(0);
    expect(ARENA_DECOR.spawnClearance).toBeGreaterThan(0);
    expect(ARENA_DECOR.doorClearance).toBeGreaterThan(0);
    for (const chance of [ARENA_DECOR.stonePatchChance, ARENA_DECOR.waterPatchChance]) {
      expect(chance).toBeGreaterThanOrEqual(0);
      expect(chance).toBeLessThanOrEqual(1);
    }
  });

  it('plans de salle : poids, zones et blocs sont valides', () => {
    const columns = Math.ceil(ARENA.width / ARENA_DECOR.cell);
    const rows = Math.ceil(ARENA.height / ARENA_DECOR.cell);
    expect(ARENA_TEMPLATES.length).toBeGreaterThanOrEqual(8);
    expect(ARENA_TEMPLATES.length).toBeLessThanOrEqual(12);
    for (const template of ARENA_TEMPLATES) {
      expect(template.weight, template.id).toBeGreaterThan(0);
      for (const zone of [...template.tiles, ...template.blocks]) {
        expect(zone.col, template.id).toBeGreaterThanOrEqual(0);
        expect(zone.row, template.id).toBeGreaterThanOrEqual(0);
        expect(zone.width, template.id).toBeGreaterThan(0);
        expect(zone.height, template.id).toBeGreaterThan(0);
        expect(zone.col + zone.width, template.id).toBeLessThanOrEqual(columns);
        expect(zone.row + zone.height, template.id).toBeLessThanOrEqual(rows);
      }
      for (const tile of template.tiles) expect(['stone', 'water'], template.id).toContain(tile.kind);
    }
  });

  it('rencontres : chaque profil commence immédiatement et répartit tout le groupe', () => {
    const patterns = ['ahead', 'flanks', 'behind', 'surround'];
    for (const profile of ENCOUNTERS.profiles) {
      expect(profile.waves.length, profile.id).toBeGreaterThan(0);
      expect(profile.waves[0].delayMs, profile.id).toBe(0);
      expect(profile.waves.reduce((sum, wave) => sum + wave.share, 0), profile.id).toBeCloseTo(1);
      for (const wave of profile.waves) {
        expect(wave.delayMs, profile.id).toBeGreaterThanOrEqual(0);
        expect(wave.share, profile.id).toBeGreaterThan(0);
        expect(patterns, profile.id).toContain(wave.spawnPattern);
      }
    }
  });

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
      if (s.repeatable) expect(s.effect.kind, s.id).toBe('stat');
    }
  });

  it('butin : poids de raretés et de nombres d\'objets utilisables', () => {
    expect(LOOT.itemCountWeights.some((w) => w > 0)).toBe(true);
    expect(RARITY_ORDER.some((r) => LOOT.rarityWeights[r] > 0)).toBe(true);
    expect(LOOT.scrollCountWeights.some((w) => w > 0)).toBe(true);
  });

  it('progression, amélioration et combat : valeurs sensées', () => {
    expect(PROGRESSION.xpPerLevel.every((x) => x > 0)).toBe(true);
    expect(PROGRESSION.xpGrowthAfterTable).toBeGreaterThan(1);
    expect(PROGRESSION.accountXpPerLevel.every((x) => x > 0)).toBe(true);
    expect(UPGRADE.goldBase).toBeGreaterThan(0);
    expect(UPGRADE.goldGrowth).toBeGreaterThanOrEqual(1);
    for (const r of RARITY_ORDER) expect(UPGRADE.maxLevelByRarity[r]).toBeGreaterThan(1);
    expect(COMBAT.roomDamageShare).toBeGreaterThanOrEqual(0);
    expect(COMBAT.roomDamageShare).toBeLessThanOrEqual(1);
  });
});
