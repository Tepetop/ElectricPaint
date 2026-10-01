import { describe, expect, it } from "vitest";
import { boundsContain } from "./geometry";

const box = { x: 10, y: 20, width: 100, height: 50 };

describe("boundsContain", () => {
  it("brzeg prawy i dolny należą do obszaru", () => {
    expect(boundsContain(box, 110, 70, 0, 0)).toBe(true);
    expect(boundsContain(box, 10, 20, 100, 50)).toBe(true);
  });

  it("lewy górny róg należy do obszaru", () => {
    expect(boundsContain(box, 10, 20, 0, 0)).toBe(true);
  });

  it("punkt tuż za brzegiem jest na zewnątrz", () => {
    expect(boundsContain(box, 111, 20, 0, 0)).toBe(false);
    expect(boundsContain(box, 10, 71, 0, 0)).toBe(false);
  });
});
