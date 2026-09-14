import JSZip from "jszip";
import { migrateProject } from "../domain/migrations";
import type { Project } from "../domain/types";

export const PROJECT_JSON = "project.json";
export const ASSETS_DIR = "assets/";

export type PackedProject = {
  project: Project;
  backgroundBytes: Uint8Array | null;
  backgroundFilename: string | null;
  backgroundMime: string | null;
};

function extFromMime(mime: string, fallback: string): string {
  if (mime.includes("png")) return ".png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return ".jpg";
  if (mime.includes("webp")) return ".webp";
  if (mime.includes("pdf")) return ".pdf";
  return fallback.startsWith(".") ? fallback : `.${fallback}`;
}

export async function packProject(
  project: Project,
  backgroundBytes: Uint8Array | null,
): Promise<Uint8Array> {
  const zip = new JSZip();
  let nextProject = project;
  if (project.background && backgroundBytes) {
    const filename = project.background.filename || "background";
    const ext = extFromMime(project.background.mimeType, filename);
    const asset = `${ASSETS_DIR}background${ext}`;
    zip.file(asset, backgroundBytes);
    nextProject = {
      ...project,
      background: { ...project.background, asset, filename },
    };
  }
  zip.file(PROJECT_JSON, JSON.stringify(nextProject, null, 2));
  const blob = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return blob;
}

export async function unpackProject(bytes: Uint8Array): Promise<PackedProject> {
  const zip = await JSZip.loadAsync(bytes);
  const jsonFile = zip.file(PROJECT_JSON);
  if (!jsonFile) throw new Error("Brak project.json w pliku .epaint");
  const raw = JSON.parse(await jsonFile.async("string"));
  const project = migrateProject(raw);
  let backgroundBytes: Uint8Array | null = null;
  const assetName = project.background?.asset;
  if (assetName) {
    const asset = zip.file(assetName);
    if (asset) backgroundBytes = await asset.async("uint8array");
  }
  return {
    project,
    backgroundBytes,
    backgroundFilename: project.background?.filename ?? null,
    backgroundMime: project.background?.mimeType ?? null,
  };
}

export function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

export async function dataUrlToBytes(dataUrl: string): Promise<{ bytes: Uint8Array; mime: string }> {
  const response = await fetch(dataUrl);
  const mime = response.headers.get("content-type") || "application/octet-stream";
  const buffer = await response.arrayBuffer();
  return { bytes: new Uint8Array(buffer), mime };
}
