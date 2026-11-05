import { describe, expect, it } from 'vitest';
import type { ArenaLayout } from './arenaLayout';
import { arenaLineOfSight, findArenaPath } from './navigation';

const layout: ArenaLayout = {
  cell: 100,
  cols: 5,
  rows: 4,
  width: 500,
  height: 400,
  tiles: new Array(20).fill('grass'),
  blocked: new Array(20).fill(false),
  obstacles: [{ x: 205, y: 105, width: 90, height: 90 }],
  spawn: { x: 50, y: 350 },
};

describe('navigation dans l’arène', () => {
  it('repère une pierre sur la trajectoire directe', () => {
    expect(arenaLineOfSight(layout, { x: 150, y: 150 }, { x: 350, y: 150 })).toBe(false);
    expect(arenaLineOfSight(layout, { x: 150, y: 50 }, { x: 350, y: 50 })).toBe(true);
  });

  it('fait contourner le bloc et conserve des segments libres', () => {
    const path = findArenaPath(layout, { x: 150, y: 150 }, { x: 350, y: 150 }, 12);
    expect(path.length).toBeGreaterThan(2);
    for (let i = 1; i < path.length; i++) {
      expect(arenaLineOfSight(layout, path[i - 1], path[i], 12)).toBe(true);
    }
  });
});
