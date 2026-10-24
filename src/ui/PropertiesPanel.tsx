import { useEffect, useState } from "react";
import { symbolByKind } from "../catalog/symbols";
import { formatMeters, lengthInMeters } from "../domain/geometry";
import { isCable, isSymbol, isText, type CableRoute, type OverlayElement, type ScaleReference } from "../domain/types";
import { commitAssignSelectedToCable, commitElementPatch, commitMoveElementsToLayer, useEditor } from "../state/editorStore";

export function PropertiesPanel() {
  const selectedIds = useEditor((s) => s.selectedIds);
  const elements = useEditor((s) => s.project.elements);
  const layers = useEditor((s) => s.project.layers);
  const selected = elements.filter((el) => selectedIds.includes(el.id));
  if (selected.length === 0) {
    return <p className="legend">Zaznacz element, aby edytować właściwości.</p>;
  }
  const cables = selected.filter(isCable);
  const cableWithSymbols = cables.length === 1 && selected.every((el) => isCable(el) || isSymbol(el));
  if (selected.length > 1 && !cableWithSymbols) {
    return <div>
      <p className="legend">Zaznaczono {selected.length} elementów.</p>
      <LayerField selected={selected} layers={layers} />
    </div>;
  }
  if (selected.length > 1 && cableWithSymbols) {
    return <div>
      <p className="legend">Zaznaczono {selected.length} elementów.</p>
      <LayerField selected={selected} layers={layers} />
      <CableProps el={cables[0]} />
    </div>;
  }
  const el = selected[0];
  return <div><LayerField selected={selected} layers={layers} /><SingleProps el={el} /></div>;
}

function LayerField({ selected, layers }: { selected: OverlayElement[]; layers: { id: string; name: string }[] }) {
  const layerId = selected.every((el) => el.layerId === selected[0].layerId) ? selected[0].layerId : "";
  return <label className="field">Warstwa
    <select value={layerId} onChange={(e) => commitMoveElementsToLayer(selected.map((el) => el.id), e.target.value)}>
      {!layerId && <option value="" disabled>Różne warstwy</option>}
      {layers.map((layer) => <option key={layer.id} value={layer.id}>{layer.name}</option>)}
    </select>
  </label>;
}

function SingleProps({ el }: { el: OverlayElement }) {
  if (isSymbol(el)) {
    return (
      <div>
        <div className="field">Symbol: {symbolByKind(el.kind)?.name}</div>
        <label className="field">Oznaczenie
          <input value={el.label} onChange={(e) => commitElementPatch(el.id, { label: e.target.value })} />
        </label>
        <label className="field">Opis
          <textarea rows={3} value={el.description ?? ""} onChange={(e) => commitElementPatch(el.id, { description: e.target.value })} />
        </label>
        <RotationField id={el.id} rotation={el.rotation} />
        <label className="field">Skala
          <input type="number" step="0.1" value={el.scale} onChange={(e) => commitElementPatch(el.id, { scale: Number(e.target.value) || 1 })} />
        </label>
        <LabelOffsetFields id={el.id} offset={el.labelOffset} />
      </div>
    );
  }
  if (isCable(el)) {
    return <CableProps el={el} />;
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

function CableProps({ el }: { el: CableRoute }) {
  const scaleReference = useEditor((s) => s.project.scaleReference);
  const elements = useEditor((s) => s.project.elements);
  const selectedIds = useEditor((s) => s.selectedIds);
  const pending = selectedIds.filter((id) => {
    if (el.symbolIds.includes(id)) return false;
    const item = elements.find((entry) => entry.id === id);
    return Boolean(item && isSymbol(item));
  });
  return (
    <div>
      <label className="field">Nazwa
        <input value={el.name} onChange={(e) => commitElementPatch(el.id, { name: e.target.value })} />
      </label>
      <label className="field">Opis
        <textarea rows={3} value={el.description ?? ""} onChange={(e) => commitElementPatch(el.id, { description: e.target.value })} />
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
      <div className="field">Długość: {cableLengthLabel(el.points, scaleReference)}</div>
      <div className="field">Podłączone symbole
        {el.symbolIds.length === 0 && <p className="legend">brak</p>}
        {el.symbolIds.map((id) => {
          const symbol = elements.find((item) => item.id === id);
          const label = symbol && isSymbol(symbol)
            ? `${symbol.label} (${symbolByKind(symbol.kind)?.name ?? symbol.kind})`
            : id;
          return (
            <div key={id} className="row">
              <span>{label}</span>
              <button type="button" onClick={() => commitElementPatch(el.id, { symbolIds: el.symbolIds.filter((item) => item !== id) })}>
                Odłącz
              </button>
            </div>
          );
        })}
        <button type="button" disabled={pending.length === 0} onClick={() => commitAssignSelectedToCable(el.id)}>
          Dodaj zaznaczone
        </button>
        <p className="legend">Zaznacz symbole razem z przewodem (Shift albo Wybór wielu), potem dodaj je do trasy.</p>
      </div>
    </div>
  );
}

function cableLengthLabel(points: { x: number; y: number }[], scaleReference: ScaleReference | null) {
  const meters = lengthInMeters(points, scaleReference);
  return meters == null ? "brak skali" : formatMeters(meters);
}

function LabelOffsetFields({ id, offset }: { id: string; offset?: { x: number; y: number } }) {
  const x = offset?.x ?? 0;
  const y = offset?.y ?? 0;
  return (
    <>
      <OffsetAxis id={id} axis="x" value={x} other={y} />
      <OffsetAxis id={id} axis="y" value={y} other={x} />
    </>
  );
}

function OffsetAxis({ id, axis, value, other }: { id: string; axis: "x" | "y"; value: number; other: number }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => {
    setDraft(String(value));
  }, [id, value]);
  const label = axis === "x" ? "Przesunięcie opisu X" : "Przesunięcie opisu Y";
  return (
    <label className="field">{label}
      <input
        type="number"
        value={draft}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          if (raw === "" || raw === "-" || raw === "+") return;
          const next = Number(raw);
          if (Number.isNaN(next)) return;
          commitElementPatch(id, { labelOffset: axis === "x" ? { x: next, y: other } : { x: other, y: next } });
        }}
        onBlur={() => setDraft(String(value))}
      />
    </label>
  );
}

function RotationField({ id, rotation }: { id: string; rotation: number }) {
  const display = Math.round(rotation);
  const [draft, setDraft] = useState(String(display));
  useEffect(() => {
    setDraft(String(display));
  }, [id, display]);

  return (
    <label className="field">Obrót
      <input
        type="number"
        value={draft}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          if (raw === "" || raw === "-" || raw === "+") return;
          const next = Number(raw);
          if (Number.isNaN(next)) return;
          commitElementPatch(id, { rotation: next });
        }}
        onBlur={() => setDraft(String(display))}
      />
    </label>
  );
}
