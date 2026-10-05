import { useState } from "react";
import { isSymbol, type ControlGroup } from "../domain/types";
import {
  commitAddGroup,
  commitApplyGroupLabels,
  commitAssignSelected,
  commitDeleteGroup,
  commitRemoveFromGroup,
  commitSetAllGroupsCollapsed,
  commitUpdateGroup,
  selectIds,
  useEditor,
} from "../state/editorStore";

function selectGroupSymbols(group: ControlGroup) {
  const ids = [...group.switchIds, ...group.luminaireIds];
  if (ids.length === 0) return;
  selectIds(ids);
}

export function GroupsPanel() {
  const groups = useEditor((s) => s.project.groups);
  const elements = useEditor((s) => s.project.elements);
  const selectedIds = useEditor((s) => s.selectedIds);
  const [groupsHidden, setGroupsHidden] = useState(false);
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
      {groups.length > 0 && <div className="row" style={{ marginBottom: 8 }}>
        {groupsHidden ? (
          <button type="button" onClick={() => setGroupsHidden(false)}>Pokaż grupy</button>
        ) : (
          <>
            <button type="button" onClick={() => commitSetAllGroupsCollapsed(true)}>Zwiń wszystkie</button>
            <button type="button" onClick={() => commitSetAllGroupsCollapsed(false)}>Rozwiń wszystkie</button>
            <button type="button" onClick={() => setGroupsHidden(true)}>Schowaj grupy</button>
          </>
        )}
      </div>}
      {groupsHidden && groups.length > 0 && (
        <p className="legend">Grupy są schowane.</p>
      )}
      {groups.length === 0 && (
        <p className="legend">Utwórz grupę, dodaj łączniki i oprawy, nadaj oznaczenie i zatwierdź, aby wpisać nazwy na schemacie.</p>
      )}
      {!groupsHidden && groups.map((group) => {
        const collapsed = Boolean(group.collapsed);
        const canApply = group.designation.trim().length > 0 && (group.switchIds.length > 0 || group.luminaireIds.length > 0);
        return (
          <div
            className="group-item"
            key={group.id}
            onClick={(event) => {
              const target = event.target as HTMLElement;
              if (target.closest("button, input")) return;
              selectGroupSymbols(group);
            }}
          >
            <div className="row" style={{ marginBottom: collapsed ? 0 : 8 }}>
              <button
                type="button"
                aria-label={collapsed ? "Rozwiń grupę" : "Zwiń grupę"}
                onClick={() => commitUpdateGroup(group.id, { collapsed: !collapsed })}
              >
                {collapsed ? "▸" : "▾"}
              </button>
              <button type="button" onClick={() => selectGroupSymbols(group)}>Pokaż symbole</button>
              <label className="field" style={{ flex: 1, marginBottom: 0, minWidth: 0 }}>Oznaczenie
                <input value={group.designation} onChange={(e) => commitUpdateGroup(group.id, { designation: e.target.value })} />
              </label>
            </div>
            {collapsed ? (
              <p className="legend" style={{ margin: "6px 0 0" }}>
                Łączniki: {group.switchIds.length} · Oprawy: {group.luminaireIds.length}
              </p>
            ) : (
              <>
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
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
