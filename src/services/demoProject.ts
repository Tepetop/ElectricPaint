export function makeDemoBackground(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = 900;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.toDataURL("image/png");
  ctx.fillStyle = "#f4efe4";
  ctx.fillRect(0, 0, 1400, 900);
  ctx.strokeStyle = "#2b2b2b";
  ctx.lineWidth = 6;
  ctx.strokeRect(40, 40, 1320, 820);
  ctx.strokeRect(40, 40, 520, 420);
  ctx.strokeRect(560, 40, 800, 420);
  ctx.strokeRect(40, 460, 1320, 400);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(280, 460);
  ctx.lineTo(280, 820);
  ctx.stroke();
  ctx.font = "22px sans-serif";
  ctx.fillStyle = "#444";
  ctx.fillText("Salon", 90, 80);
  ctx.fillText("Kuchnia", 600, 80);
  ctx.fillText("Przedpokój", 90, 510);
  ctx.fillText("Sypialnia", 360, 510);
  return canvas.toDataURL("image/png");
}
