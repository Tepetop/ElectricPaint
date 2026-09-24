import { describe, expect, it } from "vitest";
import { addGroup, addSymbol, assignSelectedToGroup } from "./commands";
import { createEmptyProject } from "./project";
import { collectSymbolList } from "./symbolList";

describe("collectSymbolList", () => {
  it("zbiera instancje z grupami i opisem, pomija ukryte warstwy", () => {
    let project = createEmptyProject();
    const layerId = project.layers[0].id;
    project = addSymbol(project, { kind: "switch-single", layerId, x: 0, y: 0 });
    project = addSymbol(project, { kind: "luminaire", layerId, x: 10, y: 0 });
    project = addGroup(project, "A");
    const switchId = project.elements[0].id;
    const lightId = project.elements[1].id;
    project = assignSelectedToGroup(project, project.groups[0].id, [switchId, lightId]);
    project = {
      ...project,
      elements: project.elements.map((el) =>
        el.id === switchId && el.type === "symbol" ? { ...el, description: "przy łóżku" } : el,
      ),
    };
    project = addLayerHidden(project);

    const rows = collectSymbolList(project);
    expect(rows).toEqual([
      { label: "L1", typeName: "Łącznik jednobiegunowy", groups: "A", description: "przy łóżku" },
      { label: "O1", typeName: "Wypust oświetleniowy", groups: "A", description: "" },
    ]);
  });
});

function addLayerHidden(project: ReturnType<typeof createEmptyProject>) {
  const extra = { ...project, layers: [...project.layers, { id: "hidden", name: "Ukryta", visible: false, locked: false }] };
  extra.elements = [
    ...extra.elements,
    {
      type: "symbol" as const,
      id: "hidden-sym",
      layerId: "hidden",
      kind: "socket-single" as const,
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      label: "G9",
      description: "nie na liście",
    },
  ];
  return extra;
}
