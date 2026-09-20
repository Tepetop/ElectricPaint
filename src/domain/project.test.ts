import { describe, expect, it } from "vitest";
import { addCable, addGroup, addLayer, addSymbol, applyGroupLabels, assignSelectedToGroup, deleteElements, deleteLayer, duplicateElements, moveElements } from "./commands";
import { migrateProject } from "./migrations";
import { allocateLabel, symbolRole } from "./numbering";
import { createEmptyProject } from "./project";
import { SCHEMA_VERSION } from "./types";
import { isSymbol } from "./types";

describe("numbering", () => {
  it("nadaje kolejne oznaczenia L/G/O", () => {
    let project = createEmptyProject();
    const first = allocateLabel(project, "switch-single");
    project = { ...project, nextLabelSeq: first.nextLabelSeq };
    const second = allocateLabel(project, "switch-stair");
    expect(first.label).toBe("L1");
    expect(second.label).toBe("L2");
    expect(symbolRole("luminaire")).toBe("luminaire");
    expect(symbolRole("socket-double")).toBe("socket");
    expect(symbolRole("ground")).toBe("other");
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
    project = addGroup(project);
    project = assignSelectedToGroup(project, project.groups[0].id, [switchId, lightA]);
    project = assignSelectedToGroup(project, project.groups[1].id, [switchId, lightB]);
    expect(project.groups[0].switchIds).toContain(switchId);
    expect(project.groups[1].switchIds).toContain(switchId);
    expect(project.groups[0].luminaireIds).toEqual([lightA]);
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
  });

  it("odrzuca nowszą wersję schematu", () => {
    expect(() => migrateProject({ schemaVersion: 99 })).toThrow(/Nieobsługiwana/);
  });
});
