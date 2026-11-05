// Disposition du décor de combat (pur, sans Phaser) : tuiles de sol et blocs de pierre.
// Le hasard est injecté pour pouvoir tester. Les nombres viennent de src/data/arena.json.

import type { ArenaDecorConfig } from '../types';

export type ArenaTileKind = 'grass' | 'stone' | 'water';

export interface ArenaPoint {
  x: number;
  y: number;
}

export interface ArenaRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ArenaLayout {
  cell: number;
  cols: number;
  rows: number;
  width: number;
  height: number;
  /** Une entrée par case, indexée `row * cols + col`. */
  tiles: ArenaTileKind[];
  /** Cases occupées par un bloc : ni le héros ni les ennemis n'y passent. */
  blocked: boolean[];
  /** Blocs à dessiner et à rendre solides (coordonnées locales à l'arène). */
  obstacles: ArenaRect[];
  /** Point de départ du héros (coordonnées locales à l'arène). */
  spawn: ArenaPoint;
}

const MIN_OBSTACLE_SIZE = 8;

/**
 * Grille de cases, plaques de pierre et d'eau (décor pur), puis blocs de pierre disposés
 * au hasard. Garanties : le départ du héros et la porte restent dégagés, et un chemin
 * praticable relie toujours le départ à la porte.
 */
export function buildArenaLayout(
  config: ArenaDecorConfig,
  width: number,
  height: number,
  spawn: ArenaPoint,
  rng: () => number = Math.random,
): ArenaLayout {
  const cell = config.cell;
  const cols = Math.max(1, Math.ceil(width / cell));
  const rows = Math.max(1, Math.ceil(height / cell));
  const layout: ArenaLayout = {
    cell,
    cols,
    rows,
    width,
    height,
    tiles: new Array<ArenaTileKind>(cols * rows).fill('grass'),
    blocked: new Array<boolean>(cols * rows).fill(false),
    obstacles: [],
    spawn: { x: spawn.x, y: spawn.y },
  };

  paintPatches(layout, 'stone', config.stonePatchChance, rng);
  paintPatches(layout, 'water', config.waterPatchChance, rng);
  placeObstacles(layout, config, rng);
  layout.obstacles = layout.blocked.flatMap((blocked, index) => (blocked ? [cellRect(layout, index, config.obstacleInset)] : []));
  return layout;
}

/** Case libre la plus proche de la moitié haute, reliée au héros : position d'apparition d'un ennemi. */
export function pickEnemySpawn(layout: ArenaLayout, rng: () => number = Math.random): ArenaPoint | null {
  const start = cellIndex(layout, layout.spawn);
  if (start < 0) return null;
  const reachable = reachableCells(layout, start);
  const maxRow = Math.max(0, Math.floor(layout.rows / 2) - 1);
  const upper: number[] = [];
  const fallback: number[] = [];
  for (let index = 0; index < layout.blocked.length; index++) {
    if (!reachable[index] || layout.blocked[index]) continue;
    fallback.push(index);
    if (Math.floor(index / layout.cols) <= maxRow) upper.push(index);
  }
  const pool = upper.length > 0 ? upper : fallback;
  if (pool.length === 0) return null;
  return cellCenter(layout, pool[Math.floor(rng() * pool.length)]);
}

/** Vrai si on peut aller d'un point à l'autre sans traverser de bloc. */
export function connected(layout: ArenaLayout, from: ArenaPoint, to: ArenaPoint): boolean {
  const start = cellIndex(layout, from);
  const goal = cellIndex(layout, to);
  if (start < 0 || goal < 0) return false;
  if (layout.blocked[start] || layout.blocked[goal]) return false;
  if (start === goal) return true;
  return reachableCells(layout, start)[goal] === true;
}

/** Plaques de 2×2 cases : des taches lisibles plutôt qu'un saupoudrage case par case. */
function paintPatches(layout: ArenaLayout, kind: ArenaTileKind, chance: number, rng: () => number): void {
  for (let row = 0; row < layout.rows; row++) {
    for (let col = 0; col < layout.cols; col++) {
      if (rng() >= chance) continue;
      for (const [dr, dc] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
        const r = row + dr;
        const c = col + dc;
        if (r < layout.rows && c < layout.cols) layout.tiles[r * layout.cols + c] = kind;
      }
    }
  }
}

function placeObstacles(layout: ArenaLayout, config: ArenaDecorConfig, rng: () => number): void {
  const door: ArenaRect = {
    x: layout.width / 2 - config.doorClearance,
    y: 0,
    width: config.doorClearance * 2,
    height: config.doorClearance,
  };
  const home: ArenaRect = {
    x: layout.spawn.x - config.spawnClearance,
    y: layout.spawn.y - config.spawnClearance,
    width: config.spawnClearance * 2,
    height: config.spawnClearance * 2,
  };
  const candidates: number[] = [];
  const isCandidate = new Array<boolean>(layout.blocked.length).fill(false);
  for (let index = 0; index < layout.blocked.length; index++) {
    const rect = cellRect(layout, index, 0);
    if (intersects(rect, door) || intersects(rect, home)) continue;
    candidates.push(index);
    isCandidate[index] = true;
  }

  const target = Math.floor(candidates.length * config.obstacleCoverage);
  const span = Math.max(1, config.obstacleMaxCells - config.obstacleMinCells + 1);
  const order = shuffled(candidates, rng);
  let blockedCount = 0;
  const doorPoint = { x: layout.width / 2, y: 0 };
  for (const start of order) {
    if (blockedCount >= target) break;
    if (layout.blocked[start]) continue;
    const horizontal = rng() < 0.5;
    const length = config.obstacleMinCells + Math.floor(rng() * span);
    for (let step = 0; step < length && blockedCount < target; step++) {
      const index = neighbourIndex(layout, start, horizontal, step);
      if (index < 0 || layout.blocked[index] || !isCandidate[index]) break;
      layout.blocked[index] = true;
      if (connected(layout, layout.spawn, doorPoint)) {
        blockedCount++;
      } else {
        layout.blocked[index] = false; // couperait le chemin vers la porte
      }
    }
  }
}

function shuffled(values: number[], rng: () => number): number[] {
  const out = values.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Index de la case située à `step` cases du point de départ, dans une direction donnée. */
function neighbourIndex(layout: ArenaLayout, start: number, horizontal: boolean, step: number): number {
  if (step === 0) return start;
  const col = (start % layout.cols) + (horizontal ? step : 0);
  const row = Math.floor(start / layout.cols) + (horizontal ? 0 : step);
  if (col >= layout.cols || row >= layout.rows) return -1;
  return row * layout.cols + col;
}

function cellIndex(layout: ArenaLayout, point: ArenaPoint): number {
  const col = Math.min(Math.max(0, Math.floor(point.x / layout.cell)), layout.cols - 1);
  const row = Math.min(Math.max(0, Math.floor(point.y / layout.cell)), layout.rows - 1);
  return row * layout.cols + col;
}

export function cellCenter(layout: ArenaLayout, index: number): ArenaPoint {
  const rect = cellRect(layout, index, 0);
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/** Rectangle d'une case (la dernière rangée et la dernière colonne peuvent être rognées). */
function cellRect(layout: ArenaLayout, index: number, inset: number): ArenaRect {
  const col = index % layout.cols;
  const row = Math.floor(index / layout.cols);
  const width = Math.min(layout.cell, layout.width - col * layout.cell) - inset * 2;
  const height = Math.min(layout.cell, layout.height - row * layout.cell) - inset * 2;
  return {
    x: col * layout.cell + inset,
    y: row * layout.cell + inset,
    width: Math.max(MIN_OBSTACLE_SIZE, width),
    height: Math.max(MIN_OBSTACLE_SIZE, height),
  };
}

function reachableCells(layout: ArenaLayout, start: number): boolean[] {
  const seen = new Array<boolean>(layout.blocked.length).fill(false);
  seen[start] = true;
  const stack = [start];
  while (stack.length > 0) {
    const index = stack.pop() as number;
    const col = index % layout.cols;
    const row = Math.floor(index / layout.cols);
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = col + dc;
      const r = row + dr;
      if (c < 0 || r < 0 || c >= layout.cols || r >= layout.rows) continue;
      const next = r * layout.cols + c;
      if (seen[next] || layout.blocked[next]) continue;
      seen[next] = true;
      stack.push(next);
    }
  }
  return seen;
}

function intersects(a: ArenaRect, b: ArenaRect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}
