import { useSyncExternalStore } from "react";
import {
  addCable,
  addGroup,
  addLayer,
  addSymbol,
  addText,
  applyGroupLabels,
  applySymbolScaleSetting,
  assignSelectedToGroup,
  deleteElements,
  deleteGroup,
  deleteLayer,
  duplicateElements,
  moveElements,
  removeFromGroup,
  reorderLayer,
  replaceElement,
  setScaleLength,
  setScaleReference,
  snapshotProject,
  updateGroup,
  updateLayer,
} from "../domain/commands";
import { snapPoint } from "../domain/geometry";
import { createEmptyProject, isLayerEditable, layerById } from "../domain/project";
import type { OverlayElement, Point, Project, SymbolKind } from "../domain/types";

export type Tool = "select" | "pan" | "symbol" | "cable" | "text" | "scale";

export type EditorState = {
  project: Project;
  backgroundDataUrl: string | null;
  filePath: string | null;
  dirty: boolean;
  selectedIds: string[];
  activeLayerId: string;
  tool: Tool;
  pendingSymbolKind: SymbolKind | null;
  zoom: number;
  pan: Point;
  showGrid: boolean;
  snap: boolean;
  cableDraft: Point[];
  scaleDraft: Point[];
  cableColor: string;
  cableWidth: number;
  cableStyle: "solid" | "dashed";
  viewport: { width: number; height: number };
  restoreAvailable: boolean;
  undoDepth: number;
  redoDepth: number;
};

type HistoryState = { past: Project[]; future: Project[] };

const HISTORY_LIMIT = 80;
const listeners = new Set<() => void>();
let history: HistoryState = { past: [], future: [] };

function emptyState(): EditorState {
  const project = createEmptyProject();
  return {
    project,
    backgroundDataUrl: null,
    filePath: null,
    dirty: false,
    selectedIds: [],
    activeLayerId: project.layers[0].id,
    tool: "select",
    pendingSymbolKind: null,
    zoom: 1,
    pan: { x: 24, y: 24 },
    showGrid: true,
    snap: true,
    cableDraft: [],
    scaleDraft: [],
    cableColor: "#1d4ed8",
    cableWidth: 3,
    cableStyle: "solid",
    viewport: { width: 800, height: 600 },
    restoreAvailable: false,
    undoDepth: 0,
    redoDepth: 0,
  };
}

let state: EditorState = emptyState();

function emit() {
  for (const listener of listeners) listener();
}

function setState(patch: Partial<EditorState>) {
  state = { ...state, ...patch };
  emit();
}

function commit(next: Project, extra: Partial<EditorState> = {}) {
  history = {
    past: [...history.past, snapshotProject(state.project)].slice(-HISTORY_LIMIT),
    future: [],
  };
  state = {
    ...state,
    ...extra,
    project: next,
    dirty: true,
    undoDepth: history.past.length,
    redoDepth: 0,
  };
  emit();
}

export function getEditorState(): EditorState {
  return state;
}

export function subscribeEditor(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useEditor<T>(selector: (s: EditorState) => T): T {
  return useSyncExternalStore(
    subscribeEditor,
    () => selector(state),
    () => selector(state),
  );
}

export function confirmDiscard(): boolean {
  if (!state.dirty) return true;
  return window.confirm("Projekt ma niezapisane zmiany. Kontynuować i je odrzucić?");
}

export function newProject() {
  if (!confirmDiscard()) return;
  history = { past: [], future: [] };
  state = emptyState();
  emit();
}

export function loadEditorProject(
  project: Project,
  backgroundDataUrl: string | null,
  filePath: string | null,
) {
  history = { past: [], future: [] };
  state = {
    ...emptyState(),
    project,
    backgroundDataUrl,
    filePath,
    dirty: false,
    activeLayerId: project.layers[0]?.id ?? emptyState().activeLayerId,
  };
  emit();
}

export function markSaved(filePath: string | null) {
  setState({ dirty: false, filePath: filePath ?? state.filePath });
}

export function setRestoreAvailable(value: boolean) {
  setState({ restoreAvailable: value });
}

export function setViewport(width: number, height: number) {
  setState({ viewport: { width, height } });
}

export function setTool(tool: Tool) {
  setState({
    tool,
    pendingSymbolKind: tool === "symbol" ? state.pendingSymbolKind : null,
    cableDraft: tool === "cable" ? state.cableDraft : [],
    scaleDraft: tool === "scale" ? state.scaleDraft : [],
  });
}

export function setPendingSymbol(kind: SymbolKind) {
  setState({ tool: "symbol", pendingSymbolKind: kind });
}

export function setZoom(zoom: number) {
  setState({ zoom });
}

export function setPan(pan: Point) {
  setState({ pan });
}

export function setShowGrid(showGrid: boolean) {
  setState({ showGrid });
}

export function setSnap(snap: boolean) {
  setState({ snap });
}

export function setCableStyle(patch: Partial<Pick<EditorState, "cableColor" | "cableWidth" | "cableStyle">>) {
  setState(patch);
}

export function setActiveLayer(activeLayerId: string) {
  setState({ activeLayerId });
}

export function selectIds(ids: string[], additive = false) {
  const selectedIds = additive ? [...new Set([...state.selectedIds, ...ids])] : ids;
  setState({ selectedIds });
}

export function clearSelection() {
  setState({ selectedIds: [] });
}

export function fitView() {
  const { width, height } = state.viewport;
  const cw = state.project.canvas.width;
  const ch = state.project.canvas.height;
  if (width < 10 || height < 10) return;
  const zoom = Math.min(width / cw, height / ch) * 0.96;
  const pan = { x: (width - cw * zoom) / 2, y: (height - ch * zoom) / 2 };
  setState({ zoom, pan });
}

export function canvasPointFromScreen(screen: Point): Point {
  return {
    x: (screen.x - state.pan.x) / state.zoom,
    y: (screen.y - state.pan.y) / state.zoom,
  };
}

function activeEditable(): boolean {
  return isLayerEditable(state.project, state.activeLayerId);
}

export function placeAt(point: Point) {
  if (!activeEditable()) return;
  const snapped = snapPoint(point, state.snap);
  if (state.tool === "symbol" && state.pendingSymbolKind) {
    const next = addSymbol(state.project, { kind: state.pendingSymbolKind, layerId: state.activeLayerId, ...snapped });
    const created = next.elements[next.elements.length - 1];
    commit(next, { selectedIds: [created.id] });
    return;
  }
  if (state.tool === "text") {
    const next = addText(state.project, { layerId: state.activeLayerId, ...snapped });
    const created = next.elements[next.elements.length - 1];
    commit(next, { selectedIds: [created.id], tool: "select" });
    return;
  }
  if (state.tool === "cable") {
    startCableSegment(point);
  }
  if (state.tool === "scale") {
    clickScalePoint(point);
  }
}

export function startCableSegment(point: Point) {
  if (state.tool !== "cable" || !activeEditable()) return;
  const snapped = snapPoint(point, state.snap);
  if (state.cableDraft.length === 0) {
    setState({ cableDraft: [snapped] });
    return;
  }
  setState({ cableDraft: [...state.cableDraft, snapped] });
}

export function previewCableSegment(point: Point) {
  if (state.tool !== "cable" || !activeEditable()) return;
  const snapped = snapPoint(point, state.snap);
  const draft = state.cableDraft;
  if (draft.length === 0) {
    setState({ cableDraft: [snapped] });
    return;
  }
  if (draft.length === 1) {
    if (draft[0].x === snapped.x && draft[0].y === snapped.y) return;
    setState({ cableDraft: [draft[0], snapped] });
    return;
  }
  const last = draft[draft.length - 1];
  if (last.x === snapped.x && last.y === snapped.y) return;
  setState({ cableDraft: [...draft.slice(0, -1), snapped] });
}

export function commitCableSegment() {
  const draft = state.cableDraft;
  if (draft.length < 2) return;
  const last = draft[draft.length - 1];
  const prev = draft[draft.length - 2];
  if (last.x === prev.x && last.y === prev.y) {
    setState({ cableDraft: draft.slice(0, -1) });
  }
}

export function finishCable() {
  if (state.cableDraft.length < 2) {
    setState({ cableDraft: [] });
    return;
  }
  const next = addCable(state.project, {
    layerId: state.activeLayerId,
    points: state.cableDraft,
    color: state.cableColor,
    width: state.cableWidth,
    style: state.cableStyle,
  });
  commit(next, { cableDraft: [] });
}

export function cancelCable() {
  setState({ cableDraft: [] });
}

export function clickScalePoint(point: Point) {
  if (state.tool !== "scale") return;
  const snapped = snapPoint(point, state.snap);
  if (state.scaleDraft.length === 0) {
    setState({ scaleDraft: [snapped] });
    return;
  }
  const start = state.scaleDraft[0];
  const lengthM = state.project.scaleReference?.lengthM ?? 1;
  commit(setScaleReference(state.project, {
    x1: start.x,
    y1: start.y,
    x2: snapped.x,
    y2: snapped.y,
    lengthM,
  }), { scaleDraft: [] });
}

export function previewScalePoint(point: Point) {
  if (state.tool !== "scale" || state.scaleDraft.length === 0) return;
  const snapped = snapPoint(point, state.snap);
  const start = state.scaleDraft[0];
  if (start.x === snapped.x && start.y === snapped.y) return;
  const draft = state.scaleDraft;
  if (draft.length === 1) {
    setState({ scaleDraft: [start, snapped] });
    return;
  }
  const last = draft[draft.length - 1];
  if (last.x === snapped.x && last.y === snapped.y) return;
  setState({ scaleDraft: [start, snapped] });
}

export function cancelScale() {
  setState({ scaleDraft: [] });
}

export function commitScaleLength(lengthM: number) {
  commit(setScaleLength(state.project, lengthM));
}

export function commitApplySymbolScale(scale: number) {
  commit(applySymbolScaleSetting(state.project, scale, state.selectedIds));
}

export function commitElementPatch(id: string, patch: Partial<OverlayElement>) {
  commit(replaceElement(state.project, id, patch));
}

export function commitMove(ids: string[], dx: number, dy: number) {
  if (ids.length === 0 || (dx === 0 && dy === 0)) return;
  commit(moveElements(state.project, ids, dx, dy));
}

export function commitCablePoints(id: string, points: Point[]) {
  commit(replaceElement(state.project, id, { points } as Partial<OverlayElement>));
}

export function deleteSelected() {
  if (state.selectedIds.length === 0) return;
  const next = deleteElements(state.project, state.selectedIds);
  commit(next, { selectedIds: [] });
}

export function duplicateSelected() {
  if (state.selectedIds.length === 0) return;
  const before = new Set(state.project.elements.map((el) => el.id));
  const next = duplicateElements(state.project, state.selectedIds);
  const created = next.elements.filter((el) => !before.has(el.id)).map((el) => el.id);
  commit(next, { selectedIds: created });
}

export function commitAddLayer() {
  const next = addLayer(state.project);
  commit(next, { activeLayerId: next.layers[next.layers.length - 1].id });
}

export function commitUpdateLayer(
  layerId: string,
  patch: Partial<Pick<Project["layers"][number], "name" | "visible" | "locked">>,
) {
  commit(updateLayer(state.project, layerId, patch));
}

export function commitReorderLayer(layerId: string, direction: -1 | 1) {
  commit(reorderLayer(state.project, layerId, direction));
}

export function commitDeleteLayer(layerId: string, mode: { type: "delete-elements" } | { type: "move-to"; targetId: string }) {
  if (state.project.layers.length <= 1) return;
  const next = deleteLayer(state.project, layerId, mode);
  const activeLayerId = next.layers.some((l) => l.id === state.activeLayerId)
    ? state.activeLayerId
    : next.layers[0].id;
  commit(next, { activeLayerId });
}

export function commitAddGroup() {
  commit(addGroup(state.project));
}

export function commitUpdateGroup(
  groupId: string,
  patch: Partial<Omit<Project["groups"][number], "id">>,
) {
  commit(updateGroup(state.project, groupId, patch));
}

export function commitDeleteGroup(groupId: string) {
  commit(deleteGroup(state.project, groupId));
}

export function commitAssignSelected(groupId: string) {
  commit(assignSelectedToGroup(state.project, groupId, state.selectedIds));
}

export function commitRemoveFromGroup(
  groupId: string,
  elementId: string,
  field: "switchIds" | "luminaireIds",
) {
  commit(removeFromGroup(state.project, groupId, elementId, field));
}

export function commitApplyGroupLabels(groupId: string) {
  commit(applyGroupLabels(state.project, groupId));
}

export function setBackground(background: Project["background"], dataUrl: string, canvas: { width: number; height: number }) {
  commit(
    { ...state.project, background, canvas },
    { backgroundDataUrl: dataUrl },
  );
}

export function undo() {
  const previous = history.past.pop();
  if (!previous) return;
  history.future.push(snapshotProject(state.project));
  const activeLayerId = layerById(previous, state.activeLayerId)
    ? state.activeLayerId
    : previous.layers[0]?.id ?? state.activeLayerId;
  state = {
    ...state,
    project: previous,
    dirty: true,
    activeLayerId,
    undoDepth: history.past.length,
    redoDepth: history.future.length,
  };
  emit();
}

export function redo() {
  const next = history.future.pop();
  if (!next) return;
  history.past.push(snapshotProject(state.project));
  const activeLayerId = layerById(next, state.activeLayerId)
    ? state.activeLayerId
    : next.layers[0]?.id ?? state.activeLayerId;
  state = {
    ...state,
    project: next,
    dirty: true,
    activeLayerId,
    undoDepth: history.past.length,
    redoDepth: history.future.length,
  };
  emit();
}

export function canUndo(): boolean {
  return history.past.length > 0;
}

export function canRedo(): boolean {
  return history.future.length > 0;
}

export function resetEditorForTests() {
  history = { past: [], future: [] };
  state = emptyState();
}
