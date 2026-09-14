import {
  commitAddLayer,
  commitDeleteLayer,
  commitReorderLayer,
  commitUpdateLayer,
  setActiveLayer,
  useEditor,
} from "../state/editorStore";

export function LayersPanel() {
  const layers = useEditor((s) => s.project.layers);
  const activeLayerId = useEditor((s) => s.activeLayerId);
  const elements = useEditor((s) => s.project.elements);

  function remove(layerId: string) {
    if (layers.length <= 1) return;
    const count = elements.filter((el) => el.layerId === layerId).length;
    const others = layers.filter((l) => l.id !== layerId);
    if (count === 0) {
      commitDeleteLayer(layerId, { type: "delete-elements" });
      return;
    }
    const move = window.confirm(
      `Warstwa zawiera ${count} elementów. OK = przenieś na „${others[0].name}”, Anuluj = usuń elementy.`,
    );
    commitDeleteLayer(
      layerId,
      move ? { type: "move-to", targetId: others[0].id } : { type: "delete-elements" },
    );
  }

  return (
    <div className="section">
      <div className="row" style={{ marginBottom: 8 }}>
        <strong>Warstwy</strong>
        <button type="button" onClick={commitAddLayer}>Dodaj</button>
      </div>
      {layers.map((layer, index) => (
        <div key={layer.id} className={`layer-item ${layer.id === activeLayerId ? "active" : ""}`}>
          <div className="row">
            <button type="button" className={layer.id === activeLayerId ? "active" : ""} onClick={() => setActiveLayer(layer.id)}>
              Aktywna
            </button>
            <button type="button" onClick={() => commitUpdateLayer(layer.id, { visible: !layer.visible })}>
              {layer.visible ? "Widoczna" : "Ukryta"}
            </button>
            <button type="button" onClick={() => commitUpdateLayer(layer.id, { locked: !layer.locked })}>
              {layer.locked ? "Zablokowana" : "Odblokowana"}
            </button>
          </div>
          <input
            style={{ width: "100%", margin: "6px 0" }}
            value={layer.name}
            onChange={(e) => commitUpdateLayer(layer.id, { name: e.target.value })}
          />
          <div className="row">
            <button type="button" disabled={index === 0} onClick={() => commitReorderLayer(layer.id, -1)}>W górę</button>
            <button type="button" disabled={index === layers.length - 1} onClick={() => commitReorderLayer(layer.id, 1)}>W dół</button>
            <button type="button" disabled={layers.length <= 1} onClick={() => remove(layer.id)}>Usuń</button>
          </div>
        </div>
      ))}
    </div>
  );
}
