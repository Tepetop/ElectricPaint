import { describe, expect, it } from "vitest";
import { collectCableList } from "./cableList";
import { addCable, addSymbol } from "./commands";
import { createEmptyProject } from "./project";

describe("collectCableList", () => {
  it("zbiera widoczny przewód z nazwą, kolorem i podłączonymi symbolami", () => {
    let project = createEmptyProject();
    const layerId = project.layers[0].id;
    project = addSymbol(project, { kind: "switch-single", layerId, x: 0, y: 0 });
    project = addSymbol(project, { kind: "luminaire", layerId, x: 10, y: 0 });
    const switchId = project.elements[0].id;
    const lightId = project.elements[1].id;
    project = addCable(project, {
      layerId,
      points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      name: "Oświetlenie salon",
      color: "#1d4ed8",
      symbolIds: [switchId, lightId],
    });
    project = addCable(project, {
      layerId,
      points: [{ x: 0, y: 0 }, { x: 20, y: 0 }],
      name: "Drugi",
      color: "#111827",
      symbolIds: [lightId],
    });

    expect(collectCableList(project)).toEqual([
      { name: "Oświetlenie salon", color: "#1d4ed8", symbols: "L1, O1" },
      { name: "Drugi", color: "#111827", symbols: "O1" },
    ]);
  });

  it("pomija przewód z visible: false", () => {
    let project = createEmptyProject();
    const layerId = project.layers[0].id;
    project = addCable(project, {
      layerId,
      points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      name: "Schowany",
      color: "#000000",
      visible: false,
    });

    expect(collectCableList(project)).toEqual([]);
  });

  it("pomija przewód na ukrytej warstwie", () => {
    let project = createEmptyProject();
    project = {
      ...project,
      layers: [...project.layers, { id: "hidden", name: "Ukryta", visible: false, locked: false }],
    };
    project = addCable(project, {
      layerId: "hidden",
      points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      name: "Na ukrytej",
      color: "#000000",
    });

    expect(collectCableList(project)).toEqual([]);
  });

  it("pomija symbol z ukrytej warstwy w kolumnie symboli", () => {
    let project = createEmptyProject();
    const layerId = project.layers[0].id;
    project = addSymbol(project, { kind: "switch-single", layerId, x: 0, y: 0 });
    project = {
      ...project,
      layers: [...project.layers, { id: "hidden", name: "Ukryta", visible: false, locked: false }],
    };
    project = addSymbol(project, { kind: "luminaire", layerId: "hidden", x: 10, y: 0 });
    const switchId = project.elements[0].id;
    const hiddenId = project.elements[1].id;
    project = addCable(project, {
      layerId,
      points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      name: "Trasa",
      color: "#ff0000",
      symbolIds: [switchId, hiddenId, "brak"],
    });

    expect(collectCableList(project)).toEqual([{ name: "Trasa", color: "#ff0000", symbols: "L1" }]);
  });
});
