import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import {
  commitAddGroup,
  commitAssignSelected,
  getEditorState,
  placeAt,
  resetEditorForTests,
  selectIds,
  setPendingSymbol,
} from "../state/editorStore";
import { GroupsPanel } from "./GroupsPanel";

describe("GroupsPanel", () => {
  afterEach(() => {
    cleanup();
    resetEditorForTests();
  });

  it("chowa karty grup i pokazuje je z powrotem", async () => {
    const user = userEvent.setup();
    commitAddGroup();
    render(<GroupsPanel />);
    expect(screen.getByDisplayValue("S1")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Schowaj grupy" }));
    expect(screen.queryByDisplayValue("S1")).not.toBeInTheDocument();
    expect(screen.getByText("Grupy są schowane.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pokaż grupy" }));
    expect(screen.getByDisplayValue("S1")).toBeInTheDocument();
  });

  it("kliknięcie grupy zaznacza wszystkie jej symbole", async () => {
    const user = userEvent.setup();
    setPendingSymbol("switch-single");
    placeAt({ x: 10, y: 10 });
    setPendingSymbol("luminaire");
    placeAt({ x: 40, y: 40 });
    const ids = getEditorState().project.elements.map((el) => el.id);
    selectIds(ids);
    commitAddGroup();
    commitAssignSelected(getEditorState().project.groups[0].id);
    selectIds([]);
    render(<GroupsPanel />);

    await user.click(screen.getByRole("button", { name: "Pokaż symbole" }));
    expect(getEditorState().selectedIds).toEqual(ids);

    selectIds([ids[0]]);
    await user.click(screen.getByRole("button", { name: "Zwiń grupę" }));
    await user.click(screen.getByText("Łączniki: 1 · Oprawy: 1"));
    expect(getEditorState().selectedIds).toEqual(ids);
  });
});
