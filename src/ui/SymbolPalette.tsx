import { useEffect, useMemo, useState } from "react";
import { CATEGORY_LABELS, SYMBOL_CATALOG, symbolDataUrl, type SymbolCategory } from "../catalog/symbols";
import { metersToMm, mmToMeters } from "../domain/geometry";
import { isSymbol } from "../domain/types";
import {
  commitApplySymbolScale,
  commitScaleAllSymbols,
  commitScaleLength,
  clearSelection,
  setCableStyle,
  setMultiSelect,
  setPendingSymbol,
  setTool,
  useEditor,
} from "../state/editorStore";

const COLORS = ["#1d4ed8", "#b91c1c", "#15803d", "#b45309", "#6d28d9", "#111827", "#0f766e"];

export function SymbolPalette() {
  const tool = useEditor((s) => s.tool);
  const pending = useEditor((s) => s.pendingSymbolKind);
  const cableColor = useEditor((s) => s.cableColor);
  const cableWidth = useEditor((s) => s.cableWidth);
  const cableStyle = useEditor((s) => s.cableStyle);
  const defaultSymbolScale = useEditor((s) => s.project.defaultSymbolScale);
  const scaleReference = useEditor((s) => s.project.scaleReference);
  const selectedIds = useEditor((s) => s.selectedIds);
  const multiSelect = useEditor((s) => s.multiSelect);
  const elements = useEditor((s) => s.project.elements);
  const [query, setQuery] = useState("");

  const selected = selectedIds.length === 1
    ? elements.find((el) => el.id === selectedIds[0])
    : undefined;
  const selectedSymbol = selected && isSymbol(selected) ? selected : undefined;
  const scaleValue = selectedSymbol?.scale ?? defaultSymbolScale;
  const [scaleDraft, setScaleDraft] = useState(String(scaleValue));
  useEffect(() => setScaleDraft(String(scaleValue)), [scaleValue]);
  const scalePoints = useEditor((s) => s.scaleDraft);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SYMBOL_CATALOG.filter((item) => !q || item.name.toLowerCase().includes(q) || item.kind.includes(q));
  }, [query]);

  const categories = ["switches", "sockets", "lighting", "other"] as SymbolCategory[];

  return (
    <aside className="left-panel">
      <h2 className="panel-title">Narzędzia</h2>
      <div className="tool-row">
        <button type="button" className={tool === "select" && !multiSelect ? "active" : ""} onClick={() => setMultiSelect(false)}>Zaznacz</button>
        <button type="button" className={multiSelect ? "active" : ""} aria-pressed={multiSelect} onClick={() => setMultiSelect(!multiSelect)}>Wybór wielu</button>
        <button type="button" className={tool === "pan" ? "active" : ""} onClick={() => setTool("pan")}>Przesuwanie</button>
        <button type="button" className={tool === "cable" ? "active" : ""} onClick={() => setTool("cable")}>Przewód</button>
        <button type="button" className={tool === "scale" ? "active" : ""} onClick={() => setTool("scale")}>Skala rzutu</button>
        <button type="button" className={tool === "text" ? "active" : ""} onClick={() => setTool("text")}>Tekst</button>
      </div>
      {tool === "select" && (
        <div className="section">
          <p className="legend">{multiSelect ? "Klikaj symbole, aby dodawać je do zaznaczenia lub usuwać z niego. Zaznaczone elementy przeniesiesz razem w polu Warstwa po prawej." : "Wybierz wiele symboli przyciskiem Wybór wielu, klawiszem Shift albo przeciągając ramkę na rzucie."}</p>
          {selectedIds.length > 0 && <button type="button" onClick={clearSelection}>Wyczyść zaznaczenie ({selectedIds.length})</button>}
        </div>
      )}
      <div className="section">
        <label className="field">Skaluj symbol
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={scaleDraft}
            onChange={(e) => {
              const raw = e.target.value;
              setScaleDraft(raw);
              if (raw.trim() === "") return;
              const value = Number(raw);
              if (Number.isFinite(value) && value > 0) commitApplySymbolScale(value);
            }}
          />
        </label>
        <button type="button" onClick={() => {
          const value = scaleDraft.trim() === "" ? NaN : Number(scaleDraft);
          commitScaleAllSymbols(value);
        }}>Skaluj wszystkie</button>
        <p className="legend">Nowe symbole dostają tę skalę. Zaznaczony symbol też zostanie przeskalowany.</p>
      </div>
      {tool === "scale" && (
        <div className="section">
          <p className="legend">Kliknij dwa punkty na rzucie (np. krawędzie okna), potem wpisz rzeczywistą długość w milimetrach.</p>
        </div>
      )}
      {tool === "scale" && (scalePoints.length === 2 || (scalePoints.length === 0 && scaleReference)) && (
        <ScaleLengthField key={scalePoints.length === 2 ? `${scalePoints[0].x},${scalePoints[0].y}:${scalePoints[1].x},${scalePoints[1].y}` : "saved"} lengthM={scaleReference?.lengthM ?? null} />
      )}
      {tool === "cable" && (
        <div className="section">
          <label className="field">Kolor
            <div className="row">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={cableColor === color ? "active" : ""}
                  style={{ background: color, width: 22, height: 22, padding: 0 }}
                  onClick={() => setCableStyle({ cableColor: color })}
                  aria-label={color}
                />
              ))}
              <input type="color" value={cableColor} onChange={(e) => setCableStyle({ cableColor: e.target.value })} />
            </div>
          </label>
          <label className="field">Grubość
            <input type="number" min={1} max={12} value={cableWidth} onChange={(e) => setCableStyle({ cableWidth: Number(e.target.value) || 3 })} />
          </label>
          <label className="field">Styl
            <select value={cableStyle} onChange={(e) => setCableStyle({ cableStyle: e.target.value as "solid" | "dashed" })}>
              <option value="solid">Ciągła</option>
              <option value="dashed">Przerywana</option>
            </select>
          </label>
          <p className="legend">Przytrzymaj LPM i ciągnij prosty odcinek. Puszczenie zatwierdza, kolejny odcinek dokłada się od końca. PPM kończy trasę.</p>
        </div>
      )}
      <h2 className="panel-title">Symbole</h2>
      <input className="search" placeholder="Szukaj symbolu…" value={query} onChange={(e) => setQuery(e.target.value)} />
      {categories.map((category) => {
        const items = filtered.filter((item) => item.category === category);
        if (items.length === 0) return null;
        return (
          <div key={category}>
            <div className="symbol-cat">{CATEGORY_LABELS[category]}</div>
            <div className="symbol-grid">
              {items.map((item) => (
                <button
                  key={item.kind}
                  type="button"
                  className={pending === item.kind ? "active" : ""}
                  onClick={() => setPendingSymbol(item.kind)}
                >
                  <span className="symbol-btn">
                    <img src={symbolDataUrl(item)} alt="" />
                    {item.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </aside>
  );
}

function ScaleLengthField({ lengthM }: { lengthM: number | null }) {
  const display = lengthM == null ? "" : String(metersToMm(lengthM));
  const [draft, setDraft] = useState(display);
  useEffect(() => {
    setDraft(display);
  }, [display]);

  return (
    <div className="section">
      <label className="field">Długość odcinka (mm)
        <input
          type="number"
          step="1"
          min="1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      </label>
      <button type="button" onClick={() => {
        const value = draft.trim() === "" ? NaN : Number(draft);
        if (Number.isFinite(value) && value > 0) commitScaleLength(mmToMeters(value));
      }}>Zatwierdź skalę</button>
    </div>
  );
}
