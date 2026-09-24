import { useEffect, useState } from "react";
import { symbolByKind } from "../catalog/symbols";
import { formatMeters, lengthInMeters } from "../domain/geometry";
import { isCable, isSymbol, isText, type OverlayElement, type ScaleReference } from "../domain/types";
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
  const scaleReference = useEditor((s) => s.project.scaleReference);
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
        <div className="field">Długość: {cableLengthLabel(el.points, scaleReference)}</div>
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
