import { symbolByKind } from "../catalog/symbols";
import { isCable, isSymbol, isText, type OverlayElement } from "../domain/types";
import { commitElementPatch, useEditor } from "../state/editorStore";

export function PropertiesPanel() {
  const selectedIds = useEditor((s) => s.selectedIds);
  const elements = useEditor((s) => s.project.elements);
  const selected = elements.filter((el) => selectedIds.includes(el.id));
  if (selected.length === 0) {
    return <p className="legend">Zaznacz element, aby edytować właściwości.</p>;
  }
  if (selected.length > 1) {
    return <p className="legend">Zaznaczono {selected.length} elementów.</p>;
  }
  const el = selected[0];
  return <SingleProps el={el} />;
}

function SingleProps({ el }: { el: OverlayElement }) {
  if (isSymbol(el)) {
    return (
      <div>
        <div className="field">Symbol: {symbolByKind(el.kind)?.name}</div>
        <label className="field">Oznaczenie
          <input value={el.label} onChange={(e) => commitElementPatch(el.id, { label: e.target.value })} />
        </label>
        <label className="field">Obrót
          <input type="number" value={Math.round(el.rotation)} onChange={(e) => commitElementPatch(el.id, { rotation: Number(e.target.value) || 0 })} />
        </label>
        <label className="field">Skala
          <input type="number" step="0.1" value={el.scale} onChange={(e) => commitElementPatch(el.id, { scale: Number(e.target.value) || 1 })} />
        </label>
      </div>
    );
  }
  if (isCable(el)) {
    return (
      <div>
        <label className="field">Nazwa
          <input value={el.name} onChange={(e) => commitElementPatch(el.id, { name: e.target.value })} />
        </label>
        <label className="field">Kolor
          <input type="color" value={el.color} onChange={(e) => commitElementPatch(el.id, { color: e.target.value })} />
        </label>
        <label className="field">Grubość
          <input type="number" min={1} max={16} value={el.width} onChange={(e) => commitElementPatch(el.id, { width: Number(e.target.value) || 3 })} />
        </label>
        <label className="field">Styl
          <select value={el.style} onChange={(e) => commitElementPatch(el.id, { style: e.target.value as "solid" | "dashed" })}>
            <option value="solid">Ciągła</option>
            <option value="dashed">Przerywana</option>
          </select>
        </label>
      </div>
    );
  }
  if (isText(el)) {
    return (
      <label className="field">Tekst
        <input value={el.text} onChange={(e) => commitElementPatch(el.id, { text: e.target.value })} />
      </label>
    );
  }
  return null;
}
