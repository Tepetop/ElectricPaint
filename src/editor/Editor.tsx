import { useEffect } from "react";
import {
  cancelCable,
  deleteSelected,
  duplicateSelected,
  finishCable,
  fitView,
  getEditorState,
  placeAt,
  redo,
  selectIds,
  setPendingSymbol,
  setTool,
  undo,
} from "../state/editorStore";
import { StageCanvas } from "./StageCanvas";

export function Editor() {
  useEffect(() => {
    window.__ep = { placeAt, selectIds, setPendingSymbol, setTool, finishCable, getEditorState };
    return () => {
      delete window.__ep;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (ctrl && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (ctrl && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (ctrl && e.key === "0") {
        e.preventDefault();
        fitView();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
        return;
      }
      if (e.key === "Enter") {
        finishCable();
        return;
      }
      if (e.key === "Escape") {
        cancelCable();
        return;
      }
      if (!ctrl && e.key.toLowerCase() === "v") setTool("select");
      if (!ctrl && e.key.toLowerCase() === "h") setTool("pan");
      if (!ctrl && e.key.toLowerCase() === "c") setTool("cable");
      if (!ctrl && e.key.toLowerCase() === "t") setTool("text");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return <StageCanvas />;
}
