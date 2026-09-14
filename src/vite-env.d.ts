/// <reference types="vite/client" />

declare module "pdfjs-dist/build/pdf.worker.min.mjs?url" {
  const workerUrl: string;
  export default workerUrl;
}

import type { Point, SymbolKind } from "./domain/types";
import type { EditorState, Tool } from "./state/editorStore";

declare global {
  interface Window {
    __ep?: {
      placeAt: (point: Point) => void;
      selectIds: (ids: string[], additive?: boolean) => void;
      setPendingSymbol: (kind: SymbolKind) => void;
      setTool: (tool: Tool) => void;
      finishCable: () => void;
      getEditorState: () => EditorState;
    };
  }
}

export {};

