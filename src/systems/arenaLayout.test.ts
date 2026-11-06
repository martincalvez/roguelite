import { describe, expect, it } from 'vitest';
import { ARENA_DECOR, ARENA_TEMPLATES } from '../data';
import { seededRng } from '../test/rng';
import { buildArenaLayout, connected, pickEnemySpawn, type ArenaLayout, type ArenaRect } from './arenaLayout';

// Arène logique du jeu : 680 × 1140 (voir src/config.ts), départ à 75 % de la hauteur.
const WIDTH = 680;
const HEIGHT = 1140;
const SPAWN = { x: WIDTH / 2, y: HEIGHT * 0.75 };
const DOOR = { x: WIDTH / 2, y: 0 };

const build = (seed = 7) => buildArenaLayout(ARENA_DECOR, WIDTH, HEIGHT, SPAWN, {
  rng: seededRng(seed),
  templates: ARENA_TEMPLATES,
});

const spawnZone: ArenaRect = {
  x: SPAWN.x - ARENA_DECOR.spawnClearance,
  y: SPAWN.y - ARENA_DECOR.spawnClearance,
  width: ARENA_DECOR.spawnClearance * 2,
  height: ARENA_DECOR.spawnClearance * 2,
};
const doorZone: ArenaRect = {
  x: DOOR.x - ARENA_DECOR.doorClearance,
  y: DOOR.y,
  width: ARENA_DECOR.doorClearance * 2,
  height: ARENA_DECOR.doorClearance,
};

function overlaps(a: ArenaRect, b: ArenaRect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

function cellOf(layout: ArenaLayout, point: { x: number; y: number }) {
  return { col: Math.floor(point.x / layout.cell), row: Math.floor(point.y / layout.cell) };
}

describe('disposition du décor', () => {
  it('couvre toute l’arène en cases carrées', () => {
    const layout = build();
    expect(layout.cols).toBe(Math.ceil(WIDTH / ARENA_DECOR.cell));
    expect(layout.rows).toBe(Math.ceil(HEIGHT / ARENA_DECOR.cell));
    expect(layout.tiles).toHaveLength(layout.cols * layout.rows);
    expect(layout.blocked).toHaveLength(layout.tiles.length);
    for (const tile of layout.tiles) expect(['grass', 'stone', 'water']).toContain(tile);
  });

  it('laisse le départ du héros et la porte de sortie dégagés', () => {
    const layout = build();
    expect(layout.obstacles.length).toBeGreaterThan(0);
    const spawnCell = cellOf(layout, SPAWN);
    expect(layout.blocked[spawnCell.row * layout.cols + spawnCell.col]).toBe(false);
    for (const block of layout.obstacles) {
      expect(overlaps(block, spawnZone), `bloc au départ ${JSON.stringify(block)}`).toBe(false);
      expect(overlaps(block, doorZone), `bloc devant la porte ${JSON.stringify(block)}`).toBe(false);
    }
    expect(connected(layout, SPAWN, DOOR)).toBe(true);
  });

  it('laisse toujours un chemin praticable du départ à la porte', () => {
    for (let seed = 1; seed <= 25; seed++) {
      expect(connected(build(seed), SPAWN, DOOR), `graine ${seed}`).toBe(true);
    }
  });

  it('garde les blocs dans l’arène', () => {
    for (const block of build(3).obstacles) {
      expect(block.width).toBeGreaterThan(0);
      expect(block.height).toBeGreaterThan(0);
      expect(block.x).toBeGreaterThanOrEqual(0);
      expect(block.y).toBeGreaterThanOrEqual(0);
      expect(block.x + block.width).toBeLessThanOrEqual(WIDTH);
      expect(block.y + block.height).toBeLessThanOrEqual(HEIGHT);
    }
  });

  it('ne place aucun bloc quand la couverture est nulle', () => {
    const layout = buildArenaLayout({ ...ARENA_DECOR, obstacleCoverage: 0 }, WIDTH, HEIGHT, SPAWN, seededRng(1));
    expect(layout.obstacles).toHaveLength(0);
    expect(layout.blocked.some(Boolean)).toBe(false);
  });

  it('reste identique à graine égale', () => {
    const a = build(11);
    const b = build(11);
    expect(b.obstacles).toEqual(a.obstacles);
    expect(b.tiles).toEqual(a.tiles);
  });

  it('construit chaque plan de salle sans enfermer le héros ni la porte', () => {
    for (const template of ARENA_TEMPLATES) {
      const layout = buildArenaLayout(ARENA_DECOR, WIDTH, HEIGHT, SPAWN, {
        rng: seededRng(4),
        templates: [template],
      });
      expect(layout.templateId).toBe(template.id);
      expect(layout.obstacles.length, template.id).toBeGreaterThan(0);
      expect(connected(layout, SPAWN, DOOR), template.id).toBe(true);
    }
  });

  it('ne répète pas le plan exclu quand une autre salle est disponible', () => {
    const layout = buildArenaLayout(ARENA_DECOR, WIDTH, HEIGHT, SPAWN, {
      rng: seededRng(1),
      templates: ARENA_TEMPLATES,
      excludedTemplateId: ARENA_TEMPLATES[0].id,
    });
    expect(layout.templateId).not.toBe(ARENA_TEMPLATES[0].id);
  });

  it('choisit des apparitions réparties dans l’arène, hors des blocs et accessibles', () => {
    const layout = build(5);
    const rng = seededRng(99);
    const occupied: { x: number; y: number }[] = [];
    let hasSpawnBehind = false;
    for (let i = 0; i < 10; i++) {
      const point = pickEnemySpawn(layout, {
        rng,
        minDistance: ARENA_DECOR.enemySpawnMinDistance,
        minSeparation: ARENA_DECOR.enemySpawnSeparation,
        occupied,
      });
      expect(point).not.toBeNull();
      const { col, row } = cellOf(layout, point!);
      expect(layout.blocked[row * layout.cols + col]).toBe(false);
      expect(connected(layout, SPAWN, point!)).toBe(true);
      expect(Math.hypot(point!.x - SPAWN.x, point!.y - SPAWN.y)).toBeGreaterThanOrEqual(ARENA_DECOR.enemySpawnMinDistance);
      hasSpawnBehind ||= point!.y > SPAWN.y;
      occupied.push(point!);
    }
    expect(hasSpawnBehind).toBe(true);
  });
});
