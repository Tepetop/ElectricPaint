import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerUrl;

export type LoadedBackground = {
  dataUrl: string;
  filename: string;
  mimeType: string;
  width: number;
  height: number;
  kind: "image" | "pdf" | "dxf";
  page?: number;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Nie można wczytać obrazu"));
    image.src = dataUrl;
  });
}

export async function inspectPdf(file: File): Promise<{ pages: number; pdf: PDFDocumentProxy }> {
  const data = await file.arrayBuffer();
  const pdf = await getDocument({ data }).promise;
  return { pages: pdf.numPages, pdf };
}

export async function rasterizePdfPage(pdf: PDFDocumentProxy, pageNumber: number, scale = 2): Promise<LoadedBackground> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Brak kontekstu canvas");
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  return {
    dataUrl: canvas.toDataURL("image/png"),
    filename: `strona-${pageNumber}.png`,
    mimeType: "image/png",
    width: canvas.width,
    height: canvas.height,
    kind: "pdf",
    page: pageNumber,
  };
}

export async function loadImageBackground(file: File): Promise<LoadedBackground> {
  const dataUrl = await readFileAsDataUrl(file);
  const size = await loadImageSize(dataUrl);
  return {
    dataUrl,
    filename: file.name,
    mimeType: file.type || "image/jpeg",
    width: size.width,
    height: size.height,
    kind: "image",
  };
}
