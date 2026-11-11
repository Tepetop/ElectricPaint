import { isCable, isSymbol, type Project } from "./types";

export type CableListRow = { name: string; color: string; symbols: string };

export function collectCableList(project: Project): CableListRow[] {
  const hidden = new Set(project.layers.filter((layer) => !layer.visible).map((layer) => layer.id));
  const rows: CableListRow[] = [];
  for (const el of project.elements) {
    if (!isCable(el) || hidden.has(el.layerId) || el.visible === false) continue;
    const labels: string[] = [];
    for (const id of el.symbolIds) {
      const item = project.elements.find((candidate) => candidate.id === id);
      if (!item || !isSymbol(item) || hidden.has(item.layerId)) continue;
      labels.push(item.label);
    }
    const symbols = labels.join(", ");
    rows.push({ name: el.name, color: el.color, symbols });
  }
  return rows;
}
