import { describe, expect, it } from "vitest";
import { routeBounds } from "./geometry";

describe("routeBounds", () => {
  it("null dla pustej trasy i jednego punktu", () => {
    expect(routeBounds([])).toBeNull();
    expect(routeBounds([{ x: 1, y: 2 }])).toBeNull();
  });

  it("opisuje prostokąt punktów", () => {
    expect(
      routeBounds([
        { x: 10, y: 30 },
        { x: 40, y: 5 },
        { x: 25, y: 30 },
      ]),
    ).toEqual({ x: 10, y: 5, width: 30, height: 25 });
  });

  it("odcinek pionowy ma szerokość 0", () => {
    expect(
      routeBounds([
        { x: 8, y: 1 },
        { x: 8, y: 11 },
      ]),
    ).toEqual({ x: 8, y: 1, width: 0, height: 10 });
  });
});
