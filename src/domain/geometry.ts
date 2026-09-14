import { GRID_SIZE, type Point } from "./types";

export function snapValue(value: number, enabled: boolean, grid = GRID_SIZE): number {
  if (!enabled) return value;
  return Math.round(value / grid) * grid;
}

export function snapPoint(point: Point, enabled: boolean, grid = GRID_SIZE): Point {
  return { x: snapValue(point.x, enabled, grid), y: snapValue(point.y, enabled, grid) };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function polylineToFlat(points: Point[]): number[] {
  return points.flatMap((p) => [p.x, p.y]);
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
