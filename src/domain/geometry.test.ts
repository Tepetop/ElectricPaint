import { describe, expect, it } from "vitest";
import { SYMBOL_SIZE, formatScaleLength, labelOffsetFromWorld, lengthInMeters, metersToMm, mmToMeters, symbolLabelPosition } from "./geometry";

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

describe("lengthInMeters", () => {
  it("przelicza polilinię przez odcinek odniesienia", () => {
    const ref = { x1: 0, y1: 0, x2: 100, y2: 0, lengthM: 2 };
    const meters = lengthInMeters(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 50 },
      ],
      ref,
    );
    expect(meters).toBeCloseTo(3);
  });

  it("bez skali zwraca null", () => {
    expect(lengthInMeters([{ x: 0, y: 0 }, { x: 10, y: 0 }], null)).toBeNull();
  });
});

describe("skala w milimetrach", () => {
  it("przelicza metry na milimetry i z powrotem", () => {
    expect(metersToMm(0.9)).toBe(900);
    expect(mmToMeters(900)).toBeCloseTo(0.9);
    expect(formatScaleLength(0.9)).toBe("900 mm");
    expect(formatScaleLength(1)).toBe("1000 mm");
  });
});
