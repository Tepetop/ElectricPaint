export const SCHEMA_VERSION = 1;
export const PROJECT_FILE_EXT = ".epaint";
export const GRID_SIZE = 10;

export type Point = { x: number; y: number };

export type Layer = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
};

export type SymbolKind =
  | "switch-single"
  | "switch-double"
  | "switch-stair"
  | "switch-cross"
  | "socket-single"
  | "socket-double"
  | "luminaire"
  | "wall-light";

export type SymbolRole = "switch" | "socket" | "luminaire";

export type SymbolElement = {
  type: "symbol";
  id: string;
  layerId: string;
  kind: SymbolKind;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  label: string;
};

export type CableStyle = "solid" | "dashed";

export type CableRoute = {
  type: "cable";
  id: string;
  layerId: string;
  points: Point[];
  color: string;
  width: number;
  style: CableStyle;
  name: string;
};

export type TextElement = {
  type: "text";
  id: string;
  layerId: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  text: string;
  fontSize: number;
};

export type OverlayElement = SymbolElement | CableRoute | TextElement;

export type ControlGroup = {
  id: string;
  designation: string;
  switchIds: string[];
  luminaireIds: string[];
};

export type Background = {
  kind: "image" | "pdf";
  filename: string;
  mimeType: string;
  width: number;
  height: number;
  page?: number;
  asset: string;
};

export type Project = {
  schemaVersion: number;
  name: string;
  canvas: { width: number; height: number };
  background: Background | null;
  layers: Layer[];
  elements: OverlayElement[];
  groups: ControlGroup[];
  nextLabelSeq: Record<string, number>;
  nextGroupSeq: number;
  nextCableSeq: number;
};

export function isSymbol(el: OverlayElement): el is SymbolElement {
  return el.type === "symbol";
}

export function isCable(el: OverlayElement): el is CableRoute {
  return el.type === "cable";
}

export function isText(el: OverlayElement): el is TextElement {
  return el.type === "text";
}
