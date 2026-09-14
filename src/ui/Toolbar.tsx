import {
  fitView,
  redo,
  setShowGrid,
  setSnap,
  setZoom,
  undo,
  useEditor,
} from "../state/editorStore";

type Props = {
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onImport: () => void;
  onDemo: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
};

export function Toolbar(props: Props) {
  const zoom = useEditor((s) => s.zoom);
  const showGrid = useEditor((s) => s.showGrid);
  const snap = useEditor((s) => s.snap);
  const dirty = useEditor((s) => s.dirty);
  const filePath = useEditor((s) => s.filePath);
  const undoDepth = useEditor((s) => s.undoDepth);
  const redoDepth = useEditor((s) => s.redoDepth);

  return (
    <header className="toolbar">
      <h1>ElectricPaint</h1>
      <div className="group">
        <button type="button" onClick={props.onNew}>Nowy</button>
        <button type="button" onClick={props.onOpen}>Otwórz</button>
        <button type="button" onClick={props.onSave}>Zapisz</button>
        <button type="button" onClick={props.onSaveAs}>Zapisz jako</button>
        <button type="button" onClick={props.onImport}>Importuj rzut</button>
        <button type="button" onClick={props.onDemo}>Przykład</button>
      </div>
      <div className="sep" />
      <div className="group">
        <button type="button" disabled={undoDepth === 0} onClick={undo}>Cofnij</button>
        <button type="button" disabled={redoDepth === 0} onClick={redo}>Ponów</button>
      </div>
      <div className="sep" />
      <div className="group">
        <button type="button" onClick={() => setZoom(Math.max(0.1, zoom / 1.15))}>−</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom(Math.min(8, zoom * 1.15))}>+</button>
        <button type="button" onClick={fitView}>Dopasuj</button>
        <button type="button" className={showGrid ? "active" : ""} onClick={() => setShowGrid(!showGrid)}>Siatka</button>
        <button type="button" className={snap ? "active" : ""} onClick={() => setSnap(!snap)}>Przyciąganie</button>
      </div>
      <div className="sep" />
      <div className="group">
        <button type="button" onClick={props.onExportPng}>Eksport PNG</button>
        <button type="button" onClick={props.onExportPdf}>Eksport PDF</button>
      </div>
      <span className={dirty ? "dirty" : ""}>{dirty ? "Niezapisane" : filePath || "Nowy projekt"}</span>
    </header>
  );
}
