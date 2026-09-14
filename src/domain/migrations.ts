import { createDefaultLayer } from "./project";
import { SCHEMA_VERSION, type OverlayElement, type Project } from "./types";

export function migrateProject(raw: unknown): Project {
  if (!raw || typeof raw !== "object") {
    throw new Error("Niepoprawny plik projektu");
  }
  const data = raw as Partial<Project> & { schemaVersion?: number };
  const version = data.schemaVersion ?? 1;
  if (version > SCHEMA_VERSION) {
    throw new Error(`Nieobsługiwana wersja projektu (${version})`);
  }

  let layers = Array.isArray(data.layers) ? data.layers : [];
  if (layers.length === 0) {
    layers = [createDefaultLayer()];
  }
  const fallbackLayerId = layers[0].id;
  const elements = (Array.isArray(data.elements) ? data.elements : []).map((el) => ({
    ...el,
    layerId: (el as OverlayElement).layerId || fallbackLayerId,
  }));

  return {
    schemaVersion: SCHEMA_VERSION,
    name: data.name || "Projekt",
    canvas: data.canvas ?? { width: 1600, height: 1000 },
    background: data.background ?? null,
    layers,
    elements,
    groups: Array.isArray(data.groups) ? data.groups : [],
    nextLabelSeq: data.nextLabelSeq ?? {},
    nextGroupSeq: data.nextGroupSeq ?? 1,
    nextCableSeq: data.nextCableSeq ?? 1,
  };
}
