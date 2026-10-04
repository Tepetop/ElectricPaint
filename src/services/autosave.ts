const DB_NAME = "electricpaint";
const STORE = "kv";
const KEY = "autosave";

export type AutosavePayload = {
  projectJson: string;
  backgroundDataUrl: string | null;
  filePath: string | null;
  savedAt: number;
};

export type AutosaveTab = AutosavePayload & {
  id: string;
  title: string;
  zoom: number;
  pan: { x: number; y: number };
};

export type AutosaveBundle = {
  version: 2;
  activeTabId: string;
  tabs: AutosaveTab[];
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function writeAutosave(payload: AutosavePayload | AutosaveBundle): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(payload, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function readAutosave(): Promise<AutosavePayload | AutosaveBundle | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(KEY);
    request.onsuccess = () => resolve((request.result as AutosavePayload | AutosaveBundle) ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function clearAutosave(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
