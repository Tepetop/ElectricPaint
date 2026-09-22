import type { Project, SymbolKind, SymbolRole } from "./types";

const PREFIX: Record<SymbolKind, string> = {
  "switch-single": "L",
  "switch-triple": "L",
  "switch-double": "L",
  "switch-stair": "L",
  "switch-stair-double": "L",
  "switch-cross": "L",
  "switch-push": "L",
  "socket-single": "G",
  "socket-double": "G",
  "socket-antenna": "G",
  luminaire: "O",
  "wall-light": "Z",
  ground: "U",
  bell: "D",
  meter: "C",
  "distribution-board": "Rg",
};

const LUMINAIRES: ReadonlySet<SymbolKind> = new Set(["luminaire", "wall-light"]);

export function symbolRole(kind: SymbolKind): SymbolRole {
  if (kind.startsWith("switch")) return "switch";
  if (kind.startsWith("socket")) return "socket";
  if (LUMINAIRES.has(kind)) return "luminaire";
  return "other";
}

export function labelPrefix(kind: SymbolKind): string {
  return PREFIX[kind];
}

function usedOrdinals(project: Project, prefix: string): Set<number> {
  const used = new Set<number>();
  for (const el of project.elements) {
    if (el.type !== "symbol" || !el.label.startsWith(prefix)) continue;
    const rest = el.label.slice(prefix.length);
    if (!/^\d+$/.test(rest)) continue;
    used.add(Number(rest));
  }
  return used;
}

export function allocateLabel(project: Project, kind: SymbolKind): { label: string; nextLabelSeq: Record<string, number> } {
  const prefix = labelPrefix(kind);
  const used = usedOrdinals(project, prefix);
  let next = 1;
  while (used.has(next)) next += 1;
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
