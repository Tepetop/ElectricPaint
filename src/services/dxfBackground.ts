import DxfParser, { type IArcEntity, type IBlock, type ICircleEntity, type IDxf, type IEntity, type IInsertEntity, type ILineEntity, type ILwpolylineEntity, type IPoint, type IPolylineEntity } from "dxf-parser";
import type { LoadedBackground } from "./background";

export type DxfStroke = { x1: number; y1: number; x2: number; y2: number };

type Pt = { x: number; y: number };
type Xform = (x: number, y: number) => Pt;

const IDENTITY: Xform = (x, y) => ({ x, y });
const MAX_INSERT_DEPTH = 8;
const CIRCLE_SEGMENTS = 48;
const TARGET_SIDE = 3200;
const STROKE_COLOR = "#1a1a1a";

export function strokesFromDxf(text: string): DxfStroke[] {
  if (text.includes("AutoCAD Binary DXF")) {
    throw new Error("Plik DXF jest binarny. Zapisz go jako DXF ASCII i spróbuj ponownie.");
  }
  let dxf: IDxf | null;
  try {
    dxf = new DxfParser().parseSync(text);
  } catch {
    throw new Error("Nie można odczytać pliku DXF");
  }
  if (!dxf) throw new Error("Nie można odczytać pliku DXF");

  const model = collect(dxf, dxf.entities ?? [], IDENTITY, 0, new Set(), "model");
  const strokes = model.length > 0 ? model : collect(dxf, dxf.entities ?? [], IDENTITY, 0, new Set(), "paper");
  if (strokes.length === 0) {
    throw new Error("Rzut DXF nie zawiera linii do wyświetlenia");
  }
  return strokes;
}

export async function loadDxfBackground(file: File): Promise<LoadedBackground> {
  const strokes = strokesFromDxf(await file.text());
  return rasterizeStrokes(strokes, file.name);
}

function collect(
  dxf: IDxf,
  entities: IEntity[],
  xform: Xform,
  depth: number,
  stack: Set<string>,
  space: "model" | "paper",
): DxfStroke[] {
  const strokes: DxfStroke[] = [];
  for (const entity of entities) {
    if (space === "model" ? entity.inPaperSpace : !entity.inPaperSpace) continue;
    if (entity.visible === false) continue;
    if (isLayerHidden(dxf, entity.layer)) continue;
    emitEntity(dxf, entity, xform, depth, stack, space, strokes);
  }
  return strokes;
}

function emitEntity(
  dxf: IDxf,
  entity: IEntity,
  xform: Xform,
  depth: number,
  stack: Set<string>,
  space: "model" | "paper",
  strokes: DxfStroke[],
) {
  switch (entity.type) {
    case "LINE": {
      const line = entity as ILineEntity;
      const a = line.vertices?.[0];
      const b = line.vertices?.[1];
      if (a && b) addStroke(strokes, a, b, xform);
      return;
    }
    case "LWPOLYLINE":
      emitPolyline((entity as ILwpolylineEntity).vertices, Boolean((entity as ILwpolylineEntity).shape), xform, strokes);
      return;
    case "POLYLINE":
      emitPolyline((entity as IPolylineEntity).vertices, Boolean((entity as IPolylineEntity).shape), xform, strokes);
      return;
    case "CIRCLE": {
      const circle = entity as ICircleEntity;
      if (!circle.center || !circle.radius) return;
      emitArc(circle.center, circle.radius, 0, Math.PI * 2, true, xform, strokes);
      return;
    }
    case "ARC": {
      const arc = entity as IArcEntity;
      if (!arc.center || !arc.radius || arc.startAngle == null || arc.endAngle == null) return;
      emitArc(arc.center, arc.radius, arc.startAngle, arc.endAngle, false, xform, strokes);
      return;
    }
    case "INSERT":
      emitInsert(dxf, entity as IInsertEntity, xform, depth, stack, space, strokes);
      return;
    default:
      return;
  }
}

function emitInsert(
  dxf: IDxf,
  insert: IInsertEntity,
  parent: Xform,
  depth: number,
  stack: Set<string>,
  space: "model" | "paper",
  strokes: DxfStroke[],
) {
  if (!insert.name || depth >= MAX_INSERT_DEPTH || stack.has(insert.name)) return;
  const block = findBlock(dxf, insert.name);
  if (!block?.entities?.length) return;
  const nested = new Set(stack);
  nested.add(insert.name);
  const xform = insertXform(block, insert, parent);
  for (const child of block.entities) {
    if (child.visible === false) continue;
    if (isLayerHidden(dxf, child.layer)) continue;
    emitEntity(dxf, child, xform, depth + 1, nested, space, strokes);
  }
}

function emitPolyline(
  vertices: Array<Pt & { bulge?: number }> | undefined,
  closed: boolean,
  xform: Xform,
  strokes: DxfStroke[],
) {
  if (!vertices || vertices.length < 2) return;
  const count = closed ? vertices.length : vertices.length - 1;
  for (let i = 0; i < count; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    if (a.x == null || a.y == null || b.x == null || b.y == null) continue;
    const bulge = a.bulge ?? 0;
    if (!bulge) {
      addStroke(strokes, a, b, xform);
      continue;
    }
    let prev = a;
    for (const p of sampleBulge(a, b, bulge)) {
      addStroke(strokes, prev, p, xform);
      prev = p;
    }
  }
}

function emitArc(
  center: IPoint,
  radius: number,
  startAngle: number,
  endAngle: number,
  closed: boolean,
  xform: Xform,
  strokes: DxfStroke[],
) {
  if (!(radius > 0)) return;
  let end = endAngle;
  if (!closed) {
    while (end <= startAngle) end += Math.PI * 2;
  }
  const sweep = closed ? Math.PI * 2 : end - startAngle;
  const segs = Math.max(8, Math.ceil((CIRCLE_SEGMENTS * sweep) / (Math.PI * 2)));
  let prev = { x: center.x + radius * Math.cos(startAngle), y: center.y + radius * Math.sin(startAngle) };
  for (let i = 1; i <= segs; i++) {
    const angle = startAngle + (sweep * i) / segs;
    const next = { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) };
    addStroke(strokes, prev, next, xform);
    prev = next;
  }
}

function sampleBulge(start: Pt, end: Pt, bulge: number): Pt[] {
  const theta = 4 * Math.atan(bulge);
  const a = (1 / bulge - bulge) / 2;
  const cx = (start.x + end.x - (end.y - start.y) * a) / 2;
  const cy = (start.y + end.y + (end.x - start.x) * a) / 2;
  const radius = Math.hypot(start.x - cx, start.y - cy);
  const startAng = Math.atan2(start.y - cy, start.x - cx);
  const steps = Math.max(4, Math.ceil((16 * Math.abs(theta)) / Math.PI));
  const points: Pt[] = [];
  for (let i = 1; i <= steps; i++) {
    const ang = startAng + (theta * i) / steps;
    points.push({ x: cx + radius * Math.cos(ang), y: cy + radius * Math.sin(ang) });
  }
  points[points.length - 1] = { x: end.x, y: end.y };
  return points;
}

function addStroke(strokes: DxfStroke[], a: Pt, b: Pt, xform: Xform) {
  const p = xform(a.x, a.y);
  const q = xform(b.x, b.y);
  if (p.x === q.x && p.y === q.y) return;
  strokes.push({ x1: p.x, y1: p.y, x2: q.x, y2: q.y });
}

function insertXform(block: IBlock, insert: IInsertEntity, parent: Xform): Xform {
  const ox = block.position?.x ?? 0;
  const oy = block.position?.y ?? 0;
  const sx = insert.xScale ?? 1;
  const sy = insert.yScale ?? 1;
  const rad = ((insert.rotation ?? 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const px = insert.position?.x ?? 0;
  const py = insert.position?.y ?? 0;
  return (x, y) => {
    const dx = (x - ox) * sx;
    const dy = (y - oy) * sy;
    return parent(px + dx * cos - dy * sin, py + dx * sin + dy * cos);
  };
}

function findBlock(dxf: IDxf, name: string): IBlock | undefined {
  const blocks = dxf.blocks;
  if (!blocks) return undefined;
  if (blocks[name]) return blocks[name];
  const key = Object.keys(blocks).find((item) => item.toLowerCase() === name.toLowerCase());
  return key ? blocks[key] : undefined;
}

function isLayerHidden(dxf: IDxf, layerName: string | undefined): boolean {
  if (!layerName) return false;
  const layer = dxf.tables?.layer?.layers?.[layerName];
  if (!layer) return false;
  return layer.visible === false || layer.frozen === true;
}

function rasterizeStrokes(strokes: DxfStroke[], filename: string): LoadedBackground {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of strokes) {
    minX = Math.min(minX, s.x1, s.x2);
    minY = Math.min(minY, s.y1, s.y2);
    maxX = Math.max(maxX, s.x1, s.x2);
    maxY = Math.max(maxY, s.y1, s.y2);
  }
  const worldW = maxX - minX;
  const worldH = maxY - minY;
  if (!Number.isFinite(worldW) || (worldW === 0 && worldH === 0)) {
    throw new Error("Rzut DXF nie zawiera linii do wyświetlenia");
  }
  const pad = Math.max(worldW, worldH, 1) * 0.05;
  const boxW = worldW + pad * 2;
  const boxH = worldH + pad * 2;
  const scale = TARGET_SIDE / Math.max(boxW, boxH);
  const width = Math.max(1, Math.round(boxW * scale));
  const height = Math.max(1, Math.round(boxH * scale));
  const originX = minX - pad;
  const originY = minY - pad;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Brak kontekstu canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = STROKE_COLOR;
  ctx.lineWidth = 1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (const s of strokes) {
    ctx.moveTo((s.x1 - originX) * scale, height - (s.y1 - originY) * scale);
    ctx.lineTo((s.x2 - originX) * scale, height - (s.y2 - originY) * scale);
  }
  ctx.stroke();

  return {
    dataUrl: canvas.toDataURL("image/png"),
    filename,
    mimeType: "image/png",
    width,
    height,
    kind: "dxf",
  };
}
