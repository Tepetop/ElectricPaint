import Konva from "konva";
import { jsPDF } from "jspdf";
import { symbolByKind } from "../catalog/symbols";
import type { OverlayElement, Project } from "../domain/types";
import { isCable, isSymbol, isText } from "../domain/types";
import { polylineToFlat } from "../domain/geometry";
import { loadDataUrlImage, preloadSymbolImages, symbolImage } from "./images";

export const SYMBOL_SIZE = 48;

function visibleElements(project: Project): OverlayElement[] {
  const hidden = new Set(project.layers.filter((l) => !l.visible).map((l) => l.id));
  return project.elements.filter((el) => !hidden.has(el.layerId));
}

export async function buildExportStage(
  project: Project,
  backgroundDataUrl: string | null,
): Promise<Konva.Stage> {
  await preloadSymbolImages();
  const container = document.createElement("div");
  const stage = new Konva.Stage({
    container,
    width: project.canvas.width,
    height: project.canvas.height,
  });
  const layer = new Konva.Layer();
  stage.add(layer);

  const bg = new Konva.Rect({
    x: 0,
    y: 0,
    width: project.canvas.width,
    height: project.canvas.height,
    fill: "#ffffff",
  });
  layer.add(bg);

  if (backgroundDataUrl) {
    const image = await loadDataUrlImage(backgroundDataUrl);
    layer.add(
      new Konva.Image({
        image,
        x: 0,
        y: 0,
        width: project.canvas.width,
        height: project.canvas.height,
      }),
    );
  }

  for (const el of visibleElements(project)) {
    if (isCable(el)) {
      layer.add(
        new Konva.Line({
          points: polylineToFlat(el.points),
          stroke: el.color,
          strokeWidth: el.width,
          dash: el.style === "dashed" ? [12, 8] : undefined,
          lineCap: "round",
          lineJoin: "round",
        }),
      );
      if (el.name && el.points.length) {
        layer.add(
          new Konva.Text({
            x: el.points[0].x + 6,
            y: el.points[0].y - 16,
            text: el.name,
            fontSize: 14,
            fill: el.color,
          }),
        );
      }
    } else if (isSymbol(el)) {
      const image = symbolImage(el.kind);
      if (image) {
        layer.add(
          new Konva.Image({
            image,
            x: el.x,
            y: el.y,
            width: SYMBOL_SIZE,
            height: SYMBOL_SIZE,
            rotation: el.rotation,
            scaleX: el.scale,
            scaleY: el.scale,
          }),
        );
      }
      layer.add(
        new Konva.Text({
          x: el.x,
          y: el.y + SYMBOL_SIZE * el.scale + 2,
          text: el.label,
          fontSize: 12,
          fill: "#111",
        }),
      );
    } else if (isText(el)) {
      layer.add(
        new Konva.Text({
          x: el.x,
          y: el.y,
          text: el.text,
          fontSize: el.fontSize,
          rotation: el.rotation,
          scaleX: el.scale,
          scaleY: el.scale,
          fill: "#111",
        }),
      );
    }
  }

  layer.draw();
  return stage;
}

export async function exportPngDataUrl(
  project: Project,
  backgroundDataUrl: string | null,
  pixelRatio = 2,
): Promise<string> {
  const stage = await buildExportStage(project, backgroundDataUrl);
  const url = stage.toDataURL({ pixelRatio, mimeType: "image/png" });
  stage.destroy();
  return url;
}

export async function exportPngBytes(
  project: Project,
  backgroundDataUrl: string | null,
  pixelRatio = 2,
): Promise<Uint8Array> {
  const url = await exportPngDataUrl(project, backgroundDataUrl, pixelRatio);
  const res = await fetch(url);
  return new Uint8Array(await res.arrayBuffer());
}

export async function exportPdfBytes(
  project: Project,
  backgroundDataUrl: string | null,
): Promise<Uint8Array> {
  const url = await exportPngDataUrl(project, backgroundDataUrl, 2);
  const w = project.canvas.width;
  const h = project.canvas.height;
  const orientation = w >= h ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "px", format: [w, h], hotfixes: ["px_scaling"] });
  pdf.addImage(url, "PNG", 0, 0, w, h);
  const output = pdf.output("arraybuffer");
  return new Uint8Array(output);
}

export function elementLabel(el: OverlayElement): string {
  if (isSymbol(el)) {
    return `${el.label} (${symbolByKind(el.kind)?.name ?? el.kind})`;
  }
  if (isCable(el)) return el.name;
  return el.text;
}
