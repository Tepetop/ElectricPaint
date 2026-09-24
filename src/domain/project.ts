import { createId } from "./ids";
import { SCHEMA_VERSION, type Layer, type Project } from "./types";

export function createDefaultLayer(name = "Warstwa 1"): Layer {
  return { id: createId(), name, visible: true, locked: false };
}

export function createEmptyProject(name = "Nowy projekt"): Project {
  const layer = createDefaultLayer();
  return {
    schemaVersion: SCHEMA_VERSION,
    name,
    canvas: { width: 1600, height: 1000 },
    background: null,
    layers: [layer],
    elements: [],
    groups: [],
    nextLabelSeq: {},
    nextGroupSeq: 1,
    nextCableSeq: 1,
    defaultSymbolScale: 1,
    scaleReference: null,
  };
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
