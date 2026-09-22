import { GRID_SIZE, type Point } from "./types";

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
