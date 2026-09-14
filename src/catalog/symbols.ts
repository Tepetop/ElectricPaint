export type SymbolCategory = "switches" | "sockets" | "lighting";

export type SymbolDefinition = {
  kind: import("../domain/types").SymbolKind;
  name: string;
  category: SymbolCategory;
  svg: string;
};

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="#111" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const SYMBOL_CATALOG: SymbolDefinition[] = [
  {
    kind: "switch-single",
    name: "Łącznik pojedynczy",
    category: "switches",
    svg: svg('<circle cx="22" cy="42" r="10" fill="#fff"/><path d="M28 34 L48 14"/>'),
  },
  {
    kind: "switch-double",
    name: "Łącznik podwójny",
    category: "switches",
    svg: svg('<circle cx="20" cy="44" r="9" fill="#fff"/><path d="M26 37 L44 16"/><path d="M29 40 L50 22"/>'),
  },
  {
    kind: "switch-stair",
    name: "Łącznik schodowy",
    category: "switches",
    svg: svg('<circle cx="22" cy="42" r="10" fill="#fff"/><path d="M28 34 L50 12"/><path d="M24 30 L46 8"/>'),
  },
  {
    kind: "switch-cross",
    name: "Łącznik krzyżowy",
    category: "switches",
    svg: svg('<circle cx="32" cy="32" r="12" fill="#fff"/><path d="M20 20 L44 44"/><path d="M44 20 L20 44"/>'),
  },
  {
    kind: "socket-single",
    name: "Gniazdo pojedyncze",
    category: "sockets",
    svg: svg('<path d="M14 40 A18 18 0 0 1 50 40" fill="#fff"/><path d="M14 40 H50"/><circle cx="26" cy="34" r="2" fill="#111" stroke="none"/><circle cx="38" cy="34" r="2" fill="#111" stroke="none"/>'),
  },
  {
    kind: "socket-double",
    name: "Gniazdo podwójne",
    category: "sockets",
    svg: svg('<path d="M8 40 A14 14 0 0 1 32 40" fill="#fff"/><path d="M8 40 H32"/><path d="M32 40 A14 14 0 0 1 56 40" fill="#fff"/><path d="M32 40 H56"/>'),
  },
  {
    kind: "luminaire",
    name: "Oprawa oświetlenia",
    category: "lighting",
    svg: svg('<circle cx="32" cy="32" r="16" fill="#fff"/><path d="M21 21 L43 43"/><path d="M43 21 L21 43"/>'),
  },
  {
    kind: "wall-light",
    name: "Kinkiet",
    category: "lighting",
    svg: svg('<path d="M10 12 V52"/><circle cx="36" cy="32" r="14" fill="#fff"/><path d="M26 22 L46 42"/><path d="M46 22 L26 42"/>'),
  },
];

export const CATEGORY_LABELS: Record<SymbolCategory, string> = {
  switches: "Łączniki",
  sockets: "Gniazda",
  lighting: "Oświetlenie",
};

export function symbolByKind(kind: string): SymbolDefinition | undefined {
  return SYMBOL_CATALOG.find((item) => item.kind === kind);
}

export function symbolDataUrl(def: SymbolDefinition): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(def.svg)}`;
}
