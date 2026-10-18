import { describe, expect, it } from "vitest";
import {
  SYMBOL_SIZE,
  findClosestCableSegment,
  formatScaleLength,
  labelOffsetFromWorld,
  lengthInMeters,
  metersToMm,
  minCableSeparation,
  mmToMeters,
  resolveCableDraftPoint,
  resolveEditedCablePoints,
  resolveSegmentParallelOffset,
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
});

describe("układanie wiązek przewodów", () => {
  const width = 3;
  const dMin = minCableSeparation(width, width);
  const existing = [{ points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], width }];

  it("odsuwa przewód kładziony na istniejącym", () => {
    const points = resolveCableDraftPoint([{ x: 0, y: 0 }], { x: 100, y: 0 }, width, existing);
    expect(points[0].y).toBe(points[1].y);
    expect(Math.abs(points[0].y)).toBe(dMin);
    expect(points.map((p) => p.x)).toEqual([0, 100]);
  });

  it("układa trzeci przewód na kolejnym torze obok pary", () => {
    const first = existing[0];
    const second = { points: [{ x: 0, y: dMin }, { x: 100, y: dMin }], width };
    const points = resolveCableDraftPoint([{ x: 0, y: 0 }], { x: 100, y: 0 }, width, [first, second]);
    expect(points[0].y).toBe(points[1].y);
    expect(Math.abs(points[0].y)).toBe(dMin);
    expect(points[0].y).not.toBe(0);
    expect(points[0].y).not.toBe(dMin);
  });

  it("pozwala przejść nad przewodem pod kątem prostym i 45 stopni", () => {
    for (const candidate of [{ x: 50, y: 80 }, { x: 80, y: 80 }]) {
      const points = resolveCableDraftPoint([{ x: 50, y: -20 }], candidate, width, existing);
      expect(points).toEqual([{ x: 50, y: -20 }, snapCablePoint(candidate)]);
    }
    const crossed = resolveSegmentParallelOffset(
      { x: 50, y: -40 },
      { x: 50, y: 40 },
      width,
      [{ a: { x: 0, y: 0 }, b: { x: 100, y: 0 }, width }],
    );
    expect(crossed.offsetApplied).toBe(false);
  });

  it("nie rusza styku końców bez nakładania wzdłużnego", () => {
    const resolved = resolveSegmentParallelOffset(
      { x: 100, y: 0 },
      { x: 180, y: 0 },
      width,
      [{ a: { x: 0, y: 0 }, b: { x: 100, y: 0 }, width }],
    );
    expect(resolved.offsetApplied).toBe(false);
  });

  it("odsuwa przesuwany punkt istniejącego przewodu", () => {
    const points = resolveEditedCablePoints(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      1,
      width,
      existing,
    );
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(Math.abs(points[1].y)).toBe(dMin);
  });
});
