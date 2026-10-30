import { describe, expect, it } from "vitest";
import {
  SYMBOL_SIZE,
  cableDash,
  findClosestCableSegment,
  formatScaleLength,
  labelOffsetFromWorld,
  lengthInMeters,
  metersToMm,
  mmToMeters,
  segmentMidpoint,
  snapCablePoint,
  symbolLabelPosition,
} from "./geometry";

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

  it("obrót 90° wraca do punktu oddalonego o kilka pikseli", () => {
    const el = { ...base, rotation: 90 };
    const origin = symbolLabelPosition(el);
    const world = { x: origin.x + 5, y: origin.y - 4 };
    const back = symbolLabelPosition({ ...el, labelOffset: labelOffsetFromWorld(el, world) });
    expect(Math.hypot(back.x - world.x, back.y - world.y)).toBeLessThanOrEqual(1);
  });

  it("gniazdo i wypust mają etykietę nad obrysem, od północy", () => {
    const northX = base.x + SYMBOL_SIZE / 2 - 8;
    const northY = base.y + 0.35 * SYMBOL_SIZE - 12 - 2;
    const outlineTop = {
      "socket-single": 0.357 * SYMBOL_SIZE,
      "socket-double": 0.357 * SYMBOL_SIZE,
      "outlet-single-phase": 0.37 * SYMBOL_SIZE,
    } as const;
    for (const kind of ["socket-single", "socket-double", "outlet-single-phase"] as const) {
      const pos = symbolLabelPosition({ ...base, kind });
      expect(pos.x).toBeCloseTo(northX);
      expect(pos.y).toBeCloseTo(northY);
      expect(pos.y - base.y + 12).toBeLessThan(outlineTop[kind]);
    }
    const antenna = symbolLabelPosition({ ...base, kind: "socket-antenna" });
    expect(antenna.x).toBeCloseTo(northX);
    expect(antenna.y).toBeCloseTo(base.y + 0.19 * SYMBOL_SIZE - 12 - 2);
    expect(antenna.y - base.y + 12).toBeLessThan(0.193 * SYMBOL_SIZE);
  });

  it("łącznik zostaje po prawej stronie", () => {
    expect(symbolLabelPosition({ ...base, kind: "switch-single" })).toEqual({
      x: 100 + SYMBOL_SIZE + 4,
      y: 80 + SYMBOL_SIZE / 2 - 6,
    });
  });

  it("przesunięcie gniazda i wypustu wraca po obrocie i skali", () => {
    for (const kind of ["socket-single", "outlet-three-phase"] as const) {
      const el = { ...base, kind, rotation: 90, scale: 1.5 };
      const world = symbolLabelPosition({ ...el, labelOffset: { x: 18, y: -10 } });
      const back = labelOffsetFromWorld(el, world);
      expect(back.x).toBeCloseTo(18);
      expect(back.y).toBeCloseTo(-10);
    }
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

describe("snapCablePoint", () => {
  it("zaokrągla do 1 px", () => {
    expect(snapCablePoint({ x: 12.4, y: 7.6 })).toEqual({ x: 12, y: 8 });
    expect(snapCablePoint({ x: 12.5, y: -1.2 })).toEqual({ x: 13, y: -1 });
  });
});

describe("geometria odcinków przewodu", () => {
  it("liczy środek odcinka", () => {
    expect(segmentMidpoint({ x: 0, y: 0 }, { x: 10, y: 4 })).toEqual({ x: 5, y: 2 });
  });

  it("znajduje najbliższy odcinek polilinii", () => {
    const hit = findClosestCableSegment(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ],
      { x: 12, y: 5 },
    );
    expect(hit?.index).toBe(1);
    expect(hit?.point).toEqual({ x: 10, y: 5 });
    expect(hit?.distance).toBe(2);
  });

  it("zwraca wzór kreskowania dla stylów przewodu", () => {
    expect(cableDash("solid")).toBeUndefined();
    expect(cableDash("dashed")).toEqual([12, 8]);
    expect(cableDash("dot-dash")).toEqual([2, 8, 12, 8]);
  });
});
