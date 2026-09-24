import { afterEach, describe, expect, it } from "vitest";
import { isCable, isSymbol } from "../domain/types";
import {
  clickScalePoint,
  commitApplySymbolScale,
  commitScaleLength,
  commitCableSegment,
  duplicateSelected,
  finishCable,
  getEditorState,
  placeAt,
  previewCableSegment,
  redo,
  resetEditorForTests,
  selectIds,
  setPendingSymbol,
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

  it("dwa kliknięcia zapisują odcinek odniesienia", () => {
    setTool("scale");
    clickScalePoint({ x: 0, y: 0 });
    clickScalePoint({ x: 100, y: 0 });
    expect(getEditorState().project.scaleReference).toEqual({
      x1: 0,
      y1: 0,
      x2: 100,
      y2: 0,
      lengthM: 1,
    });
    expect(getEditorState().scaleDraft).toEqual([]);
  });

  it("zapisuje długość odcinka mniejszą niż metr", () => {
    setTool("scale");
    clickScalePoint({ x: 0, y: 0 });
    clickScalePoint({ x: 100, y: 0 });
    commitScaleLength(0.9);
    expect(getEditorState().project.scaleReference?.lengthM).toBeCloseTo(0.9);
  });
});
