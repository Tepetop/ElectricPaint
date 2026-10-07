import Konva from "konva";
import { jsPDF } from "jspdf";
import { symbolByKind } from "../catalog/symbols";
import type { OverlayElement, Project } from "../domain/types";
import { isCable, isSymbol, isText } from "../domain/types";
import { SYMBOL_SIZE, polylineToFlat, symbolLabelPosition } from "../domain/geometry";
import { collectSymbolList } from "../domain/symbolList";
import { loadDataUrlImage, preloadSymbolImages, symbolImage } from "./images";
import regularFontUrl from "../assets/fonts/LiberationSans-Regular.ttf?url";
import boldFontUrl from "../assets/fonts/LiberationSans-Bold.ttf?url";

const PDF_FONT = "LiberationSans";

async function loadPdfFont(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Nie można wczytać czcionki PDF: ${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

let pdfFonts: Promise<[string, string]> | undefined;

async function registerPdfFonts(pdf: jsPDF) {
  pdfFonts ??= Promise.all([loadPdfFont(regularFontUrl), loadPdfFont(boldFontUrl)]);
  const [regular, bold] = await pdfFonts;
  pdf.addFileToVFS("LiberationSans-Regular.ttf", regular);
  pdf.addFileToVFS("LiberationSans-Bold.ttf", bold);
  pdf.addFont("LiberationSans-Regular.ttf", PDF_FONT, "normal");
  pdf.addFont("LiberationSans-Bold.ttf", PDF_FONT, "bold");
}

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
      const labelPos = symbolLabelPosition(el);
      layer.add(
        new Konva.Text({
          x: labelPos.x,
          y: labelPos.y,
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
  await registerPdfFonts(pdf);
  addSymbolListPages(pdf, project);
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

function addSymbolListPages(pdf: jsPDF, project: Project) {
  const rows = collectSymbolList(project);
  pdf.addPage("a4", "portrait");
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 36;
  const tableWidth = pageW - margin * 2;
  const widths = [82, 188, 72, tableWidth - 342];
  const starts = [margin, margin + widths[0], margin + widths[0] + widths[1], margin + widths[0] + widths[1] + widths[2]];
  const padding = 7;
  const lineHeight = 12;
  const headerHeight = 27;
  const bottom = pageH - margin;

  const drawGrid = (top: number, height: number) => {
    pdf.setDrawColor(185, 196, 207);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, top, tableWidth, height);
    for (let column = 1; column < starts.length; column++) {
      pdf.line(starts[column], top, starts[column], top + height);
    }
  };

  const drawHeader = () => {
    pdf.setFont(PDF_FONT, "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(25, 39, 52);
    pdf.text("Lista symboli", margin, 52);
    const top = 69;
    pdf.setFillColor(42, 59, 75);
    pdf.rect(margin, top, tableWidth, headerHeight, "F");
    drawGrid(top, headerHeight);
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    ["Oznaczenie", "Typ", "Grupy", "Opis"].forEach((heading, column) => {
      pdf.text(heading, starts[column] + padding, top + 18);
    });
    pdf.setFont(PDF_FONT, "normal");
    pdf.setTextColor(25, 39, 52);
    return top + headerHeight;
  };

  let y = drawHeader();
  if (rows.length === 0) {
    pdf.setFontSize(9);
    pdf.text("Brak symboli na widocznych warstwach.", margin + padding, y + 17);
    drawGrid(y, 28);
    return;
  }
  pdf.setFontSize(9);
  rows.forEach((row, rowIndex) => {
    const values = [row.label || "-", row.typeName || "-", row.groups || "-", row.description || "-"];
    const lines = values.map((value, column) =>
      pdf.splitTextToSize(value, widths[column] - padding * 2) as string[],
    );
    const lineCount = Math.max(...lines.map((cell) => cell.length));
    let firstLine = 0;
    while (firstLine < lineCount) {
      const remaining = lineCount - firstLine;
      const fullHeight = Math.max(27, remaining * lineHeight + 12);
      if (y + fullHeight > bottom && y > 96) {
        pdf.addPage("a4", "portrait");
        y = drawHeader();
        pdf.setFontSize(9);
      }
      const availableLines = Math.max(1, Math.floor((bottom - y - 12) / lineHeight));
      const count = Math.min(remaining, availableLines);
      const height = Math.max(27, count * lineHeight + 12);
      if (rowIndex % 2 === 1) {
        pdf.setFillColor(246, 248, 250);
        pdf.rect(margin, y, tableWidth, height, "F");
      }
      drawGrid(y, height);
      lines.forEach((cell, column) => {
        cell.slice(firstLine, firstLine + count).forEach((line, index) => {
          pdf.text(line, starts[column] + padding, y + 16 + index * lineHeight);
        });
      });
      y += height;
      firstLine += count;
    }
  });
}
