import { createId } from "./ids";
import { symbolRole } from "./numbering";
import { SCHEMA_VERSION, type Layer, type Project, type SymbolKind } from "./types";

export const DEFAULT_LAYER_NAMES = ["Gniazda", "Oświetlenie", "Łączniki", "Przewody", "Inne"] as const;

export function createDefaultLayer(name = "Warstwa 1"): Layer {
  return { id: createId(), name, visible: true, locked: false };
}

export function createEmptyProject(name = "Nowy projekt"): Project {
  return {
    schemaVersion: SCHEMA_VERSION,
    name,
    canvas: { width: 1600, height: 1000 },
    background: null,
    layers: DEFAULT_LAYER_NAMES.map((layerName) => createDefaultLayer(layerName)),
    elements: [],
    groups: [],
    nextLabelSeq: {},
    nextGroupSeq: 1,
    nextCableSeq: 1,
    defaultSymbolScale: 1,
    scaleReference: null,
  };
}

export function layerIdByName(project: Project, name: string, fallbackId: string): string {
  return project.layers.find((layer) => layer.name === name)?.id ?? fallbackId;
}

export function defaultSymbolLayerId(project: Project, kind: SymbolKind, fallbackId: string): string {
  const role = symbolRole(kind);
  const name =
    role === "socket" ? "Gniazda" :
    role === "switch" ? "Łączniki" :
    role === "luminaire" ? "Oświetlenie" :
    "Inne";
  return layerIdByName(project, name, fallbackId);
}

export function defaultLayerId(project: Project): string {
  return project.layers[0]?.id ?? createDefaultLayer().id;
}

export function layerById(project: Project, id: string): Layer | undefined {
  return project.layers.find((layer) => layer.id === id);
}

export function isLayerEditable(project: Project, layerId: string): boolean {
  const layer = layerById(project, layerId);
  return Boolean(layer && layer.visible && !layer.locked);
}
