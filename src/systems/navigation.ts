import type { ArenaLayout, ArenaPoint, ArenaRect } from './arenaLayout';

const STEPS = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [1, -1], [-1, 1], [1, 1],
] as const;

/** Chemin court sur la grille de la salle, en tenant compte de la taille du corps. */
export function findArenaPath(
  layout: ArenaLayout,
  from: ArenaPoint,
  to: ArenaPoint,
  clearance: number,
): ArenaPoint[] {
  const blocked = new Array<boolean>(layout.cols * layout.rows).fill(false);
  const padded = layout.obstacles.map((rect) => expand(rect, clearance));
  for (let row = 0; row < layout.rows; row++) {
    for (let col = 0; col < layout.cols; col++) {
      const point = cellCenter(layout, row * layout.cols + col);
      blocked[row * layout.cols + col] = padded.some((rect) => contains(rect, point));
    }
  }

  const start = nearestOpen(layout, blocked, from);
  const goal = nearestOpen(layout, blocked, to);
  if (start < 0 || goal < 0) return [from, to];
  if (start === goal) return [from, to];

  const previous = new Int32Array(blocked.length).fill(-1);
  const cost = new Float32Array(blocked.length).fill(Infinity);
  const open = new Set<number>([start]);
  cost[start] = 0;
  while (open.size) {
    let current = -1;
    let priority = Infinity;
    for (const index of open) {
      const p = cellCenter(layout, index);
      const g = cost[index];
      const goalPoint = cellCenter(layout, goal);
      const h = Math.hypot(p.x - goalPoint.x, p.y - goalPoint.y) / layout.cell;
      if (g + h < priority) { current = index; priority = g + h; }
    }
    if (current === goal) break;
    open.delete(current);
    const row = Math.floor(current / layout.cols);
    const col = current % layout.cols;
    for (const [dc, dr] of STEPS) {
      const nc = col + dc;
      const nr = row + dr;
      if (nc < 0 || nc >= layout.cols || nr < 0 || nr >= layout.rows) continue;
      const next = nr * layout.cols + nc;
      if (blocked[next]) continue;
      if (dc && dr && (blocked[row * layout.cols + nc] || blocked[nr * layout.cols + col])) continue;
      const stepCost = dc && dr ? 1.4142 : 1;
      const nextCost = cost[current] + stepCost;
      if (nextCost >= cost[next]) continue;
      cost[next] = nextCost;
      previous[next] = current;
      open.add(next);
    }
  }
  if (previous[goal] < 0) return [from, to];

  const cells: number[] = [];
  for (let index = goal; index !== start; index = previous[index]) cells.push(index);
  cells.push(start);
  cells.reverse();
  const raw = [from, ...cells.slice(1, -1).map((index) => cellCenter(layout, index)), to];
  return smoothPath(raw, padded);
}

/** Vrai si aucune pierre ne coupe le segment entre les deux points. */
export function arenaLineOfSight(layout: ArenaLayout, from: ArenaPoint, to: ArenaPoint, clearance = 0): boolean {
  const rects = layout.obstacles.map((rect) => expand(rect, clearance));
  return !rects.some((rect) => segmentIntersectsRect(from, to, rect));
}

function nearestOpen(layout: ArenaLayout, blocked: boolean[], point: ArenaPoint): number {
  let best = -1;
  let bestDistance = Infinity;
  for (let index = 0; index < blocked.length; index++) {
    if (blocked[index]) continue;
    const center = cellCenter(layout, index);
    const distance = (center.x - point.x) ** 2 + (center.y - point.y) ** 2;
    if (distance < bestDistance) { best = index; bestDistance = distance; }
  }
  return best;
}

function cellCenter(layout: ArenaLayout, index: number): ArenaPoint {
  return {
    x: (index % layout.cols + 0.5) * layout.cell,
    y: (Math.floor(index / layout.cols) + 0.5) * layout.cell,
  };
}

function expand(rect: ArenaRect, amount: number): ArenaRect {
  return { x: rect.x - amount, y: rect.y - amount, width: rect.width + amount * 2, height: rect.height + amount * 2 };
}

function contains(rect: ArenaRect, point: ArenaPoint): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}

function smoothPath(points: ArenaPoint[], obstacles: ArenaRect[]): ArenaPoint[] {
  if (points.length <= 2) return points;
  const result = [points[0]];
  let anchor = 0;
  while (anchor < points.length - 1) {
    let farthest = anchor + 1;
    for (let candidate = anchor + 2; candidate < points.length; candidate++) {
      if (obstacles.some((rect) => segmentIntersectsRect(points[anchor], points[candidate], rect))) break;
      farthest = candidate;
    }
    result.push(points[farthest]);
    anchor = farthest;
  }
  return result;
}

function segmentIntersectsRect(a: ArenaPoint, b: ArenaPoint, rect: ArenaRect): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let low = 0;
  let high = 1;
  for (const [p, q] of [
    [-dx, a.x - rect.x], [dx, rect.x + rect.width - a.x],
    [-dy, a.y - rect.y], [dy, rect.y + rect.height - a.y],
  ]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) low = Math.max(low, t);
    else high = Math.min(high, t);
    if (low > high) return false;
  }
  return true;
}
