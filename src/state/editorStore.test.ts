import { afterEach, describe, expect, it } from "vitest";
import {
  duplicateSelected,
  getEditorState,
  placeAt,
  redo,
  resetEditorForTests,
  selectIds,
  setPendingSymbol,
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
});
