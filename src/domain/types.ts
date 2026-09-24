export const SCHEMA_VERSION = 2;
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
  | "switch-triple"
  | "switch-double"
  | "switch-stair"
  | "switch-stair-double"
  | "switch-cross"
  | "switch-push"
  | "socket-single"
  | "socket-double"
  | "socket-antenna"
  | "luminaire"
  | "wall-light"
  | "ground"
  | "bell"
  | "meter"
  | "distribution-board";

export type SymbolRole = "switch" | "socket" | "luminaire" | "other";

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
  description: string;
  labelOffset?: Point;
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
  collapsed: boolean;
};

export type ScaleReference = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lengthM: number;
};

export type Background = {
  kind: "image" | "pdf" | "dxf";
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
  defaultSymbolScale: number;
  scaleReference: ScaleReference | null;
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
