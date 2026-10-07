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
  moveElementsToLayer,
  removeFromGroup,
  reorderLayer,
  replaceElement,
  setScaleLength,
  setScaleReference,
  scaleAllSymbols,
  setAllGroupsCollapsed,
  snapshotProject,
  updateGroup,
  updateLayer,
} from "../domain/commands";
import { snapPoint } from "../domain/geometry";
import { createId } from "../domain/ids";
import { createEmptyProject, defaultSymbolLayerId, isLayerEditable, layerById, layerIdByName } from "../domain/project";
import type { OverlayElement, Point, Project, SymbolKind } from "../domain/types";

export type Tool = "select" | "pan" | "symbol" | "cable" | "text" | "scale";

export type TabSummary = { id: string; title: string; dirty: boolean; filePath: string | null };

export type EditorState = {
  activeTabId: string;
  tabs: TabSummary[];
  tabTitle: string;
  editRevision: number;
  needsInitialFit: boolean;
  project: Project;
  backgroundDataUrl: string | null;
  filePath: string | null;
  dirty: boolean;
  selectedIds: string[];
  multiSelect: boolean;
  activeLayerId: string;
  tool: Tool;
  pendingSymbolKind: SymbolKind | null;
  zoom: number;
  pan: Point;
  showGrid: boolean;
  snap: boolean;
  cableDraft: Point[];
  scaleDraft: Point[];
  scalePreview: Point | null;
  cableColor: string;
  cableWidth: number;
  cableStyle: "solid" | "dashed";
  viewport: { width: number; height: number };
  restoreAvailable: boolean;
  undoDepth: number;
  redoDepth: number;
};

type HistoryState = { past: Project[]; future: Project[] };
type StoredSession = { editor: EditorState; history: HistoryState };

const HISTORY_LIMIT = 80;
const listeners = new Set<() => void>();
let history: HistoryState = { past: [], future: [] };
let nextUntitledNumber = 1;

function emptyState(): EditorState {
  const tabTitle = `Nowy rzut ${nextUntitledNumber++}`;
  const project = createEmptyProject(tabTitle);
  return {
    activeTabId: createId(),
    tabs: [],
    tabTitle,
    editRevision: 0,
    needsInitialFit: false,
    project,
    backgroundDataUrl: null,
    filePath: null,
    dirty: false,
    selectedIds: [],
    multiSelect: false,
    activeLayerId: project.layers[0].id,
    tool: "select",
    pendingSymbolKind: null,
    zoom: 1,
    pan: { x: 24, y: 24 },
    showGrid: true,
    snap: true,
    cableDraft: [],
    scaleDraft: [],
    scalePreview: null,
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
let tabOrder = [state.activeTabId];
let sessions = new Map<string, StoredSession>([[state.activeTabId, { editor: state, history }]]);

function tabSummaries(): TabSummary[] {
  return tabOrder.flatMap((id) => {
    const editor = id === state.activeTabId ? state : sessions.get(id)?.editor;
    return editor ? [{ id, title: editor.tabTitle, dirty: editor.dirty, filePath: editor.filePath }] : [];
  });
}

function emit() {
  state = { ...state, tabs: tabSummaries() };
  sessions.set(state.activeTabId, { editor: state, history });
  for (const listener of listeners) listener();
}

function setState(patch: Partial<EditorState>) {
  state = { ...state, ...patch };
  emit();
}

function commit(next: Project, extra: Partial<EditorState> = {}) {
  if (next === state.project) return;
  history = {
    past: [...history.past, snapshotProject(state.project)].slice(-HISTORY_LIMIT),
    future: [],
  };
  state = {
    ...state,
    ...extra,
    project: next,
    dirty: true,
    editRevision: state.editRevision + 1,
    undoDepth: history.past.length,
    redoDepth: 0,
  };
  emit();
}

function appendTab(editor: EditorState) {
  const viewport = state.viewport;
  const restoreAvailable = state.restoreAvailable;
  history = { past: [], future: [] };
  tabOrder = [...tabOrder, editor.activeTabId];
  state = { ...editor, viewport, restoreAvailable };
  emit();
}

export function switchTab(id: string) {
  if (id === state.activeTabId) return;
  const target = sessions.get(id);
  if (!target) return;
  const viewport = state.viewport;
  history = target.history;
  state = { ...target.editor, activeTabId: id, viewport };
  emit();
}

export function closeTab(id: string): boolean {
  const target = getTabState(id);
  if (!target) return false;
  if (target.dirty && !window.confirm(`Rzut „${target.tabTitle}” ma niezapisane zmiany. Zamknąć zakładkę?`)) return false;
  const index = tabOrder.indexOf(id);
  tabOrder = tabOrder.filter((item) => item !== id);
  sessions.delete(id);
  if (tabOrder.length === 0) {
    const fresh = emptyState();
    tabOrder = [fresh.activeTabId];
    history = { past: [], future: [] };
    state = { ...fresh, viewport: state.viewport, restoreAvailable: state.restoreAvailable };
  } else if (id === state.activeTabId) {
    const nextId = tabOrder[Math.min(index, tabOrder.length - 1)];
    const next = sessions.get(nextId)!;
    history = next.history;
    state = { ...next.editor, activeTabId: nextId, viewport: state.viewport };
  }
  emit();
  return true;
}

export function getTabState(id: string): EditorState | null {
  if (id === state.activeTabId) return state;
  return sessions.get(id)?.editor ?? null;
}

export function getTabStates(): EditorState[] {
  return tabOrder.flatMap((id) => {
    const editor = getTabState(id);
    return editor ? [editor] : [];
  });
}

export function hasUnsavedTabs(): boolean {
  return getTabStates().some((tab) => tab.dirty);
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
  if (!hasUnsavedTabs()) return true;
  return window.confirm("Otwarte rzuty mają niezapisane zmiany. Kontynuować?");
}

export function newProject() {
  appendTab(emptyState());
}

export function loadEditorProject(
  project: Project,
  backgroundDataUrl: string | null,
  filePath: string | null,
) {
  const fresh = emptyState();
  appendTab({
    ...fresh,
    project,
    backgroundDataUrl,
    filePath,
    tabTitle: filePath?.split(/[\\/]/).pop() || project.name,
    needsInitialFit: Boolean(backgroundDataUrl),
    dirty: false,
    activeLayerId: project.layers[0]?.id ?? fresh.activeLayerId,
  });
}

export function markSaved(tabId: string, filePath: string | null, revision: number) {
  const target = getTabState(tabId);
  if (!target) return;
  const path = filePath ?? target.filePath;
  const next = {
    ...target,
    dirty: target.editRevision === revision ? false : target.dirty,
    filePath: path,
    tabTitle: path?.split(/[\\/]/).pop() || target.tabTitle,
  };
  if (tabId === state.activeTabId) {
    state = next;
  } else {
    const stored = sessions.get(tabId)!;
    sessions.set(tabId, { ...stored, editor: next });
  }
  emit();
}

export function setRestoreAvailable(value: boolean) {
  for (const [id, stored] of sessions) {
    sessions.set(id, { ...stored, editor: { ...stored.editor, restoreAvailable: value } });
  }
  setState({ restoreAvailable: value });
}

export type RestoredEditorTab = {
  id?: string;
  project: Project;
  backgroundDataUrl: string | null;
  filePath: string | null;
  tabTitle?: string;
  zoom?: number;
  pan?: Point;
};

export function restoreEditorTabs(restored: RestoredEditorTab[], activeId?: string) {
  if (restored.length === 0) return;
  const viewport = state.viewport;
  const replaceBlank = tabOrder.length === 1 && !state.dirty && !state.filePath
    && state.project.elements.length === 0 && !state.backgroundDataUrl;
  if (replaceBlank) {
    tabOrder = [];
    sessions = new Map();
  }
  const added: string[] = [];
  for (const item of restored) {
    const fresh = emptyState();
    const id = item.id && !sessions.has(item.id) ? item.id : fresh.activeTabId;
    const editor: EditorState = {
      ...fresh,
      activeTabId: id,
      project: item.project,
      backgroundDataUrl: item.backgroundDataUrl,
      filePath: item.filePath,
      tabTitle: item.tabTitle || item.filePath?.split(/[\\/]/).pop() || item.project.name,
      activeLayerId: item.project.layers[0]?.id ?? fresh.activeLayerId,
      dirty: true,
      editRevision: 1,
      needsInitialFit: Boolean(item.backgroundDataUrl) && item.zoom == null,
      zoom: item.zoom ?? fresh.zoom,
      pan: item.pan ?? fresh.pan,
      viewport,
      restoreAvailable: false,
    };
    tabOrder.push(id);
    sessions.set(id, { editor, history: { past: [], future: [] } });
    added.push(id);
  }
  const selectedId = added.find((id) => id === activeId) ?? added[0];
  const target = sessions.get(selectedId)!;
  history = target.history;
  state = target.editor;
  emit();
}

export function setViewport(width: number, height: number) {
  setState({ viewport: { width, height } });
  if (state.needsInitialFit) fitView();
}

export function setTool(tool: Tool, multiSelect = tool === "select" && state.multiSelect) {
  setState({
    tool,
    multiSelect,
    pendingSymbolKind: tool === "symbol" ? state.pendingSymbolKind : null,
    cableDraft: tool === "cable" ? state.cableDraft : [],
    scaleDraft: tool === "scale" ? state.scaleDraft : [],
    scalePreview: tool === "scale" ? state.scalePreview : null,
  });
}

export function setPendingSymbol(kind: SymbolKind) {
  setState({ tool: "symbol", pendingSymbolKind: kind, multiSelect: false });
}

export function setMultiSelect(enabled: boolean) {
  setTool("select", enabled);
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
  const editableIds = ids.filter((id) => {
    const element = state.project.elements.find((el) => el.id === id);
    return element && isLayerEditable(state.project, element.layerId);
  });
  const selectedIds = additive ? [...new Set([...state.selectedIds, ...editableIds])] : editableIds;
  setState({ selectedIds });
}

export function toggleSelection(id: string) {
  if (state.selectedIds.includes(id)) {
    setState({ selectedIds: state.selectedIds.filter((selectedId) => selectedId !== id) });
  } else {
    selectIds([id], true);
  }
}

export function clearSelection() {
  setState({ selectedIds: [] });
}

export function fitView(): boolean {
  const host = typeof document === "undefined" ? null : document.querySelector<HTMLElement>(".canvas-wrap");
  const width = host ? host.clientWidth : state.viewport.width;
  const height = host ? host.clientHeight : state.viewport.height;
  const cw = state.project.canvas.width;
  const ch = state.project.canvas.height;
  if (width < 10 || height < 10 || cw <= 0 || ch <= 0) return false;
  const zoom = Math.min(width / cw, height / ch) * 0.96;
  const pan = { x: (width - cw * zoom) / 2, y: (height - ch * zoom) / 2 };
  setState({ zoom, pan, viewport: { width, height }, needsInitialFit: false });
  return true;
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
  const snapped = snapPoint(point, state.snap);
  if (state.tool === "symbol" && state.pendingSymbolKind) {
    const layerId = defaultSymbolLayerId(state.project, state.pendingSymbolKind, state.activeLayerId);
    if (!isLayerEditable(state.project, layerId)) return;
    const next = addSymbol(state.project, { kind: state.pendingSymbolKind, layerId, ...snapped });
    const created = next.elements[next.elements.length - 1];
    commit(next, { selectedIds: [created.id] });
    return;
  }
  if (state.tool === "text") {
    if (!activeEditable()) return;
    const next = addText(state.project, { layerId: state.activeLayerId, ...snapped });
    const created = next.elements[next.elements.length - 1];
    commit(next, { selectedIds: [created.id], tool: "select" });
    return;
  }
  if (state.tool === "cable") {
    startCableSegment(point);
  }
  if (state.tool === "scale") {
    if (!activeEditable()) return;
    clickScalePoint(point);
  }
}

function cableLayerId(): string {
  return layerIdByName(state.project, "Przewody", state.activeLayerId);
}

export function startCableSegment(point: Point) {
  if (state.tool !== "cable" || !isLayerEditable(state.project, cableLayerId())) return;
  const snapped = snapPoint(point, state.snap);
  if (state.cableDraft.length === 0) {
    setState({ cableDraft: [snapped] });
    return;
  }
  setState({ cableDraft: [...state.cableDraft, snapped] });
}

export function previewCableSegment(point: Point) {
  if (state.tool !== "cable" || !isLayerEditable(state.project, cableLayerId())) return;
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
  const layerId = cableLayerId();
  if (!isLayerEditable(state.project, layerId)) return;
  const next = addCable(state.project, {
    layerId,
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
  const snapped = snapPoint(point, true, 1);
  if (state.scaleDraft.length === 0 || state.scaleDraft.length === 2) {
    setState({ scaleDraft: [snapped], scalePreview: null });
    return;
  }
  const start = state.scaleDraft[0];
  if (start.x === snapped.x && start.y === snapped.y) return;
  setState({ scaleDraft: [start, snapped], scalePreview: null });
}

export function previewScalePoint(point: Point) {
  if (state.tool !== "scale" || state.scaleDraft.length !== 1) return;
  const snapped = snapPoint(point, true, 1);
  const start = state.scaleDraft[0];
  if (state.scalePreview?.x === snapped.x && state.scalePreview?.y === snapped.y) return;
  setState({ scalePreview: start.x === snapped.x && start.y === snapped.y ? null : snapped });
}

export function cancelScale() {
  setState({ scaleDraft: [], scalePreview: null });
}

export function commitScaleLength(lengthM: number) {
  if (!Number.isFinite(lengthM) || lengthM <= 0) return;
  if (state.scaleDraft.length === 2) {
    const [start, end] = state.scaleDraft;
    if (start.x === end.x && start.y === end.y) return;
    commit(setScaleReference(state.project, {
      x1: start.x, y1: start.y, x2: end.x, y2: end.y, lengthM,
    }), { scaleDraft: [], scalePreview: null });
    return;
  }
  if (state.scaleDraft.length === 0 && state.project.scaleReference?.lengthM !== lengthM) {
    commit(setScaleLength(state.project, lengthM));
  }
}

export function commitApplySymbolScale(scale: number) {
  commit(applySymbolScaleSetting(state.project, scale, state.selectedIds));
}

export function commitScaleAllSymbols(scale: number) {
  commit(scaleAllSymbols(state.project, scale));
}

export function commitMoveElementsToLayer(ids: string[], layerId: string) {
  const next = moveElementsToLayer(state.project, ids, layerId);
  if (next === state.project) return;
  const editable = new Set(next.layers.filter((layer) => layer.visible && !layer.locked).map((layer) => layer.id));
  const selectedIds = state.selectedIds.filter((id) => {
    const element = next.elements.find((el) => el.id === id);
    return element && editable.has(element.layerId);
  });
  commit(next, { selectedIds });
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
  const next = updateLayer(state.project, layerId, patch);
  const editable = new Set(next.layers.filter((layer) => layer.visible && !layer.locked).map((layer) => layer.id));
  const selectedIds = state.selectedIds.filter((id) => {
    const element = next.elements.find((el) => el.id === id);
    return element && editable.has(element.layerId);
  });
  commit(next, { selectedIds });
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

export function commitSetAllGroupsCollapsed(collapsed: boolean) {
  commit(setAllGroupsCollapsed(state.project, collapsed));
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

export function setBackground(background: Project["background"], dataUrl: string, canvas: { width: number; height: number }, tabId = state.activeTabId) {
  const target = getTabState(tabId);
  if (!target) return;
  const nextProject = { ...target.project, background, canvas };
  if (tabId === state.activeTabId) {
    commit(nextProject, { backgroundDataUrl: dataUrl, needsInitialFit: true });
    fitView();
    return;
  }
  const stored = sessions.get(tabId)!;
  const nextHistory: HistoryState = {
    past: [...stored.history.past, snapshotProject(target.project)].slice(-HISTORY_LIMIT),
    future: [],
  };
  const nextEditor: EditorState = {
    ...target,
    project: nextProject,
    backgroundDataUrl: dataUrl,
    needsInitialFit: true,
    dirty: true,
    editRevision: target.editRevision + 1,
    undoDepth: nextHistory.past.length,
    redoDepth: 0,
  };
  sessions.set(tabId, { editor: nextEditor, history: nextHistory });
  emit();
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
    editRevision: state.editRevision + 1,
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
    editRevision: state.editRevision + 1,
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
  nextUntitledNumber = 1;
  state = emptyState();
  tabOrder = [state.activeTabId];
  sessions = new Map([[state.activeTabId, { editor: state, history }]]);
}
