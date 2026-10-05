import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { resetEditorForTests } from "../state/editorStore";
import { LayersPanel } from "./LayersPanel";

describe("LayersPanel", () => {
  afterEach(() => {
    cleanup();
    resetEditorForTests();
  });

  it("chowa karty warstw i pokazuje je z powrotem", async () => {
    const user = userEvent.setup();
    render(<LayersPanel />);
    expect(screen.getByDisplayValue("Gniazda")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Schowaj warstwy" }));
    expect(screen.queryByDisplayValue("Gniazda")).not.toBeInTheDocument();
    expect(screen.getByText("Warstwy są schowane.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pokaż warstwy" }));
    expect(screen.getByDisplayValue("Gniazda")).toBeInTheDocument();
  });
});
