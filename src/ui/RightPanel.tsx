import { isCable, type CableRoute } from "../domain/types";
import { useEditor } from "../state/editorStore";
import { GroupsPanel } from "./GroupsPanel";
import { LayersPanel } from "./LayersPanel";
import { PropertiesPanel } from "./PropertiesPanel";

export function RightPanel() {
  const elements = useEditor((s) => s.project.elements);
  const layers = useEditor((s) => s.project.layers);
  const hidden = new Set(layers.filter((l) => !l.visible).map((l) => l.id));
  const cables = elements.filter((el): el is CableRoute => isCable(el) && !hidden.has(el.layerId));

  return (
    <aside className="right-panel">
      <h2 className="panel-title">Właściwości</h2>
      <PropertiesPanel />
      <GroupsPanel />
      <LayersPanel />
      <div className="section">
        <strong>Legenda tras</strong>
        {cables.length === 0 && <p className="legend">Brak widocznych przewodów.</p>}
        {cables.map((el) => (
          <div key={el.id} className="legend">
            <span className="swatch" style={{ background: el.color }} />
            {el.name}
          </div>
        ))}
      </div>
    </aside>
  );
}
