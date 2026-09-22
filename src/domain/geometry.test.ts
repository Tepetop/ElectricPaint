import { describe, expect, it } from "vitest";
import { SYMBOL_SIZE, labelOffsetFromWorld, symbolLabelPosition } from "./geometry";

describe("symbolLabelPosition", () => {
  const base = { x: 100, y: 80, scale: 1 };

  it("przy kącie 0 stoi tuż po prawej stronie symbolu", () => {
    expect(symbolLabelPosition(base)).toEqual({
      x: 100 + SYMBOL_SIZE + 4,
      y: 80 + SYMBOL_SIZE / 2 - 6,
    });
  });

  it("po obrocie zostaje w tej samej odległości od środka symbolu", () => {
    const half = SYMBOL_SIZE / 2;
    const unrotated = symbolLabelPosition(base);
    const rotated = symbolLabelPosition({ ...base, rotation: 90 });
    const center = { x: base.x + half, y: base.y + half };
    const rotatedCenter = { x: base.x - half, y: base.y + half };
    const gap = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
    expect(gap(rotated, rotatedCenter)).toBeCloseTo(gap(unrotated, center));
  });

  it("przesunięcie wraca do tego samego punktu na planszy", () => {
    const el = { ...base, rotation: 90, scale: 1.5 };
    const world = symbolLabelPosition({ ...el, labelOffset: { x: 18, y: -10 } });
    const back = labelOffsetFromWorld(el, world);
    expect(back.x).toBeCloseTo(18);
    expect(back.y).toBeCloseTo(-10);
  });
});
