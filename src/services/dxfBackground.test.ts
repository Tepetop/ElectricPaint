import { describe, expect, it } from "vitest";
import { strokesFromDxf, type DxfStroke } from "./dxfBackground";

function dxf(groups: Array<[number, string | number]>): string {
  return groups.flatMap(([code, value]) => [String(code), String(value)]).join("\n") + "\n";
}

function near(a: number, b: number, eps = 1e-4) {
  return Math.abs(a - b) < eps;
}

function hasStroke(strokes: DxfStroke[], x1: number, y1: number, x2: number, y2: number) {
  return strokes.some(
    (s) =>
      (near(s.x1, x1) && near(s.y1, y1) && near(s.x2, x2) && near(s.y2, y2)) ||
      (near(s.x1, x2) && near(s.y1, y2) && near(s.x2, x1) && near(s.y2, y1)),
  );
}

const SAMPLE = dxf([
  [0, "SECTION"],
  [2, "BLOCKS"],
  [0, "BLOCK"],
  [2, "MYBLOCK"],
  [10, 0],
  [20, 0],
  [30, 0],
  [0, "LINE"],
  [8, "0"],
  [10, 0],
  [20, 0],
  [11, 10],
  [21, 0],
  [0, "ENDBLK"],
  [0, "ENDSEC"],
  [0, "SECTION"],
  [2, "ENTITIES"],
  [0, "LINE"],
  [8, "0"],
  [10, 0],
  [20, 0],
  [11, 100],
  [21, 0],
  [0, "LWPOLYLINE"],
  [8, "0"],
  [90, 4],
  [70, 1],
  [10, 0],
  [20, 0],
  [10, 20],
  [20, 0],
  [10, 20],
  [20, 20],
  [10, 0],
  [20, 20],
  [0, "CIRCLE"],
  [8, "0"],
  [10, 50],
  [20, 50],
  [40, 10],
  [0, "INSERT"],
  [8, "0"],
  [2, "MYBLOCK"],
  [10, 200],
  [20, 0],
  [0, "ENDSEC"],
  [0, "EOF"],
]);

describe("strokesFromDxf", () => {
  it("zbiera kreski z linii, zamkniętej polilinii, okręgu i INSERT", () => {
    const strokes = strokesFromDxf(SAMPLE);
    expect(hasStroke(strokes, 0, 0, 100, 0)).toBe(true);
    expect(hasStroke(strokes, 0, 0, 20, 0)).toBe(true);
    expect(hasStroke(strokes, 20, 0, 20, 20)).toBe(true);
    expect(hasStroke(strokes, 20, 20, 0, 20)).toBe(true);
    expect(hasStroke(strokes, 0, 20, 0, 0)).toBe(true);
    expect(hasStroke(strokes, 200, 0, 210, 0)).toBe(true);

    const circle = strokes.filter(
      (s) =>
        near(Math.hypot((s.x1 + s.x2) / 2 - 50, (s.y1 + s.y2) / 2 - 50), 10, 0.5),
    );
    expect(circle.length).toBeGreaterThan(16);
    for (const s of circle) {
      expect(Math.hypot(s.x1 - 50, s.y1 - 50)).toBeCloseTo(10, 5);
      expect(Math.hypot(s.x2 - 50, s.y2 - 50)).toBeCloseTo(10, 5);
    }
  });

  it("odrzuca binarny DXF", () => {
    expect(() => strokesFromDxf("AutoCAD Binary DXF\r\n\u001a\u0000")).toThrow(/binarny/);
  });
});
