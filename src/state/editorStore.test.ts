import { afterEach, describe, expect, it } from "vitest";
import { lengthInMeters } from "../domain/geometry";
import { isCable, isSymbol } from "../domain/types";
import {
  clickScalePoint,
  commitApplySymbolScale,
  commitScaleAllSymbols,
  commitMoveElementsToLayer,
  commitAddLayer,
  commitUpdateLayer,
  commitSetAllGroupsCollapsed,
  commitAddGroup,
  commitScaleLength,
  commitCableSegment,
  duplicateSelected,
  finishCable,
  getEditorState,
  getTabState,
  closeTab,
  fitView,
  markSaved,
  newProject,
  placeAt,
  previewCableSegment,
  redo,
  resetEditorForTests,
  selectIds,
  setActiveLayer,
  setPendingSymbol,
  setSnap,
  setPan,
  setZoom,
  switchTab,
  setTool,
  startCableSegment,
  undo,
} from "./editorStore";

describe("editor history", () => {
  afterEach(() => {
    resetEditorForTests();
  });

  it("cofanie i ponawianie wstawienia symbolu", () => {
    setPendingSymbol("switch-single");
    placeAt({ x: 100, y: 80 });
    expect(getEditorState().project.elements).toHaveLength(1);
    undo();
    expect(getEditorState().project.elements).toHaveLength(0);
    redo();
    expect(getEditorState().project.elements).toHaveLength(1);
  });

  it("duplikuje zaznaczenie z nowym oznaczeniem", () => {
    setPendingSymbol("socket-single");
    placeAt({ x: 0, y: 0 });
    selectIds([getEditorState().project.elements[0].id]);
    duplicateSelected();
    const labels = getEditorState().project.elements.map((el) => ("label" in el ? el.label : ""));
    expect(labels).toEqual(["G1", "G2"]);
  });

  it("dokłada proste odcinki i zostaje w trybie przewodu", () => {
    setTool("cable");
    startCableSegment({ x: 0, y: 0 });
    previewCableSegment({ x: 40, y: 0 });
    previewCableSegment({ x: 80, y: 0 });
    expect(getEditorState().cableDraft).toEqual([
      { x: 0, y: 0 },
      { x: 80, y: 0 },
    ]);
    commitCableSegment();
    startCableSegment({ x: 80, y: 50 });
    previewCableSegment({ x: 80, y: 50 });
    commitCableSegment();
    finishCable();
    const el = getEditorState().project.elements[0];
    expect(isCable(el)).toBe(true);
    if (!isCable(el)) return;
    expect(el.points).toEqual([
      { x: 0, y: 0 },
      { x: 80, y: 0 },
      { x: 80, y: 50 },
    ]);
    expect(getEditorState().cableDraft).toEqual([]);
    expect(getEditorState().tool).toBe("cable");
  });
});

describe("tabs", () => {
  afterEach(() => resetEditorForTests());

  it("zachowuje osobne projekty, widoki, szkice i historie", () => {
    const firstId = getEditorState().activeTabId;
    setPendingSymbol("switch-single");
    placeAt({ x: 20, y: 20 });
    setZoom(2);
    setPan({ x: 43, y: 59 });
    setTool("scale");
    clickScalePoint({ x: 1, y: 2 });
    newProject();
    const secondId = getEditorState().activeTabId;
    expect(getEditorState().tabs).toHaveLength(2);
    expect(getEditorState().project.elements).toHaveLength(0);
    expect(getEditorState().undoDepth).toBe(0);
    setPendingSymbol("socket-single");
    placeAt({ x: 80, y: 80 });
    switchTab(firstId);
    expect(getEditorState().project.elements).toHaveLength(1);
    expect(getEditorState().zoom).toBe(2);
    expect(getEditorState().pan).toEqual({ x: 43, y: 59 });
    expect(getEditorState().scaleDraft).toEqual([{ x: 1, y: 2 }]);
    undo();
    expect(getEditorState().project.elements).toHaveLength(0);
    switchTab(secondId);
    expect(getEditorState().project.elements).toHaveLength(1);
    expect(getEditorState().undoDepth).toBe(1);
  });

  it("zapis ukończony po przełączeniu dotyczy właściwej zakładki i chroni nowsze zmiany", () => {
    setPendingSymbol("switch-single");
    placeAt({ x: 20, y: 20 });
    const firstId = getEditorState().activeTabId;
    const revision = getEditorState().editRevision;
    newProject();
    const secondId = getEditorState().activeTabId;
    markSaved(firstId, "pierwszy.epaint", revision);
    expect(getTabState(firstId)?.dirty).toBe(false);
    expect(getTabState(firstId)?.filePath).toBe("pierwszy.epaint");
    expect(getTabState(secondId)?.filePath).toBeNull();
    switchTab(firstId);
    placeAt({ x: 40, y: 20 });
    markSaved(firstId, "pierwszy.epaint", revision);
    expect(getEditorState().dirty).toBe(true);
  });

  it("dopasowuje do bieżącego rozmiaru płótna nawet przy nieaktualnym viewport", () => {
    const host = document.createElement("div");
    host.className = "canvas-wrap";
    Object.defineProperties(host, {
      clientWidth: { value: 1200 },
      clientHeight: { value: 800 },
    });
    document.body.append(host);
    try {
      expect(fitView()).toBe(true);
      expect(getEditorState().viewport).toEqual({ width: 1200, height: 800 });
      expect(getEditorState().zoom).toBeCloseTo(0.72);
    } finally {
      host.remove();
    }
  });

  it("zamknięcie ostatniej zakładki pozostawia pusty rzut", () => {
    const id = getEditorState().activeTabId;
    expect(closeTab(id)).toBe(true);
    expect(getEditorState().tabs).toHaveLength(1);
    expect(getEditorState().activeTabId).not.toBe(id);
    expect(getEditorState().project.elements).toHaveLength(0);
  });
});

describe("symbol scale and floor scale", () => {
  afterEach(() => {
    resetEditorForTests();
  });

  it("zaznaczony symbol i domyślna skala zmieniają się razem", () => {
    setPendingSymbol("switch-single");
    placeAt({ x: 0, y: 0 });
    commitApplySymbolScale(0.6);
    placeAt({ x: 40, y: 0 });
    const symbols = getEditorState().project.elements.filter(isSymbol);
    expect(symbols.map((el) => el.scale)).toEqual([0.6, 0.6]);
  });

  it("skala bez zaznaczenia nie rusza istniejących symboli", () => {
    setPendingSymbol("switch-single");
    placeAt({ x: 0, y: 0 });
    selectIds([]);
    commitApplySymbolScale(0.6);
    placeAt({ x: 40, y: 0 });
    const symbols = getEditorState().project.elements.filter(isSymbol);
    expect(symbols[0].scale).toBe(1);
    expect(symbols[1].scale).toBe(0.6);
  });

  it("skaluje wszystkie symbole także na ukrytej i zablokowanej warstwie w jednym kroku", () => {
    setPendingSymbol("switch-single");
    placeAt({ x: 0, y: 0 });
    const firstId = getEditorState().project.elements[0].id;
    commitAddLayer();
    placeAt({ x: 40, y: 0 });
    const secondLayer = getEditorState().activeLayerId;
    commitApplySymbolScale(1.4);
    commitUpdateLayer(secondLayer, { visible: false, locked: true });
    selectIds([firstId]);
    const depth = getEditorState().undoDepth;
    commitScaleAllSymbols(0.7);
    expect(getEditorState().undoDepth).toBe(depth + 1);
    expect(getEditorState().project.elements.filter(isSymbol).map((el) => el.scale)).toEqual([0.7, 0.7]);
    expect(getEditorState().project.defaultSymbolScale).toBe(0.7);
    undo();
    expect(getEditorState().project.elements.filter(isSymbol).map((el) => el.scale)).toEqual([1, 1.4]);
    expect(getEditorState().project.defaultSymbolScale).toBe(1.4);
  });

  it("nie zapisuje niepoprawnej ani niezmienionej skali", () => {
    const depth = getEditorState().undoDepth;
    for (const value of [0, -1, NaN, Infinity, 1]) commitScaleAllSymbols(value);
    expect(getEditorState().undoDepth).toBe(depth);
    expect(getEditorState().dirty).toBe(false);
  });

  it("szkic skali nie zmienia długości przed zatwierdzeniem i ma dokładność 1 px", () => {
    setTool("scale");
    setSnap(false);
    clickScalePoint({ x: 0, y: 0 });
    clickScalePoint({ x: 0.4, y: 0 });
    expect(getEditorState().scaleDraft).toHaveLength(1);
    clickScalePoint({ x: 12.6, y: 0 });
    expect(getEditorState().project.scaleReference).toBeNull();
    expect(getEditorState().scaleDraft).toEqual([{ x: 0, y: 0 }, { x: 13, y: 0 }]);
    expect(getEditorState().dirty).toBe(false);
    commitScaleLength(0);
    expect(getEditorState().project.scaleReference).toBeNull();
    commitScaleLength(0.9);
    expect(getEditorState().project.scaleReference).toEqual({
      x1: 0,
      y1: 0,
      x2: 13,
      y2: 0,
      lengthM: 0.9,
    });
    expect(getEditorState().scaleDraft).toEqual([]);
  });

  it("zachowuje przeliczenie długości przewodu do zatwierdzenia nowego odcinka", () => {
    setTool("scale");
    clickScalePoint({ x: 0, y: 0 });
    clickScalePoint({ x: 100, y: 0 });
    commitScaleLength(1);
    const points = [{ x: 0, y: 0 }, { x: 50, y: 0 }];
    expect(lengthInMeters(points, getEditorState().project.scaleReference)).toBe(0.5);
    clickScalePoint({ x: 0, y: 0 });
    clickScalePoint({ x: 50, y: 0 });
    expect(lengthInMeters(points, getEditorState().project.scaleReference)).toBe(0.5);
    commitScaleLength(1);
    expect(lengthInMeters(points, getEditorState().project.scaleReference)).toBe(1);
  });
});

describe("layers and groups", () => {
  afterEach(() => resetEditorForTests());

  it("przenosi zaznaczone elementy na ukrytą warstwę i usuwa je z zaznaczenia", () => {
    setPendingSymbol("switch-single");
    placeAt({ x: 10, y: 10 });
    const id = getEditorState().project.elements[0].id;
    commitAddLayer();
    const target = getEditorState().activeLayerId;
    commitUpdateLayer(target, { visible: false, locked: true });
    setActiveLayer(getEditorState().project.layers[0].id);
    selectIds([id]);
    const depth = getEditorState().undoDepth;
    commitMoveElementsToLayer([id], target);
    expect(getEditorState().project.elements[0].layerId).toBe(target);
    expect(getEditorState().selectedIds).toEqual([]);
    selectIds([id]);
    expect(getEditorState().selectedIds).toEqual([]);
    expect(getEditorState().undoDepth).toBe(depth + 1);
    undo();
    expect(getEditorState().project.elements[0].layerId).toBe(getEditorState().project.layers[0].id);
    expect(getEditorState().selectedIds).toEqual([]);
  });

  it("zbiorcze zwinięcie grup tworzy tylko jeden krok", () => {
    commitAddGroup();
    commitAddGroup();
    const depth = getEditorState().undoDepth;
    commitSetAllGroupsCollapsed(true);
    expect(getEditorState().project.groups.every((group) => group.collapsed)).toBe(true);
    expect(getEditorState().undoDepth).toBe(depth + 1);
    commitSetAllGroupsCollapsed(true);
    expect(getEditorState().undoDepth).toBe(depth + 1);
    undo();
    expect(getEditorState().project.groups.every((group) => !group.collapsed)).toBe(true);
  });
});
