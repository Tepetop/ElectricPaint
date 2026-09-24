import { useEditor } from "../state/editorStore";

export function StatusBar() {
  const tool = useEditor((s) => s.tool);
  const zoom = useEditor((s) => s.zoom);
  const layers = useEditor((s) => s.project.layers);
  const activeLayerId = useEditor((s) => s.activeLayerId);
  const dirty = useEditor((s) => s.dirty);
  const layer = layers.find((item) => item.id === activeLayerId);
  const tools: Record<string, string> = {
    select: "Zaznaczanie",
    pan: "Przesuwanie widoku",
    symbol: "Wstawianie symbolu",
    cable: "Rysowanie przewodu",
    scale: "Skala rzutu",
    text: "Tekst",
  };
  return (
    <footer className="status">
      <span>Narzędzie: <strong>{tools[tool] ?? tool}</strong></span>
      <span>Zoom: <strong>{Math.round(zoom * 100)}%</strong></span>
      <span>Warstwa: <strong>{layer?.name ?? "—"}</strong></span>
      <span>Zapis: <strong className={dirty ? "dirty" : ""}>{dirty ? "niezapisany" : "zapisany"}</strong></span>
    </footer>
  );
}
