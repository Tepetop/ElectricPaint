import { useEffect, useRef, useState } from "react";
import { Editor } from "../editor/Editor";
import { preloadSymbolImages } from "../editor/images";
import {
  checkAutosave,
  exportCurrentPdf,
  exportCurrentPng,
  importBackgroundFile,
  loadDemoProject,
  openProjectFile,
  persistAutosave,
  restoreAutosave,
  saveProject,
} from "../services/documentActions";
import { isTauri } from "../services/desktop";
import { closeTab, fitView, getEditorState, hasUnsavedTabs, newProject, setRestoreAvailable, switchTab, useEditor } from "../state/editorStore";
import { RightPanel } from "../ui/RightPanel";
import { StatusBar } from "../ui/StatusBar";
import { SymbolPalette } from "../ui/SymbolPalette";
import { Toolbar } from "../ui/Toolbar";
import "./styles.css";

function isFloorPlanFile(file: File) {
  const name = file.name.toLowerCase();
  return (
    file.type === "application/pdf" ||
    file.type.startsWith("image/") ||
    name.endsWith(".pdf") ||
    name.endsWith(".dxf") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp")
  );
}

export function App() {
  const openRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const restoreAvailable = useEditor((s) => s.restoreAvailable);
  const tabs = useEditor((s) => s.tabs);
  const activeTabId = useEditor((s) => s.activeTabId);
  const needsInitialFit = useEditor((s) => s.needsInitialFit);
  const viewport = useEditor((s) => s.viewport);
  const [pdfPrompt, setPdfPrompt] = useState<{ file: File; pages: number; tabId: string } | null>(null);
  const [page, setPage] = useState(1);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    void preloadSymbolImages();
    void checkAutosave();
    const timer = window.setInterval(() => void persistAutosave(), 20000);
    const onLeave = (e: BeforeUnloadEvent) => {
      void persistAutosave();
      if (isTauri() || !hasUnsavedTabs()) return;
      e.preventDefault();
    };
    const onKeys = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveProject(e.shiftKey);
      }
      if (ctrl && e.key.toLowerCase() === "o") {
        e.preventDefault();
        openRef.current?.click();
      }
      if (ctrl && e.key.toLowerCase() === "n") {
        e.preventDefault();
        newProject();
      }
    };
    let cancelled = false;
    let unlistenClose: (() => void) | undefined;
    if (isTauri()) {
      void (async () => {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        if (cancelled) return;
        const win = getCurrentWindow();
        unlistenClose = await win.onCloseRequested(async (event) => {
          await persistAutosave();
          if (!hasUnsavedTabs()) return;
          event.preventDefault();
          const { ask } = await import("@tauri-apps/plugin-dialog");
          let discard = true;
          try {
            discard = await ask("Otwarte rzuty mają niezapisane zmiany. Zamknąć aplikację?", {
              title: "ElectricPaint",
              kind: "warning",
            });
          } catch {
            discard = true;
          }
          if (discard) await win.destroy();
        });
        if (cancelled) {
          unlistenClose();
          unlistenClose = undefined;
        }
      })();
    }
    window.addEventListener("beforeunload", onLeave);
    window.addEventListener("keydown", onKeys);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("beforeunload", onLeave);
      window.removeEventListener("keydown", onKeys);
      unlistenClose?.();
    };
  }, []);

  useEffect(() => {
    if (needsInitialFit) fitView();
  }, [activeTabId, needsInitialFit, viewport.width, viewport.height]);

  async function onImportFile(file: File | undefined, chosenPage?: number, tabId = getEditorState().activeTabId) {
    if (!file) return;
    try {
      const result = await importBackgroundFile(file, chosenPage, tabId);
      setImportError(null);
      if (result.needsPage) {
        setPdfPrompt({ file, pages: result.pages, tabId });
        setPage(1);
      } else {
        setPdfPrompt(null);
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Nie można wczytać rzutu");
    }
  }

  return (
    <div className="shell">
      <Toolbar
        onNew={() => newProject()}
        onOpen={() => openRef.current?.click()}
        onSave={() => void saveProject(false)}
        onSaveAs={() => void saveProject(true)}
        onImport={() => importRef.current?.click()}
        onDemo={loadDemoProject}
        onExportPng={() => void exportCurrentPng()}
        onExportPdf={() => void exportCurrentPdf()}
      />
      <div className="tab-bar" role="tablist" aria-label="Otwarte rzuty">
        {tabs.map((tab) => (
          <div className={`tab-item ${tab.id === activeTabId ? "active" : ""}`} key={tab.id}>
            <button type="button" role="tab" aria-selected={tab.id === activeTabId} onClick={() => switchTab(tab.id)}>
              {tab.title}{tab.dirty ? " •" : ""}
            </button>
            <button type="button" className="tab-close" aria-label={`Zamknij ${tab.title}`} onClick={() => {
              if (closeTab(tab.id)) void persistAutosave();
            }}>×</button>
          </div>
        ))}
        <button type="button" className="tab-add" onClick={newProject}>+ Nowa zakładka</button>
      </div>
      <SymbolPalette />
      <Editor />
      <RightPanel />
      <StatusBar />
      <input
        ref={openRef}
        className="hidden-file"
        data-testid="open-project"
        type="file"
        accept=".epaint,application/zip,application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp,.dxf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (isFloorPlanFile(file)) {
            void onImportFile(file);
            return;
          }
          void openProjectFile(file).catch((err) => {
            setImportError(err instanceof Error ? err.message : "Nie można otworzyć projektu");
          });
        }}
      />
      <input
        ref={importRef}
        className="hidden-file"
        data-testid="import-background"
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf,.dxf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void onImportFile(file);
        }}
      />
      {restoreAvailable && (
        <div className="banner">
          Znaleziono autosave.
          <button type="button" onClick={() => void restoreAutosave()}>Przywróć</button>
          <button type="button" onClick={() => setRestoreAvailable(false)}>Odrzuć</button>
        </div>
      )}
      {importError && (
        <div className="banner">
          {importError}
          <button type="button" onClick={() => setImportError(null)}>OK</button>
        </div>
      )}
      {pdfPrompt && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Wybierz stronę PDF</h3>
            <p>Dokument ma {pdfPrompt.pages} stron.</p>
            <label className="field">
              Numer strony
              <input
                type="number"
                min={1}
                max={pdfPrompt.pages}
                value={page}
                onChange={(e) => setPage(Number(e.target.value) || 1)}
              />
            </label>
            <div className="row">
              <button type="button" onClick={() => void onImportFile(pdfPrompt.file, page, pdfPrompt.tabId)}>Wczytaj</button>
              <button type="button" onClick={() => setPdfPrompt(null)}>Anuluj</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
