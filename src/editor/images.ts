import { SYMBOL_CATALOG, symbolDataUrl } from "../catalog/symbols";

const cache = new Map<string, HTMLImageElement>();
let preloadPromise: Promise<void> | null = null;

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Nie wczytano ${src}`));
    image.src = src;
  });
}

export function preloadSymbolImages(): Promise<void> {
  if (!preloadPromise) {
    preloadPromise = Promise.all(
      SYMBOL_CATALOG.map(async (def) => {
        const image = await load(symbolDataUrl(def));
        cache.set(def.kind, image);
      }),
    ).then(() => undefined);
  }
  return preloadPromise;
}

export function symbolImage(kind: string): HTMLImageElement | undefined {
  return cache.get(kind);
}

export function loadDataUrlImage(dataUrl: string): Promise<HTMLImageElement> {
  return load(dataUrl);
}
