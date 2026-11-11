import type { Project, SymbolKind, SymbolRole } from "./types";

const PREFIX: Record<SymbolKind, string> = {
  "switch-single": "L",
  "switch-triple": "L",
  "switch-double": "L",
  "switch-double-pole": "L",
  "switch-stair": "L",
  "switch-stair-double": "L",
  "switch-cross": "L",
  "switch-cross-double": "L",
  "switch-push": "L",
  "switch-roller": "R",
  "switch-single-ip44": "L",
  "switch-double-ip44": "L",
  "switch-double-pole-ip44": "L",
  "switch-stair-ip44": "L",
  "switch-stair-double-ip44": "L",
  "switch-cross-ip44": "L",
  "switch-cross-double-ip44": "L",
  "switch-push-ip44": "L",
  "socket-single": "G",
  "socket-single-ip44": "G",
  "socket-double": "G",
  "socket-double-ip44": "G",
  "socket-400v": "G",
  "socket-fridge": "G",
  "socket-washer": "G",
  "socket-dryer": "G",
  "socket-dishwasher": "G",
  "socket-antenna": "G",
  "outlet-single-phase": "W",
  "outlet-three-phase": "W",
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
  if (kind.startsWith("outlet")) return "outlet";
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
  const used = new Set(project.groups.flatMap((group) => {
    const match = /^S(\d+)$/i.exec(group.designation.trim());
    return match ? [Number(match[1])] : [];
  }));
  let next = 1;
  while (used.has(next)) next += 1;
  return { designation: `S${next}`, nextGroupSeq: next + 1 };
}

const AUTO_CABLE_NAME = /^Przewód \d+$/;

export function syncCableNumbers(project: Project): Project {
  let count = 0;
  let changed = false;
  const elements = project.elements.map((el) => {
    if (el.type !== "cable" || !AUTO_CABLE_NAME.test(el.name)) return el;
    count += 1;
    const name = `Przewód ${count}`;
    if (el.name === name) return el;
    changed = true;
    return { ...el, name };
  });
  const nextCableSeq = count + 1;
  if (!changed && project.nextCableSeq === nextCableSeq) return project;
  return { ...project, elements: changed ? elements : project.elements, nextCableSeq };
}
