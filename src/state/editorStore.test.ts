import { afterEach, describe, expect, it } from "vitest";
import { isCable } from "../domain/types";
import {
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
