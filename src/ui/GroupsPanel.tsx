import { isSymbol } from "../domain/types";
import {
  commitAddGroup,
  commitApplyGroupLabels,
  commitAssignSelected,
  commitDeleteGroup,
  commitRemoveFromGroup,
  commitUpdateGroup,
  selectIds,
  useEditor,
} from "../state/editorStore";

export function GroupsPanel() {
  const groups = useEditor((s) => s.project.groups);
  const elements = useEditor((s) => s.project.elements);
  const selectedIds = useEditor((s) => s.selectedIds);
  const labelOf = (id: string) => {
    const el = elements.find((item) => item.id === id);
    return el && isSymbol(el) ? el.label : id.slice(0, 6);
  };

  return (
    <div className="section">
      <div className="row" style={{ marginBottom: 8 }}>
        <strong>Grupy sterowania</strong>
        <button type="button" onClick={commitAddGroup}>Nowa grupa</button>
      </div>
      {groups.length === 0 && (
        <p className="legend">Utwórz grupę, dodaj łączniki i oprawy, nadaj oznaczenie i zatwierdź, aby wpisać nazwy na schemacie.</p>
      )}
      {groups.map((group) => {
        const canApply = group.designation.trim().length > 0 && (group.switchIds.length > 0 || group.luminaireIds.length > 0);
        return (
          <div className="group-item" key={group.id}>
            <label className="field">Oznaczenie
              <input value={group.designation} onChange={(e) => commitUpdateGroup(group.id, { designation: e.target.value })} />
            </label>
            <div className="members">
              Łączniki: {group.switchIds.length === 0 && "brak"}
              {group.switchIds.map((id) => (
                <button key={id} type="button" onClick={() => selectIds([id])}>
                  {labelOf(id)}
                  <span onClick={(e) => { e.stopPropagation(); commitRemoveFromGroup(group.id, id, "switchIds"); }}> ×</span>
                </button>
              ))}
            </div>
            <div className="members">
              Oprawy: {group.luminaireIds.length === 0 && "brak"}
              {group.luminaireIds.map((id) => (
                <button key={id} type="button" onClick={() => selectIds([id])}>
                  {labelOf(id)}
                  <span onClick={(e) => { e.stopPropagation(); commitRemoveFromGroup(group.id, id, "luminaireIds"); }}> ×</span>
                </button>
              ))}
            </div>
            <div className="row" style={{ flexWrap: "wrap" }}>
              <button type="button" disabled={selectedIds.length === 0} onClick={() => commitAssignSelected(group.id)}>
                Dodaj zaznaczone
              </button>
              <button type="button" disabled={!canApply} onClick={() => commitApplyGroupLabels(group.id)}>
                Zatwierdź
              </button>
              <button type="button" onClick={() => commitDeleteGroup(group.id)}>Usuń grupę</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
