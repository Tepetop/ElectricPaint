import { describe, expect, it } from "vitest";
import { addCable, addSymbol } from "../domain/commands";
import { createEmptyProject } from "../domain/project";
import { bytesToDataUrl, packProject, unpackProject } from "./projectFiles";

describe("project files", () => {
  it("pakuje i odtwarza projekt z tłem", async () => {
    let project = createEmptyProject("Test");
    const layerId = project.layers[0].id;
    project = addSymbol(project, { kind: "wall-light", layerId, x: 12, y: 20 });
    project = addCable(project, {
      layerId,
      points: [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
      ],
      name: "YDY 3x1.5",
      color: "#b91c1c",
    });
    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    project = {
      ...project,
      background: {
        kind: "image",
        filename: "rzut.png",
        mimeType: "image/png",
        width: 10,
        height: 10,
        asset: "assets/background.png",
      },
    };
    const packed = await packProject(project, png);
    const opened = await unpackProject(packed);
    expect(opened.project.name).toBe("Test");
    expect(opened.project.elements).toHaveLength(2);
    expect(opened.backgroundBytes).not.toBeNull();
    expect(opened.backgroundMime).toBe("image/png");
    const url = bytesToDataUrl(opened.backgroundBytes!, "image/png");
    expect(url.startsWith("data:image/png;base64,")).toBe(true);
  });
});
