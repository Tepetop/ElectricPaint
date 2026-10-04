export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function downloadBytes(filename: string, bytes: Uint8Array, mime: string) {
  const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function saveBytesWithDialog(
  suggestedName: string,
  bytes: Uint8Array,
  filters: { name: string; extensions: string[] }[],
): Promise<string | null> {
  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    const path = await save({ defaultPath: suggestedName, filters });
    if (!path) return null;
    await writeFile(path, bytes);
    return path;
  }
  downloadBytes(suggestedName, bytes, "application/octet-stream");
  return suggestedName;
}

export async function readBytesFromPath(path: string): Promise<Uint8Array> {
  const { readFile } = await import("@tauri-apps/plugin-fs");
  return await readFile(path);
}

export async function pickOpenPath(): Promise<string | null> {
  if (!isTauri()) return null;
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({
    multiple: false,
    filters: [
      {
        name: "ElectricPaint i rzuty",
        extensions: ["epaint", "pdf", "png", "jpg", "jpeg", "webp", "dxf"],
      },
    ],
  });
  return typeof selected === "string" ? selected : null;
}
