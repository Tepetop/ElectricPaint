import { describe, expect, it } from "vitest";
import { snapPoint, snapValue } from "./geometry";

describe("snap do najbliższej linii", () => {
  it("wyłączony snap zostawia wartość", () => {
    expect(snapValue(15, false, 10)).toBe(15);
  });

  it("połówka idzie w górę", () => {
    expect(snapValue(14, true, 10)).toBe(10);
    expect(snapValue(15, true, 10)).toBe(20);
    expect(snapValue(16, true, 10)).toBe(20);
  });

  it("ujemna połówka idzie jak Math.round", () => {
    expect(snapValue(-15, true, 10)).toBe(-10);
  });

  it("snapPoint rusza obie osie", () => {
    expect(snapPoint({ x: 15, y: 4 }, true, 10)).toEqual({ x: 20, y: 0 });
  });
});
