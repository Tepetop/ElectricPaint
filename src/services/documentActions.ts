import { inspectPdf, loadImageBackground, rasterizePdfPage } from "./background";
import { loadDxfBackground } from "./dxfBackground";
import { clearAutosave, readAutosave, writeAutosave, type AutosaveBundle } from "./autosave";
import { makeDemoBackground } from "./demoProject";
import { isTauri, saveBytesWithDialog } from "./desktop";
import { bytesToDataUrl, dataUrlToBytes, packProject, unpackProject } from "./projectFiles";
import { migrateProject } from "../domain/migrations";
import { createEmptyProject, defaultSymbolLayerId, layerIdByName } from "../domain/project";
import {
  getEditorState,
  getTabStates,
  loadEditorProject,
  markSaved,
  restoreEditorTabs,
  setBackground,
  setRestoreAvailable,
} from "../state/editorStore";
import { exportPdfBytes, exportPngBytes } from "../editor/exportDoc";
import { addCable, addGroup, addSymbol, assignSelectedToGroup } from "../domain/commands";

export async function importBackgroundFile(file: File, page?: number, tabId = getEditorState().activeTabId) {
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
      tabId,
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
      tabId,
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
    tabId,
  );
  return { needsPage: false as const, pages: 1 };
}

const projectHandles = new Map<string, FileSystemFileHandle>();

export function bindProjectHandle(tabId: string, handle: FileSystemFileHandle) {
  projectHandles.set(tabId, handle);
}

export function forgetProjectHandle(tabId: string) {
  projectHandles.delete(tabId);
}

export async function saveProject(saveAs: boolean) {
  const { project, backgroundDataUrl, filePath, activeTabId, editRevision } = getEditorState();
  const backgroundBytes = backgroundDataUrl ? (await dataUrlToBytes(backgroundDataUrl)).bytes : null;
  const packed = await packProject(project, backgroundBytes);
  const opened = projectHandles.get(activeTabId);
  if (!saveAs && opened) {
    const writable = await opened.createWritable();
    const copy = new Uint8Array(packed.byteLength);
    copy.set(packed);
    await writable.write(copy);
    await writable.close();
    markSaved(activeTabId, filePath ?? opened.name, editRevision);
    await persistAutosave();
    return;
  }
  const suggested = `${project.name || "projekt"}.epaint`;
  if (!saveAs && filePath && isTauri() && /[\\/]/.test(filePath)) {
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    await writeFile(filePath, packed);
    markSaved(activeTabId, filePath, editRevision);
    await persistAutosave();
    return;
  }
  const path = await saveBytesWithDialog(suggested, packed, [
    { name: "ElectricPaint", extensions: ["epaint"] },
  ]);
  if (path) {
    if (saveAs) projectHandles.delete(activeTabId);
    markSaved(activeTabId, path, editRevision);
    await persistAutosave();
  }
}

export async function openProjectFile(file: File, storedPath = file.name): Promise<string | null> {
  if (getTabStates().some((tab) => tab.filePath?.split(/[\\/]/).pop() === file.name)
    && !window.confirm(`Plik „${file.name}” jest już otwarty. Otworzyć drugi raz? Zapis może nadpisać ten sam plik.`)) return null;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const packed = await unpackProject(bytes);
  const dataUrl =
    packed.backgroundBytes && packed.backgroundMime
      ? bytesToDataUrl(packed.backgroundBytes, packed.backgroundMime)
      : null;
  loadEditorProject(packed.project, dataUrl, storedPath);
  return getEditorState().activeTabId;
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
  const fallbackLayerId = project.layers[0].id;
  project = addSymbol(project, { kind: "switch-single", layerId: defaultSymbolLayerId(project, "switch-single", fallbackLayerId), x: 120, y: 180 });
  project = addSymbol(project, { kind: "luminaire", layerId: defaultSymbolLayerId(project, "luminaire", fallbackLayerId), x: 240, y: 160 });
  project = addSymbol(project, { kind: "socket-single", layerId: defaultSymbolLayerId(project, "socket-single", fallbackLayerId), x: 420, y: 300 });
  project = addCable(project, {
    layerId: layerIdByName(project, "Przewody", fallbackLayerId),
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

let autosaveQueue = Promise.resolve();

export function persistAutosave(): Promise<void> {
  const next = autosaveQueue.catch(() => {}).then(async () => {
    const dirtyTabs = getTabStates().filter((tab) => tab.dirty);
    if (dirtyTabs.length === 0) {
      await clearAutosave();
      return;
    }
    const bundle: AutosaveBundle = {
      version: 2,
      activeTabId: getEditorState().activeTabId,
      tabs: dirtyTabs.map((tab) => ({
        id: tab.activeTabId,
        title: tab.tabTitle,
        projectJson: JSON.stringify(tab.project),
        backgroundDataUrl: tab.backgroundDataUrl,
        filePath: tab.filePath,
        zoom: tab.zoom,
        pan: tab.pan,
        savedAt: Date.now(),
      })),
    };
    await writeAutosave(bundle);
  });
  autosaveQueue = next.catch(() => {});
  return next;
}

export async function restoreAutosave() {
  const payload = await readAutosave();
  if (!payload) return;
  if ("tabs" in payload) {
    restoreEditorTabs(payload.tabs.map((tab) => ({
      id: tab.id,
      project: migrateProject(JSON.parse(tab.projectJson)),
      backgroundDataUrl: tab.backgroundDataUrl,
      filePath: tab.filePath,
      tabTitle: tab.title,
      zoom: tab.zoom,
      pan: tab.pan,
    })), payload.activeTabId);
  } else {
    const project = migrateProject(JSON.parse(payload.projectJson));
    restoreEditorTabs([{ project, backgroundDataUrl: payload.backgroundDataUrl, filePath: payload.filePath }]);
  }
  setRestoreAvailable(false);
}

export async function checkAutosave() {
  const payload = await readAutosave();
  setRestoreAvailable(Boolean(payload && (!("tabs" in payload) || payload.tabs.length > 0)));
}
