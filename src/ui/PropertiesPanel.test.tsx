import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { isSymbol } from "../domain/types";
import { getEditorState, placeAt, resetEditorForTests, setPendingSymbol } from "../state/editorStore";
import { PropertiesPanel } from "./PropertiesPanel";

function placedSymbol() {
  setPendingSymbol("switch-single");
  placeAt({ x: 40, y: 40 });
  const el = getEditorState().project.elements[0];
  if (!isSymbol(el)) throw new Error("expected symbol");
  return el;
}

describe("PropertiesPanel rotation", () => {
  afterEach(() => {
    cleanup();
    resetEditorForTests();
  });

  it("przyjmuje ujemny kąt wpisany w polu Obrót", async () => {
    const user = userEvent.setup();
    placedSymbol();
    render(<PropertiesPanel />);
    const input = screen.getByRole("spinbutton", { name: "Obrót" });
    await user.clear(input);
    await user.type(input, "-90");
    const el = getEditorState().project.elements[0];
    expect(isSymbol(el) && el.rotation).toBe(-90);
    expect(input).toHaveValue(-90);
  });

  it("zapisuje przesunięcie opisu", async () => {
    const user = userEvent.setup();
    placedSymbol();
    render(<PropertiesPanel />);
    await user.clear(screen.getByRole("spinbutton", { name: "Przesunięcie opisu X" }));
    await user.type(screen.getByRole("spinbutton", { name: "Przesunięcie opisu X" }), "24");
    await user.clear(screen.getByRole("spinbutton", { name: "Przesunięcie opisu Y" }));
    await user.type(screen.getByRole("spinbutton", { name: "Przesunięcie opisu Y" }), "-8");
    const el = getEditorState().project.elements[0];
    expect(isSymbol(el) && el.labelOffset).toEqual({ x: 24, y: -8 });
  });

  it("zostawia dokładny kąt z pola, bez skoku co 90", async () => {
    const user = userEvent.setup();
    placedSymbol();
    render(<PropertiesPanel />);
    const input = screen.getByRole("spinbutton", { name: "Obrót" });
    await user.clear(input);
    await user.type(input, "45");
    const el = getEditorState().project.elements[0];
    expect(isSymbol(el) && el.rotation).toBe(45);
  });

  it("zapisuje opis symbolu", async () => {
    const user = userEvent.setup();
    placedSymbol();
    render(<PropertiesPanel />);
    await user.type(screen.getByRole("textbox", { name: "Opis" }), "przy łóżku");
    const described = getEditorState().project.elements[0];
    expect(isSymbol(described) && described.description).toBe("przy łóżku");
  });
});
