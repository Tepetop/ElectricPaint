import { symbolByKind } from "../catalog/symbols";
import { isSymbol, type Project } from "./types";

export type SymbolListRow = {
  label: string;
  typeName: string;
  groups: string;
  description: string;
};

export function collectSymbolList(project: Project): SymbolListRow[] {
  const hidden = new Set(project.layers.filter((layer) => !layer.visible).map((layer) => layer.id));
  const rows: SymbolListRow[] = [];
  for (const el of project.elements) {
    if (!isSymbol(el) || hidden.has(el.layerId)) continue;
    const groups = project.groups
      .filter((group) => group.switchIds.includes(el.id) || group.luminaireIds.includes(el.id))
      .map((group) => group.designation)
      .filter((name) => name.trim().length > 0)
      .join(", ");
    rows.push({
      label: el.label,
      typeName: symbolByKind(el.kind)?.name ?? el.kind,
      groups,
      description: el.description ?? "",
    });
  }
  return rows;
}
