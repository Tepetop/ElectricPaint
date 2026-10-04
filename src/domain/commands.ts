import { cloneData, createId } from "./ids";
import { allocateCableName, allocateGroupDesignation, allocateLabel, symbolRole } from "./numbering";
import { createDefaultLayer } from "./project";
import type {
  CableRoute,
  CableStyle,
  ControlGroup,
  OverlayElement,
  Project,
  ScaleReference,
  SymbolElement,
  SymbolKind,
  TextElement,
} from "./types";
import { isCable, isSymbol } from "./types";

export function replaceElement(project: Project, id: string, patch: Partial<OverlayElement>): Project {
  return {
    ...project,
    elements: project.elements.map((el) => (el.id === id ? ({ ...el, ...patch } as OverlayElement) : el)),
  };
}

export function addSymbol(
  project: Project,
  input: { kind: SymbolKind; layerId: string; x: number; y: number; label?: string },
): Project {
  const { label, nextLabelSeq } = input.label
    ? { label: input.label, nextLabelSeq: project.nextLabelSeq }
    : allocateLabel(project, input.kind);
  const element: SymbolElement = {
    type: "symbol",
    id: createId(),
    layerId: input.layerId,
    kind: input.kind,
    x: input.x,
    y: input.y,
    rotation: 0,
    scale: project.defaultSymbolScale || 1,
    label,
    description: "",
  };
  return { ...project, nextLabelSeq, elements: [...project.elements, element] };
}

export function addCable(
  project: Project,
  input: {
    layerId: string;
    points: { x: number; y: number }[];
    color?: string;
    width?: number;
    style?: CableStyle;
    name?: string;
  },
): Project {
  const { name, nextCableSeq } = input.name
    ? { name: input.name, nextCableSeq: project.nextCableSeq }
    : allocateCableName(project);
  const element: CableRoute = {
    type: "cable",
    id: createId(),
    layerId: input.layerId,
    points: input.points,
    color: input.color ?? "#1d4ed8",
    width: input.width ?? 3,
    style: input.style ?? "solid",
    name,
  };
  return { ...project, nextCableSeq, elements: [...project.elements, element] };
}

export function addText(
  project: Project,
  input: { layerId: string; x: number; y: number; text?: string },
): Project {
  const element: TextElement = {
    type: "text",
    id: createId(),
    layerId: input.layerId,
    x: input.x,
    y: input.y,
    rotation: 0,
    scale: 1,
    text: input.text ?? "Tekst",
    fontSize: 18,
  };
  return { ...project, elements: [...project.elements, element] };
}

export function deleteElements(project: Project, ids: string[]): Project {
  const idSet = new Set(ids);
  return {
    ...project,
    elements: project.elements.filter((el) => !idSet.has(el.id)),
    groups: project.groups.map((group) => ({
      ...group,
      switchIds: group.switchIds.filter((id) => !idSet.has(id)),
      luminaireIds: group.luminaireIds.filter((id) => !idSet.has(id)),
    })),
  };
}

export function duplicateElements(project: Project, ids: string[], offset = 24): Project {
  const idSet = new Set(ids);
  let next = project;
  const created: OverlayElement[] = [];
  for (const el of project.elements) {
    if (!idSet.has(el.id)) continue;
    if (isSymbol(el)) {
      next = addSymbol(next, { kind: el.kind, layerId: el.layerId, x: el.x + offset, y: el.y + offset });
      created.push(next.elements[next.elements.length - 1]);
    } else if (isCable(el)) {
      next = addCable(next, {
        layerId: el.layerId,
        points: el.points.map((p) => ({ x: p.x + offset, y: p.y + offset })),
        color: el.color,
        width: el.width,
        style: el.style,
      });
      created.push(next.elements[next.elements.length - 1]);
    } else {
      next = addText(next, { layerId: el.layerId, x: el.x + offset, y: el.y + offset, text: el.text });
      created.push(next.elements[next.elements.length - 1]);
    }
  }
  void created;
  return next;
}

export function moveElements(project: Project, ids: string[], dx: number, dy: number): Project {
  const idSet = new Set(ids);
  return {
    ...project,
    elements: project.elements.map((el) => {
      if (!idSet.has(el.id)) return el;
      if (isCable(el)) {
        return { ...el, points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
      }
      return { ...el, x: el.x + dx, y: el.y + dy };
    }),
  };
}

export function addLayer(project: Project, name?: string): Project {
  const index = project.layers.length + 1;
  return {
    ...project,
    layers: [...project.layers, createDefaultLayer(name ?? `Warstwa ${index}`)],
  };
}

export function updateLayer(
  project: Project,
  layerId: string,
  patch: Partial<Pick<Project["layers"][number], "name" | "visible" | "locked">>,
): Project {
  return {
    ...project,
    layers: project.layers.map((layer) => (layer.id === layerId ? { ...layer, ...patch } : layer)),
  };
}

export function reorderLayer(project: Project, layerId: string, direction: -1 | 1): Project {
  const index = project.layers.findIndex((layer) => layer.id === layerId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= project.layers.length) return project;
  const layers = [...project.layers];
  const [item] = layers.splice(index, 1);
  layers.splice(target, 0, item);
  return { ...project, layers };
}

export function deleteLayer(
  project: Project,
  layerId: string,
  mode: { type: "delete-elements" } | { type: "move-to"; targetId: string },
): Project {
  if (project.layers.length <= 1) return project;
  const layers = project.layers.filter((layer) => layer.id !== layerId);
  if (mode.type === "move-to") {
    return {
      ...project,
      layers,
      elements: project.elements.map((el) => (el.layerId === layerId ? { ...el, layerId: mode.targetId } : el)),
    };
  }
  const removed = new Set(project.elements.filter((el) => el.layerId === layerId).map((el) => el.id));
  return deleteElements({ ...project, layers }, [...removed]);
}

export function addGroup(project: Project, designation?: string): Project {
  const allocated = designation
    ? { designation, nextGroupSeq: project.nextGroupSeq }
    : allocateGroupDesignation(project);
  const group: ControlGroup = {
    id: createId(),
    designation: allocated.designation,
    switchIds: [],
    luminaireIds: [],
    collapsed: false,
  };
  return { ...project, nextGroupSeq: allocated.nextGroupSeq, groups: [group, ...project.groups] };
}

export function updateGroup(project: Project, groupId: string, patch: Partial<Omit<ControlGroup, "id">>): Project {
  return {
    ...project,
    groups: project.groups.map((group) => (group.id === groupId ? { ...group, ...patch } : group)),
  };
}

export function deleteGroup(project: Project, groupId: string): Project {
  return { ...project, groups: project.groups.filter((group) => group.id !== groupId) };
}

export function assignSelectedToGroup(project: Project, groupId: string, elementIds: string[]): Project {
  const group = project.groups.find((item) => item.id === groupId);
  if (!group) return project;
  const selected = project.elements.filter((el) => elementIds.includes(el.id) && isSymbol(el)) as SymbolElement[];
  const switchIds = new Set(group.switchIds);
  const luminaireIds = new Set(group.luminaireIds);
  for (const symbol of selected) {
    const role = symbolRole(symbol.kind);
    if (role === "switch") switchIds.add(symbol.id);
    if (role === "luminaire") luminaireIds.add(symbol.id);
  }
  return updateGroup(project, groupId, {
    switchIds: [...switchIds],
    luminaireIds: [...luminaireIds],
  });
}

export function removeFromGroup(
  project: Project,
  groupId: string,
  elementId: string,
  field: "switchIds" | "luminaireIds",
): Project {
  const group = project.groups.find((item) => item.id === groupId);
  if (!group) return project;
  return updateGroup(project, groupId, { [field]: group[field].filter((id) => id !== elementId) });
}

export function applySymbolScaleSetting(project: Project, scale: number, selectedIds: string[]): Project {
  if (!Number.isFinite(scale) || scale <= 0) return project;
  const value = scale;
  let next: Project = { ...project, defaultSymbolScale: value };
  const selected = next.elements.filter((el) => selectedIds.includes(el.id) && isSymbol(el));
  if (selected.length === 1) {
    next = replaceElement(next, selected[0].id, { scale: value });
  }
  return next;
}

export function scaleAllSymbols(project: Project, scale: number): Project {
  if (!Number.isFinite(scale) || scale <= 0) return project;
  if (project.defaultSymbolScale === scale && project.elements.every((el) => !isSymbol(el) || el.scale === scale)) {
    return project;
  }
  return {
    ...project,
    defaultSymbolScale: scale,
    elements: project.elements.map((el) => isSymbol(el) && el.scale !== scale ? { ...el, scale } : el),
  };
}

export function moveElementsToLayer(project: Project, ids: string[], layerId: string): Project {
  if (!project.layers.some((layer) => layer.id === layerId)) return project;
  const selected = new Set(ids);
  if (!project.elements.some((el) => selected.has(el.id) && el.layerId !== layerId)) return project;
  return {
    ...project,
    elements: project.elements.map((el) => selected.has(el.id) && el.layerId !== layerId ? { ...el, layerId } : el),
  };
}

export function setAllGroupsCollapsed(project: Project, collapsed: boolean): Project {
  if (project.groups.every((group) => group.collapsed === collapsed)) return project;
  return {
    ...project,
    groups: project.groups.map((group) => group.collapsed === collapsed ? group : { ...group, collapsed }),
  };
}

export function setScaleReference(project: Project, scaleReference: ScaleReference): Project {
  return { ...project, scaleReference };
}

export function setScaleLength(project: Project, lengthM: number): Project {
  if (!project.scaleReference) return project;
  const value = Number(lengthM);
  if (!Number.isFinite(value) || value <= 0) return project;
  return { ...project, scaleReference: { ...project.scaleReference, lengthM: value } };
}

export function applyGroupLabels(project: Project, groupId: string): Project {
  const group = project.groups.find((item) => item.id === groupId);
  if (!group) return project;
  const designation = group.designation.trim();
  if (!designation) return project;
  const labels = new Map<string, string>();
  group.switchIds.forEach((id, index) => labels.set(id, `${designation}L${index + 1}`));
  group.luminaireIds.forEach((id, index) => labels.set(id, `${designation}Z${index + 1}`));
  if (labels.size === 0) return project;
  return {
    ...project,
    elements: project.elements.map((el) => {
      const nextLabel = labels.get(el.id);
      if (!nextLabel || !isSymbol(el)) return el;
      return { ...el, label: nextLabel };
    }),
  };
}

export function snapshotProject(project: Project): Project {
  return cloneData(project);
}
