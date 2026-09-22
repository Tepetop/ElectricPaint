import { inspectPdf, loadImageBackground, rasterizePdfPage } from "./background";
import { loadDxfBackground } from "./dxfBackground";
import { clearAutosave, readAutosave, writeAutosave } from "./autosave";
import { makeDemoBackground } from "./demoProject";
import { isTauri, saveBytesWithDialog } from "./desktop";
import { bytesToDataUrl, dataUrlToBytes, packProject, unpackProject } from "./projectFiles";
import { migrateProject } from "../domain/migrations";
import { createEmptyProject } from "../domain/project";
import {
  confirmDiscard,
  getEditorState,
  loadEditorProject,
  markSaved,
  setBackground,
  setRestoreAvailable,
} from "../state/editorStore";
import { exportPdfBytes, exportPngBytes } from "../editor/exportDoc";
import { addCable, addGroup, addSymbol, assignSelectedToGroup } from "../domain/commands";

export async function importBackgroundFile(file: File, page?: number) {
  if (file.name.toLowerCase().endsWith(".dxf")) {
    const loaded = await loadDxfBackground(file);
    setBackground(
      {
        kind: "dxf",
        filename: file.name,
        mimeType: "image/png",
        width: loaded.width,
        height: loaded.height,
        asset: "assets/background.png",
      },
      loaded.dataUrl,
      { width: loaded.width, height: loaded.height },
    );
    return { needsPage: false as const, pages: 1 };
  }
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const { pages, pdf } = await inspectPdf(file);
    const chosen = page ?? (pages === 1 ? 1 : NaN);
    if (!Number.isFinite(chosen)) {
      return { needsPage: true as const, pages };
    }
    const loaded = await rasterizePdfPage(pdf, chosen);
    setBackground(
      {
        kind: "pdf",
        filename: file.name,
        mimeType: "image/png",
        width: loaded.width,
        height: loaded.height,
        page: chosen,
        asset: "assets/background.png",
      },
      loaded.dataUrl,
      { width: loaded.width, height: loaded.height },
    );
    return { needsPage: false as const, pages };
  }
  const loaded = await loadImageBackground(file);
  setBackground(
    {
      kind: "image",
      filename: loaded.filename,
      mimeType: loaded.mimeType,
      width: loaded.width,
      height: loaded.height,
      asset: "assets/background",
    },
    loaded.dataUrl,
    { width: loaded.width, height: loaded.height },
  );
  return { needsPage: false as const, pages: 1 };
}

export async function saveProject(saveAs: boolean) {
  const { project, backgroundDataUrl, filePath } = getEditorState();
  const backgroundBytes = backgroundDataUrl ? (await dataUrlToBytes(backgroundDataUrl)).bytes : null;
  const packed = await packProject(project, backgroundBytes);
  const suggested = `${project.name || "projekt"}.epaint`;
  if (!saveAs && filePath && isTauri() && /[\\/]/.test(filePath)) {
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    await writeFile(filePath, packed);
    markSaved(filePath);
    await clearAutosave();
    return;
  }
  const path = await saveBytesWithDialog(suggested, packed, [
    { name: "ElectricPaint", extensions: ["epaint"] },
  ]);
  if (path) {
    markSaved(path);
    await clearAutosave();
  }
}

export async function openProjectFile(file: File) {
  if (!confirmDiscard()) return;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const packed = await unpackProject(bytes);
  const dataUrl =
    packed.backgroundBytes && packed.backgroundMime
      ? bytesToDataUrl(packed.backgroundBytes, packed.backgroundMime)
      : null;
  loadEditorProject(packed.project, dataUrl, file.name);
  await clearAutosave();
}

export async function exportCurrentPng() {
  const { project, backgroundDataUrl } = getEditorState();
  const bytes = await exportPngBytes(project, backgroundDataUrl, 2);
  await saveBytesWithDialog(`${project.name || "rzut"}.png`, bytes, [{ name: "PNG", extensions: ["png"] }]);
}

export async function exportCurrentPdf() {
  const { project, backgroundDataUrl } = getEditorState();
  const bytes = await exportPdfBytes(project, backgroundDataUrl);
  await saveBytesWithDialog(`${project.name || "rzut"}.pdf`, bytes, [{ name: "PDF", extensions: ["pdf"] }]);
}

export function loadDemoProject() {
  if (!confirmDiscard()) return;
  const dataUrl = makeDemoBackground();
  let project = createEmptyProject("Przykładowe mieszkanie");
  project = {
    ...project,
    canvas: { width: 1400, height: 900 },
    background: {
      kind: "image",
      filename: "demo.png",
      mimeType: "image/png",
      width: 1400,
      height: 900,
      asset: "assets/background.png",
    },
  };
  const layerId = project.layers[0].id;
  project = addSymbol(project, { kind: "switch-single", layerId, x: 120, y: 180 });
  project = addSymbol(project, { kind: "luminaire", layerId, x: 240, y: 160 });
  project = addSymbol(project, { kind: "socket-single", layerId, x: 420, y: 300 });
  project = addCable(project, {
    layerId,
    points: [
      { x: 80, y: 700 },
      { x: 400, y: 700 },
      { x: 400, y: 820 },
    ],
    color: "#b45309",
    name: "Oświetlenie salon",
  });
  project = addGroup(project, "S1");
  const switches = project.elements.filter((el) => el.type === "symbol" && el.kind === "switch-single");
  const lights = project.elements.filter((el) => el.type === "symbol" && el.kind === "luminaire");
  project = assignSelectedToGroup(project, project.groups[0].id, [switches[0].id, lights[0].id]);
  loadEditorProject(project, dataUrl, null);
}

export async function persistAutosave() {
  const { project, backgroundDataUrl, filePath, dirty } = getEditorState();
  if (!dirty) return;
  await writeAutosave({
    projectJson: JSON.stringify(project),
    backgroundDataUrl,
    filePath,
    savedAt: Date.now(),
  });
}

export async function restoreAutosave() {
  const payload = await readAutosave();
  if (!payload) return;
  const project = migrateProject(JSON.parse(payload.projectJson));
  loadEditorProject(project, payload.backgroundDataUrl, payload.filePath);
  setRestoreAvailable(false);
}

export async function checkAutosave() {
  const payload = await readAutosave();
  setRestoreAvailable(Boolean(payload));
}
