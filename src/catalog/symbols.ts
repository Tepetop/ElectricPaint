export type SymbolCategory = "switches" | "sockets" | "lighting" | "other";

export type SymbolDefinition = {
  kind: import("../domain/types").SymbolKind;
  name: string;
  category: SymbolCategory;
  svg: string;
};

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="#111" stroke-width="3.25" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const SYMBOL_CATALOG: SymbolDefinition[] = [
  {
    kind: "switch-single",
    name: "Łącznik jednobiegunowy",
    category: "switches",
    svg: svg('<path d="M18 43 L48.5 10.4 L56 17" stroke-linejoin="miter"/><circle cx="18" cy="43" r="8" fill="#fff"/>'),
  },
  {
    kind: "switch-double",
    name: "Łącznik dwubiegunowy",
    category: "switches",
    svg: svg(
      '<path d="M18 43 L48.5 10.4 L56 17" stroke-linejoin="miter"/><path d="M46 13.2 L51 17.6"/><circle cx="18" cy="43" r="8" fill="#fff"/>',
    ),
  },
  {
    kind: "switch-stair",
    name: "Łącznik schodowy",
    category: "switches",
    svg: svg('<path d="M8 50 L13 54 L51 11 L56 15" stroke-linejoin="miter"/><circle cx="32" cy="32" r="6.5" fill="#fff"/>'),
  },
  {
    kind: "switch-cross",
    name: "Łącznik krzyżowy",
    category: "switches",
    svg: svg(
      '<path d="M8 50 L13 54 L51 11 L56 15" stroke-linejoin="miter"/><path d="M8 15 L13 11 L51 54 L56 50" stroke-linejoin="miter"/><circle cx="32" cy="32" r="6.5" fill="#fff"/>',
    ),
  },
  {
    kind: "switch-push",
    name: "Przycisk zwierny",
    category: "switches",
    svg: svg('<circle cx="32" cy="32" r="13" stroke-width="8"/>'),
  },
  {
    kind: "socket-single",
    name: "Gniazdo wtyczkowe pojedyncze",
    category: "sockets",
    svg: svg('<path d="M32 12 V30"/><path d="M8 30 H56"/><path d="M14 50 A18 18 0 0 1 50 50"/>'),
  },
  {
    kind: "socket-double",
    name: "Gniazdo wtyczkowe podwójne",
    category: "sockets",
    svg: svg(
      '<path d="M32 12 V30"/><path d="M6 30 H58"/><path d="M8 44 A12 12 0 0 1 32 44"/><path d="M36 44 A12 12 0 0 1 60 44"/>',
    ),
  },
  {
    kind: "socket-antenna",
    name: "Gniazdo wtyczkowe antenowe",
    category: "sockets",
    svg: svg('<path d="M14 54 V30 H50 V54"/><path d="M22 54 V38 H42 V54"/><path d="M32 30 V14"/>'),
  },
  {
    kind: "wall-light",
    name: "Żarówka",
    category: "lighting",
    svg: svg('<circle cx="32" cy="32" r="16"/><path d="M21 21 L43 43"/><path d="M43 21 L21 43"/>'),
  },
  {
    kind: "luminaire",
    name: "Wypust oświetleniowy",
    category: "lighting",
    svg: svg('<path d="M8 32 H36"/><path d="M32 22 L46 42"/><path d="M46 22 L32 42"/>'),
  },
  {
    kind: "ground",
    name: "Uziemienie",
    category: "other",
    svg: svg(
      '<path d="M32 10 V34"/><path d="M18 34 H46" stroke-width="3.8"/><path d="M22 41 H42" stroke-width="3.8"/><path d="M26 48 H38" stroke-width="3.8"/>',
    ),
  },
  {
    kind: "bell",
    name: "Dzwonek",
    category: "other",
    svg: svg('<path d="M16 40 A16 16 0 0 1 48 40"/><path d="M14 40 H50"/><path d="M22 40 V52"/><path d="M42 40 V52"/>'),
  },
  {
    kind: "meter",
    name: "Licznik energii",
    category: "other",
    svg: svg(
      '<rect x="18" y="12" width="28" height="40"/><path d="M18 22 H46"/><path d="M22 28 L26 38 L30 28 L34 38 L38 28 L42 38" stroke-width="3.8"/>',
    ),
  },
];

export const CATEGORY_LABELS: Record<SymbolCategory, string> = {
  switches: "Łączniki",
  sockets: "Gniazda",
  lighting: "Oświetlenie",
  other: "Pozostałe",
};

export function symbolByKind(kind: string): SymbolDefinition | undefined {
  return SYMBOL_CATALOG.find((item) => item.kind === kind);
}

export function symbolDataUrl(def: SymbolDefinition): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(def.svg)}`;
}
