import { GRID_SIZE, type CableRoute, type Point, type ScaleReference } from "./types";

export const SYMBOL_SIZE = 48;
const LABEL_GAP = 4;
const LABEL_DY = 6;

function localLabelPoint(scale: number, offset?: Point): Point {
  const size = SYMBOL_SIZE * scale;
  return {
    x: size + LABEL_GAP + (offset?.x ?? 0),
    y: size / 2 - LABEL_DY + (offset?.y ?? 0),
  };
}

export function symbolLabelPosition(el: {
  x: number;
  y: number;
  scale: number;
  rotation?: number;
  labelOffset?: Point;
}): Point {
  const local = localLabelPoint(el.scale, el.labelOffset);
  const rad = ((el.rotation ?? 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: el.x + local.x * cos - local.y * sin,
    y: el.y + local.x * sin + local.y * cos,
  };
}

export function labelOffsetFromWorld(
  el: { x: number; y: number; scale: number; rotation?: number },
  world: Point,
): Point {
  const rad = (-(el.rotation ?? 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = world.x - el.x;
  const dy = world.y - el.y;
  const base = localLabelPoint(el.scale);
  return {
    x: dx * cos - dy * sin - base.x,
    y: dx * sin + dy * cos - base.y,
  };
}

export function snapValue(value: number, enabled: boolean, grid = GRID_SIZE): number {
  if (!enabled) return value;
  return Math.round(value / grid) * grid;
}

export function snapPoint(point: Point, enabled: boolean, grid = GRID_SIZE): Point {
  return { x: snapValue(point.x, enabled, grid), y: snapValue(point.y, enabled, grid) };
}

export function snapCablePoint(point: Point): Point {
  return snapPoint(point, true, 1);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function polylineToFlat(points: Point[]): number[] {
  return points.flatMap((p) => [p.x, p.y]);
}

export function polylineLengthPx(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total;
}

export function metersPerPixel(ref: ScaleReference | null | undefined): number | null {
  if (!ref || !(ref.lengthM > 0)) return null;
  const px = Math.hypot(ref.x2 - ref.x1, ref.y2 - ref.y1);
  if (px <= 0) return null;
  return ref.lengthM / px;
}

export function lengthInMeters(points: Point[], ref: ScaleReference | null | undefined): number | null {
  const mpp = metersPerPixel(ref);
  if (mpp == null) return null;
  return polylineLengthPx(points) * mpp;
}

export function formatMeters(meters: number): string {
  return `${meters.toFixed(2)} m`;
}

export function metersToMm(meters: number): number {
  return Math.round(meters * 1000 * 100) / 100;
}

export function mmToMeters(mm: number): number {
  return mm / 1000;
}

export function formatScaleLength(lengthM: number): string {
  return `${metersToMm(lengthM)} mm`;
}

export function boundsContain(
  box: { x: number; y: number; width: number; height: number },
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  return x >= box.x && y >= box.y && x + w <= box.x + box.width && y + h <= box.y + box.height;
}

export const CABLE_GAP = 4;
const PARALLEL_COS_MIN = Math.cos((12 * Math.PI) / 180);

export type CableSegmentObstacle = { a: Point; b: Point; width: number };

export function minCableSeparation(width1: number, width2: number): number {
  return (width1 + width2) / 2 + CABLE_GAP;
}

export function segmentMidpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function closestPointOnSegment(
  p: Point,
  a: Point,
  b: Point,
): { point: Point; distance: number; t: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) {
    return { point: { x: a.x, y: a.y }, distance: Math.hypot(p.x - a.x, p.y - a.y), t: 0 };
  }
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1);
  const point = { x: a.x + t * dx, y: a.y + t * dy };
  return { point, distance: Math.hypot(p.x - point.x, p.y - point.y), t };
}

export function findClosestCableSegment(
  points: Point[],
  p: Point,
): { index: number; point: Point; distance: number } | null {
  if (points.length < 2) return null;
  let best: { index: number; point: Point; distance: number } | null = null;
  for (let i = 0; i < points.length - 1; i++) {
    const hit = closestPointOnSegment(p, points[i], points[i + 1]);
    if (!best || hit.distance < best.distance) {
      best = { index: i, point: hit.point, distance: hit.distance };
    }
  }
  return best;
}

function almostParallel(u: Point, v: Point): boolean {
  const ul = Math.hypot(u.x, u.y);
  const vl = Math.hypot(v.x, v.y);
  if (ul < 1e-6 || vl < 1e-6) return false;
  return Math.abs((u.x * v.x + u.y * v.y) / (ul * vl)) >= PARALLEL_COS_MIN;
}

function longitudinalOverlap(a: Point, b: Point, c: Point, d: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return 0;
  const ux = dx / len;
  const uy = dy / len;
  const proj = (p: Point) => (p.x - a.x) * ux + (p.y - a.y) * uy;
  const lo = Math.max(Math.min(0, len), Math.min(proj(c), proj(d)));
  const hi = Math.min(Math.max(0, len), Math.max(proj(c), proj(d)));
  return Math.max(0, hi - lo);
}

function mergeIntervals(intervals: Array<{ lo: number; hi: number }>): Array<{ lo: number; hi: number }> {
  const sorted = [...intervals].sort((left, right) => left.lo - right.lo);
  const merged = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (current.lo <= last.hi) last.hi = Math.max(last.hi, current.hi);
    else merged.push({ ...current });
  }
  return merged;
}

function nearestFreeOffset(intervals: Array<{ lo: number; hi: number }>): number {
  const hit = mergeIntervals(intervals).find((interval) => interval.lo < 0 && 0 < interval.hi);
  if (!hit) return 0;
  const loAbs = Math.abs(hit.lo);
  const hiAbs = Math.abs(hit.hi);
  if (loAbs < hiAbs) return hit.lo;
  return hit.hi;
}

export function cableSegmentObstacles(
  cables: Array<Pick<CableRoute, "points" | "width">>,
): CableSegmentObstacle[] {
  const obstacles: CableSegmentObstacle[] = [];
  for (const cable of cables) {
    for (let i = 0; i < cable.points.length - 1; i++) {
      obstacles.push({ a: cable.points[i], b: cable.points[i + 1], width: cable.width });
    }
  }
  return obstacles;
}

export function resolveSegmentParallelOffset(
  a: Point,
  b: Point,
  width: number,
  obstacles: CableSegmentObstacle[],
): { a: Point; b: Point; offsetApplied: boolean } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { a, b, offsetApplied: false };
  const nx = -dy / len;
  const ny = dx / len;
  const intervals: Array<{ lo: number; hi: number }> = [];
  for (const obstacle of obstacles) {
    if (!almostParallel({ x: dx, y: dy }, { x: obstacle.b.x - obstacle.a.x, y: obstacle.b.y - obstacle.a.y })) {
      continue;
    }
    const overlap = longitudinalOverlap(a, b, obstacle.a, obstacle.b);
    if (overlap <= CABLE_GAP) continue;
    const dMin = minCableSeparation(width, obstacle.width);
    const d = (obstacle.a.x - a.x) * nx + (obstacle.a.y - a.y) * ny;
    intervals.push({ lo: d - dMin, hi: d + dMin });
  }
  if (intervals.length === 0) return { a, b, offsetApplied: false };
  const offset = nearestFreeOffset(intervals);
  if (Math.abs(offset) < 0.5) return { a, b, offsetApplied: false };
  return {
    a: { x: a.x + offset * nx, y: a.y + offset * ny },
    b: { x: b.x + offset * nx, y: b.y + offset * ny },
    offsetApplied: true,
  };
}

export function resolveCableDraftPoint(
  committed: Point[],
  candidate: Point,
  width: number,
  existingCables: Array<Pick<CableRoute, "points" | "width">>,
): Point[] {
  const snapped = snapCablePoint(candidate);
  if (committed.length === 0) return [snapped];
  const resolved = resolveSegmentParallelOffset(
    committed[committed.length - 1],
    snapped,
    width,
    cableSegmentObstacles(existingCables),
  );
  const start = snapCablePoint(resolved.a);
  const end = snapCablePoint(resolved.b);
  if (committed.length === 1) return [start, end];
  return [...committed.slice(0, -1), start, end];
}

export function resolveEditedCablePoints(
  points: Point[],
  editedIndex: number,
  width: number,
  existingCables: Array<Pick<CableRoute, "points" | "width">>,
): Point[] {
  if (editedIndex < 0 || editedIndex >= points.length) return points;
  const obstacles = cableSegmentObstacles(existingCables);
  const next = points.map((point, index) => (index === editedIndex ? snapCablePoint(point) : point));
  let edited = next[editedIndex];
  if (editedIndex > 0) {
    edited = snapCablePoint(resolveSegmentParallelOffset(next[editedIndex - 1], edited, width, obstacles).b);
  }
  if (editedIndex < next.length - 1) {
    edited = snapCablePoint(resolveSegmentParallelOffset(edited, next[editedIndex + 1], width, obstacles).a);
  }
  return next.map((point, index) => (index === editedIndex ? edited : point));
}
