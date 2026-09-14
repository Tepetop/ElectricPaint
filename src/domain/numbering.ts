import type { Project, SymbolKind, SymbolRole } from "./types";

const PREFIX: Record<SymbolKind, string> = {
  "switch-single": "L",
  "switch-double": "L",
  "switch-stair": "L",
  "switch-cross": "L",
  "socket-single": "G",
  "socket-double": "G",
  luminaire: "O",
  "wall-light": "K",
};

export function symbolRole(kind: SymbolKind): SymbolRole {
  if (kind.startsWith("switch")) return "switch";
  if (kind.startsWith("socket")) return "socket";
  return "luminaire";
}

export function labelPrefix(kind: SymbolKind): string {
  return PREFIX[kind];
}

export function allocateLabel(project: Project, kind: SymbolKind): { label: string; nextLabelSeq: Record<string, number> } {
  const prefix = labelPrefix(kind);
  const next = (project.nextLabelSeq[prefix] ?? 1);
  return {
    label: `${prefix}${next}`,
    nextLabelSeq: { ...project.nextLabelSeq, [prefix]: next + 1 },
  };
}

export function allocateGroupDesignation(project: Project): { designation: string; nextGroupSeq: number } {
  const next = project.nextGroupSeq || 1;
  return { designation: `S${next}`, nextGroupSeq: next + 1 };
}

export function allocateCableName(project: Project): { name: string; nextCableSeq: number } {
  const next = project.nextCableSeq || 1;
  return { name: `Przewód ${next}`, nextCableSeq: next + 1 };
}
