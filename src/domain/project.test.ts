import { describe, expect, it } from "vitest";
import { addCable, addGroup, addLayer, addSymbol, addText, applyGroupLabels, assignSelectedToGroup, deleteElements, deleteLayer, duplicateElements, moveElements, moveElementsToLayer, scaleAllSymbols } from "./commands";
import { migrateProject } from "./migrations";
import { allocateLabel, symbolRole } from "./numbering";
import { createEmptyProject } from "./project";
import { SCHEMA_VERSION } from "./types";
import { isSymbol } from "./types";

describe("numbering", () => {
  it("nadaje kolejne oznaczenia L/G/O", () => {
    let project = createEmptyProject();
    const layerId = project.layers[0].id;
    project = addSymbol(project, { kind: "switch-single", layerId, x: 0, y: 0 });
    project = addSymbol(project, { kind: "switch-stair", layerId, x: 10, y: 0 });
    expect(project.elements.filter(isSymbol).map((el) => el.label)).toEqual(["L1", "L2"]);
    expect(allocateLabel(project, "distribution-board").label).toBe("Rg1");
    expect(symbolRole("luminaire")).toBe("luminaire");
    expect(symbolRole("socket-double")).toBe("socket");
    expect(symbolRole("ground")).toBe("other");
    expect(symbolRole("distribution-board")).toBe("other");
  });

  it("po usunięciu bierze najmniejszy wolny numer z symboli na rzucie", () => {
    let project = createEmptyProject();
    const layerId = project.layers[0].id;
    for (let i = 0; i < 5; i++) {
      project = addSymbol(project, { kind: "switch-single", layerId, x: i * 10, y: 0 });
    }
    project = deleteElements(project, project.elements.map((el) => el.id));
    project = addSymbol(project, { kind: "switch-single", layerId, x: 0, y: 0 });
    expect(project.elements.filter(isSymbol).map((el) => el.label)).toEqual(["L1"]);

    project = addSymbol(project, { kind: "switch-single", layerId, x: 20, y: 0 });
    project = addSymbol(project, { kind: "switch-single", layerId, x: 40, y: 0 });
    project = deleteElements(project, [project.elements[1].id]);
    project = addSymbol(project, { kind: "switch-single", layerId, x: 60, y: 0 });
    expect(project.elements.filter(isSymbol).map((el) => el.label).sort()).toEqual(["L1", "L2", "L3"]);
  });
});

describe("commands", () => {
  it("dodaje symbole, trasy i grupy wiele-do-wielu", () => {
    let project = createEmptyProject();
    const layerId = project.layers[0].id;
    project = addSymbol(project, { kind: "switch-double", layerId, x: 10, y: 10 });
    project = addSymbol(project, { kind: "luminaire", layerId, x: 40, y: 40 });
    project = addSymbol(project, { kind: "luminaire", layerId, x: 80, y: 40 });
    const switchId = project.elements[0].id;
    const lightA = project.elements[1].id;
    const lightB = project.elements[2].id;
    project = addGroup(project);
    const firstGroupId = project.groups[0].id;
    project = addGroup(project);
    const secondGroupId = project.groups[0].id;
    project = assignSelectedToGroup(project, firstGroupId, [switchId, lightA]);
    project = assignSelectedToGroup(project, secondGroupId, [switchId, lightB]);
    expect(project.groups.map((g) => g.id)).toEqual([secondGroupId, firstGroupId]);
    expect(project.groups.find((g) => g.id === firstGroupId)?.switchIds).toContain(switchId);
    expect(project.groups.find((g) => g.id === secondGroupId)?.switchIds).toContain(switchId);
    expect(project.groups.find((g) => g.id === firstGroupId)?.luminaireIds).toEqual([lightA]);
    expect(project.elements.filter(isSymbol).map((el) => el.label)).toEqual(["L1", "O1", "O2"]);
  });

  it("po zatwierdzeniu grupy nadaje AL/AZ z numerem porządkowym", () => {
    let project = createEmptyProject();
    const layerId = project.layers[0].id;
    project = addSymbol(project, { kind: "switch-single", layerId, x: 0, y: 0 });
    project = addSymbol(project, { kind: "switch-stair", layerId, x: 10, y: 0 });
    project = addSymbol(project, { kind: "wall-light", layerId, x: 20, y: 0 });
    project = addSymbol(project, { kind: "luminaire", layerId, x: 30, y: 0 });
    project = addSymbol(project, { kind: "wall-light", layerId, x: 40, y: 0 });
    const ids = project.elements.map((el) => el.id);
    project = addGroup(project, "A");
    project = assignSelectedToGroup(project, project.groups[0].id, ids);
    project = applyGroupLabels(project, project.groups[0].id);
    expect(project.elements.filter(isSymbol).map((el) => el.label)).toEqual(["AL1", "AL2", "AZ1", "AZ2", "AZ3"]);
  });

  it("przesuwa, duplikuje i usuwa z czyszczeniem grup", () => {
    let project = createEmptyProject();
    const layerId = project.layers[0].id;
    project = addSymbol(project, { kind: "switch-single", layerId, x: 0, y: 0 });
    project = addCable(project, { layerId, points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] });
    const ids = project.elements.map((el) => el.id);
    project = addGroup(project);
    project = assignSelectedToGroup(project, project.groups[0].id, ids);
    project = moveElements(project, [ids[0]], 5, 7);
    const moved = project.elements[0];
    if (!isSymbol(moved)) throw new Error("expected symbol");
    expect(moved.x).toBe(5);
    expect(moved.y).toBe(7);
    project = duplicateElements(project, [ids[0]]);
    expect(project.elements.filter(isSymbol)).toHaveLength(2);
    project = deleteElements(project, [ids[0]]);
    expect(project.groups[0].switchIds).not.toContain(ids[0]);
  });

  it("usuwa warstwę z przeniesieniem elementów", () => {
    let project = createEmptyProject();
    project = addLayer(project, "Instalacja");
    const first = project.layers[0].id;
    const second = project.layers[1].id;
    project = addSymbol(project, { kind: "socket-single", layerId: second, x: 1, y: 1 });
    project = deleteLayer(project, second, { type: "move-to", targetId: first });
    expect(project.layers).toHaveLength(1);
    expect(project.elements[0].layerId).toBe(first);
  });

  it("nowa grupa ląduje na górze listy", () => {
    let project = createEmptyProject();
    project = addGroup(project, "A");
    project = addGroup(project, "B");
    expect(project.groups.map((group) => group.designation)).toEqual(["B", "A"]);
    expect(project.groups[0].collapsed).toBe(false);
  });

  it("nowy symbol bierze defaultSymbolScale, wcześniejsze zostają", () => {
    let project = createEmptyProject();
    const layerId = project.layers[0].id;
    project = addSymbol(project, { kind: "switch-single", layerId, x: 0, y: 0 });
    project = { ...project, defaultSymbolScale: 0.6 };
    project = addSymbol(project, { kind: "switch-single", layerId, x: 10, y: 0 });
    const scales = project.elements.filter(isSymbol).map((el) => el.scale);
    expect(scales).toEqual([1, 0.6]);
    expect(project.elements.filter(isSymbol)[1].description).toBe("");
  });

  it("przenosi symbole, przewody i teksty bez zmiany innych pól i grup", () => {
    let project = createEmptyProject();
    const source = project.layers[0].id;
    project = addLayer(project, "Ukryta");
    const target = project.layers[1].id;
    project = addSymbol(project, { kind: "switch-single", layerId: source, x: 17, y: 28 });
    project = addCable(project, { layerId: source, points: [{ x: 1, y: 2 }, { x: 3, y: 4 }] });
    project = addText(project, { layerId: source, x: 9, y: 10, text: "Uwaga" });
    const ids = project.elements.map((el) => el.id);
    project = addGroup(project);
    project = assignSelectedToGroup(project, project.groups[0].id, ids);
    const original = project;
    expect(moveElementsToLayer(project, ids, "brak-warstwy")).toBe(project);
    project = moveElementsToLayer(project, ids, target);
    expect(project.elements.map((el) => ({ ...el, layerId: source }))).toEqual(original.elements);
    expect(project.groups).toEqual(original.groups);
    expect(moveElementsToLayer(project, ids, target)).toBe(project);
  });

  it("skaluje symbole bez zmiany tekstu, przewodów i położenia", () => {
    let project = createEmptyProject();
    const layerId = project.layers[0].id;
    project = addSymbol(project, { kind: "switch-single", layerId, x: 17, y: 28 });
    project = addCable(project, { layerId, points: [{ x: 1, y: 2 }, { x: 3, y: 4 }] });
    project = addText(project, { layerId, x: 9, y: 10 });
    const original = project;
    expect(scaleAllSymbols(project, NaN)).toBe(project);
    project = scaleAllSymbols(project, 0.5);
    expect(project.elements[0]).toEqual({ ...original.elements[0], scale: 0.5 });
    expect(project.elements.slice(1)).toEqual(original.elements.slice(1));
    expect(project.defaultSymbolScale).toBe(0.5);
  });
});

describe("migrations", () => {
  it("uzupełnia brakującą warstwę i wersję", () => {
    const migrated = migrateProject({
      name: "Stary",
      elements: [{ type: "text", id: "t1", x: 0, y: 0, rotation: 0, scale: 1, text: "A", fontSize: 12 }],
    });
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
    expect(migrated.layers).toHaveLength(1);
    expect(migrated.elements[0].layerId).toBe(migrated.layers[0].id);
    expect(migrated.defaultSymbolScale).toBe(1);
    expect(migrated.scaleReference).toBeNull();
  });

  it("uzupełnia opis symbolu i collapsed grupy", () => {
    const migrated = migrateProject({
      schemaVersion: 1,
      layers: [{ id: "l1", name: "W", visible: true, locked: false }],
      elements: [{ type: "symbol", id: "s1", layerId: "l1", kind: "switch-single", x: 0, y: 0, rotation: 0, scale: 1, label: "L1" }],
      groups: [{ id: "g1", designation: "S1", switchIds: ["s1"], luminaireIds: [] }],
    });
    const symbol = migrated.elements[0];
    expect(isSymbol(symbol) && symbol.description).toBe("");
    expect(migrated.groups[0].collapsed).toBe(false);
  });

  it("odrzuca nowszą wersję schematu", () => {
    expect(() => migrateProject({ schemaVersion: 99 })).toThrow(/Nieobsługiwana/);
  });
});
