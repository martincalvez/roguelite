// Disposition du décor de combat (pur, sans Phaser) : plans de salle, tuiles et blocs.
// Le hasard est injecté pour pouvoir tester. Les données viennent de src/data/.

import type { ArenaDecorConfig, ArenaTemplateDef, ArenaTemplateRect, ArenaTileKind, SpawnPattern } from '../types';

export type { ArenaTileKind } from '../types';

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
  /** Identifiant du plan de salle retenu, utile pour éviter une répétition immédiate. */
  templateId?: string;
  /** Ambiance retenue pour la salle, indépendante de sa géométrie. */
  themeId?: string;
}

export interface ArenaLayoutBuildOptions {
  rng?: () => number;
  templates?: readonly ArenaTemplateDef[];
  /** Le plan de la salle précédente, écarté lorsqu'il existe une autre option. */
  excludedTemplateId?: string;
  /** L'ambiance de la salle précédente, écartée dès qu'une autre option existe. */
  excludedThemeId?: string;
}

export interface EnemySpawnOptions {
  /** Le héros (ou un autre point fragile) que l'apparition doit éviter. */
  origin?: ArenaPoint;
  minDistance?: number;
  /** Positions déjà attribuées dans cette vague, pour éviter une pile d'ennemis. */
  occupied?: readonly ArenaPoint[];
  minSeparation?: number;
  /** Secteur privilégié autour du héros ; le système retombe sur toute case valide si besoin. */
  spawnPattern?: SpawnPattern;
  rng?: () => number;
}

const MIN_OBSTACLE_SIZE = 8;

/**
 * Grille de cases et plan de salle. Garanties : le départ du héros et la porte restent
 * dégagés, et un chemin praticable relie toujours le départ à la porte.
 */
export function buildArenaLayout(
  config: ArenaDecorConfig,
  width: number,
  height: number,
  spawn: ArenaPoint,
  options: ArenaLayoutBuildOptions | (() => number) = {},
): ArenaLayout {
  const buildOptions = typeof options === 'function' ? { rng: options } : options;
  const rng = buildOptions.rng ?? Math.random;
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

  const template = selectArenaTemplate(buildOptions.templates ?? [], buildOptions.excludedTemplateId, rng, buildOptions.excludedThemeId);
  paintPatches(layout, 'stone', config.stonePatchChance, rng);
  paintPatches(layout, 'water', config.waterPatchChance, rng);
  if (template) {
    layout.templateId = template.id;
    layout.themeId = template.themeId;
    paintTemplateTiles(layout, template.tiles);
    if (config.obstacleCoverage > 0) placeTemplateObstacles(layout, config, template.blocks);
  } else {
    placeObstacles(layout, config, rng);
  }
  layout.obstacles = layout.blocked.flatMap((blocked, index) => (blocked ? [cellRect(layout, index, config.obstacleInset)] : []));
  return layout;
}

/** Tire un plan pondéré, en évitant le précédent si plusieurs plans existent. */
export function selectArenaTemplate(
  templates: readonly ArenaTemplateDef[],
  excludedTemplateId?: string,
  rng: () => number = Math.random,
  excludedThemeId?: string,
): ArenaTemplateDef | undefined {
  const withoutPreviousPlan = templates.filter((template) => template.id !== excludedTemplateId);
  const planCandidates = withoutPreviousPlan.length > 0 ? withoutPreviousPlan : templates;
  const alternatives = planCandidates.filter((template) => template.themeId !== excludedThemeId);
  const candidates = alternatives.length > 0 ? alternatives : planCandidates;
  if (candidates.length === 0) return undefined;
  const total = candidates.reduce((sum, template) => sum + template.weight, 0);
  let roll = rng() * total;
  for (const template of candidates) {
    roll -= template.weight;
    if (roll < 0) return template;
  }
  return candidates[candidates.length - 1];
}

/**
 * Case libre et reliée au héros pour une apparition. Toute l'arène est admissible : les ennemis
 * peuvent donc arriver sur les flancs ou derrière le joueur, sans apparaître sur lui ni se superposer.
 */
export function pickEnemySpawn(
  layout: ArenaLayout,
  options: EnemySpawnOptions | (() => number) = {},
): ArenaPoint | null {
  const config = typeof options === 'function' ? { rng: options } : options;
  const rng = config.rng ?? Math.random;
  const start = cellIndex(layout, layout.spawn);
  if (start < 0) return null;
  const reachable = reachableCells(layout, start);
  const origin = config.origin ?? layout.spawn;
  const minDistance = config.minDistance ?? 0;
  const occupied = config.occupied ?? [];
  const minSeparation = config.minSeparation ?? 0;
  const spawnPattern = config.spawnPattern ?? 'surround';
  const candidates: number[] = [];
  for (let index = 0; index < layout.blocked.length; index++) {
    if (!reachable[index] || layout.blocked[index]) continue;
    const point = cellCenter(layout, index);
    if (Math.hypot(point.x - origin.x, point.y - origin.y) < minDistance) continue;
    if (occupied.some((other) => Math.hypot(point.x - other.x, point.y - other.y) < minSeparation)) continue;
    candidates.push(index);
  }
  if (candidates.length === 0) return null;
  const preferred = candidates.filter((index) => matchesSpawnPattern(cellCenter(layout, index), origin, spawnPattern));
  const pool = preferred.length > 0 ? preferred : candidates;
  return cellCenter(layout, pool[Math.floor(rng() * pool.length)]);
}

function matchesSpawnPattern(point: ArenaPoint, origin: ArenaPoint, pattern: SpawnPattern): boolean {
  if (pattern === 'surround') return true;
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  if (pattern === 'ahead') return dy < 0;
  if (pattern === 'behind') return dy > 0;
  return Math.abs(dx) >= Math.abs(dy);
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

/** Applique les plaques larges d'un plan : elles rendent chaque salle immédiatement reconnaissable. */
function paintTemplateTiles(layout: ArenaLayout, tiles: readonly (ArenaTemplateRect & { kind: Exclude<ArenaTileKind, 'grass'> })[]): void {
  for (const tile of tiles) {
    for (let row = tile.row; row < tile.row + tile.height; row++) {
      for (let col = tile.col; col < tile.col + tile.width; col++) {
        if (col < 0 || row < 0 || col >= layout.cols || row >= layout.rows) continue;
        layout.tiles[row * layout.cols + col] = tile.kind;
      }
    }
  }
}

/** Pose les blocs d'un plan en conservant toujours une route vers la sortie. */
function placeTemplateObstacles(
  layout: ArenaLayout,
  config: ArenaDecorConfig,
  blocks: readonly ArenaTemplateRect[],
): void {
  const { door, home } = protectedAreas(layout, config);
  const doorPoint = { x: layout.width / 2, y: 0 };
  for (const block of blocks) {
    for (let row = block.row; row < block.row + block.height; row++) {
      for (let col = block.col; col < block.col + block.width; col++) {
        if (col < 0 || row < 0 || col >= layout.cols || row >= layout.rows) continue;
        const index = row * layout.cols + col;
        const rect = cellRect(layout, index, 0);
        if (layout.blocked[index] || intersects(rect, door) || intersects(rect, home)) continue;
        layout.blocked[index] = true;
        if (!connected(layout, layout.spawn, doorPoint)) layout.blocked[index] = false;
      }
    }
  }
}

function placeObstacles(layout: ArenaLayout, config: ArenaDecorConfig, rng: () => number): void {
  const { door, home } = protectedAreas(layout, config);
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

function protectedAreas(layout: ArenaLayout, config: ArenaDecorConfig): { door: ArenaRect; home: ArenaRect } {
  return {
    door: {
      x: layout.width / 2 - config.doorClearance,
      y: 0,
      width: config.doorClearance * 2,
      height: config.doorClearance,
    },
    home: {
      x: layout.spawn.x - config.spawnClearance,
      y: layout.spawn.y - config.spawnClearance,
      width: config.spawnClearance * 2,
      height: config.spawnClearance * 2,
    },
  };
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
