import { afterEach, describe, expect, it, vi } from "vitest";
import { inspectPdf, rasterizePdfPage } from "./background";
import { clearAutosave, readAutosave, writeAutosave } from "./autosave";
import { writeFile } from "@tauri-apps/plugin-fs";
import { isTauri, saveBytesWithDialog } from "./desktop";
import { bindProjectHandle, importBackgroundFile, openProjectFile, persistAutosave, restoreAutosave, saveProject } from "./documentActions";
import { packProject } from "./projectFiles";
import { getEditorState, getTabState, newProject, placeAt, resetEditorForTests, setPendingSymbol, switchTab } from "../state/editorStore";
import { createEmptyProject } from "../domain/project";

vi.mock("./autosave", () => ({
  clearAutosave: vi.fn().mockResolvedValue(undefined),
  readAutosave: vi.fn().mockResolvedValue(null),
  writeAutosave: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./desktop", () => ({
  isTauri: vi.fn(() => false),
  saveBytesWithDialog: vi.fn().mockResolvedValue("zapis.epaint"),
}));
vi.mock("@tauri-apps/plugin-fs", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn(),
}));
vi.mock("./background", () => ({
  inspectPdf: vi.fn(),
  rasterizePdfPage: vi.fn(),
  loadImageBackground: vi.fn(),
}));
vi.mock("../editor/exportDoc", () => ({
  exportPdfBytes: vi.fn(),
  exportPngBytes: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.mocked(isTauri).mockImplementation(() => false);
  resetEditorForTests();
});

async function epaintFile(name: string) {
  const bytes = await packProject(createEmptyProject("Dom"), null);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const file = new File([copy], name);
  file.arrayBuffer = async () => copy.buffer;
  return file;
}

describe("document actions with tabs", () => {
  it("zapis po przełączeniu oznacza jako zapisany rzut, który rozpoczął operację", async () => {
    setPendingSymbol("switch-single");
    placeAt({ x: 20, y: 20 });
    const firstId = getEditorState().activeTabId;
    const saving = saveProject(false);
    newProject();
    setPendingSymbol("socket-single");
    placeAt({ x: 40, y: 40 });
    const secondId = getEditorState().activeTabId;
    await saving;
    expect(saveBytesWithDialog).toHaveBeenCalledOnce();
    expect(getTabState(firstId)?.dirty).toBe(false);
    expect(getTabState(firstId)?.filePath).toBe("zapis.epaint");
    expect(getTabState(secondId)?.dirty).toBe(true);
    expect(getTabState(secondId)?.filePath).toBeNull();
  });

  it("autosave zapisuje tylko zmienione zakładki i nie kasuje pozostałych po zapisie", async () => {
    setPendingSymbol("switch-single");
    placeAt({ x: 20, y: 20 });
    const firstId = getEditorState().activeTabId;
    newProject();
    setPendingSymbol("socket-single");
    placeAt({ x: 40, y: 40 });
    const secondId = getEditorState().activeTabId;
    await persistAutosave();
    const firstBundle = vi.mocked(writeAutosave).mock.lastCall?.[0];
    expect(firstBundle && "tabs" in firstBundle && firstBundle.tabs.map((tab) => tab.id)).toEqual([firstId, secondId]);
    switchTab(firstId);
    await saveProject(false);
    const secondBundle = vi.mocked(writeAutosave).mock.lastCall?.[0];
    expect(secondBundle && "tabs" in secondBundle && secondBundle.tabs.map((tab) => tab.id)).toEqual([secondId]);
    expect(clearAutosave).not.toHaveBeenCalled();
  });

  it("wynik importu PDF trafia do zakładki, która rozpoczęła import", async () => {
    const firstId = getEditorState().activeTabId;
    let resolvePage!: (value: Awaited<ReturnType<typeof rasterizePdfPage>>) => void;
    const pageResult = new Promise<Awaited<ReturnType<typeof rasterizePdfPage>>>((resolve) => { resolvePage = resolve; });
    vi.mocked(inspectPdf).mockResolvedValue({ pages: 1, pdf: {} as Awaited<ReturnType<typeof inspectPdf>>["pdf"] });
    vi.mocked(rasterizePdfPage).mockReturnValue(pageResult);
    const loading = importBackgroundFile(new File(["pdf"], "rzut.pdf", { type: "application/pdf" }), 1, firstId);
    newProject();
    const secondId = getEditorState().activeTabId;
    resolvePage({ dataUrl: "data:image/png;base64,AA==", filename: "strona-1.png", mimeType: "image/png", width: 400, height: 300, kind: "pdf", page: 1 });
    await loading;
    expect(getTabState(firstId)?.project.background?.kind).toBe("pdf");
    expect(getTabState(firstId)?.backgroundDataUrl).toBe("data:image/png;base64,AA==");
    expect(getTabState(secondId)?.project.background).toBeNull();
  });

  it("zapis otwartego projektu nadpisuje ten plik", async () => {
    vi.mocked(isTauri).mockReturnValue(true);
    await openProjectFile(await epaintFile("dom.epaint"), "/home/tepe/rzuty/dom.epaint");
    setPendingSymbol("switch-single");
    placeAt({ x: 10, y: 10 });
    await saveProject(false);
    expect(writeFile).toHaveBeenCalledWith("/home/tepe/rzuty/dom.epaint", expect.any(Uint8Array));
    expect(saveBytesWithDialog).not.toHaveBeenCalled();
    expect(getEditorState().dirty).toBe(false);
    expect(getEditorState().filePath).toBe("/home/tepe/rzuty/dom.epaint");
    vi.mocked(writeFile).mockClear();
    await saveProject(true);
    expect(writeFile).not.toHaveBeenCalled();
    expect(saveBytesWithDialog).toHaveBeenCalledOnce();
  });

  it("sama nazwa pliku nie jest zapisywana w katalogu roboczym", async () => {
    vi.mocked(isTauri).mockReturnValue(true);
    await openProjectFile(await epaintFile("dom.epaint"));
    await saveProject(false);
    expect(writeFile).not.toHaveBeenCalled();
    expect(saveBytesWithDialog).toHaveBeenCalledOnce();
  });

  it("zapis w przeglądarce aktualizuje otwarty plik", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn().mockResolvedValue(undefined);
    const handle = {
      name: "dom.epaint",
      createWritable: vi.fn().mockResolvedValue({ write, close }),
    } as unknown as FileSystemFileHandle;
    const tabId = await openProjectFile(await epaintFile("dom.epaint"));
    bindProjectHandle(tabId!, handle);
    setPendingSymbol("switch-single");
    placeAt({ x: 10, y: 10 });
    await saveProject(false);
    expect(write).toHaveBeenCalledWith(expect.any(Uint8Array));
    expect(close).toHaveBeenCalledOnce();
    expect(saveBytesWithDialog).not.toHaveBeenCalled();
    expect(getEditorState().dirty).toBe(false);
    expect(getEditorState().filePath).toBe("dom.epaint");
  });

  it("odczytuje dawny autosave pojedynczego rzutu", async () => {
    const project = createEmptyProject("Odzyskany");
    vi.mocked(readAutosave).mockResolvedValueOnce({ projectJson: JSON.stringify(project), backgroundDataUrl: null, filePath: "stary.epaint", savedAt: 1 });
    await restoreAutosave();
    expect(getEditorState().tabs).toHaveLength(1);
    expect(getEditorState().project.name).toBe("Odzyskany");
    expect(getEditorState().dirty).toBe(true);
  });

  it("przywraca wiele niezapisanych zakładek z ich widokami", async () => {
    const first = createEmptyProject("Piętro 1");
    const second = createEmptyProject("Piętro 2");
    vi.mocked(readAutosave).mockResolvedValueOnce({
      version: 2,
      activeTabId: "second",
      tabs: [
        { id: "first", title: "Piętro 1", projectJson: JSON.stringify(first), backgroundDataUrl: null, filePath: "p1.epaint", zoom: 1.4, pan: { x: 10, y: 20 }, savedAt: 1 },
        { id: "second", title: "Piętro 2", projectJson: JSON.stringify(second), backgroundDataUrl: null, filePath: "p2.epaint", zoom: 2.2, pan: { x: 30, y: 40 }, savedAt: 1 },
      ],
    });
    await restoreAutosave();
    expect(getEditorState().tabs).toHaveLength(2);
    expect(getEditorState().activeTabId).toBe("second");
    expect(getEditorState().zoom).toBe(2.2);
    switchTab("first");
    expect(getEditorState().project.name).toBe("Piętro 1");
    expect(getEditorState().pan).toEqual({ x: 10, y: 20 });
    expect(getEditorState().dirty).toBe(true);
  });
});
