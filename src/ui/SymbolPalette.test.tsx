import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { clickScalePoint, commitElementPatch, getEditorState, placeAt, resetEditorForTests, selectIds, setPendingSymbol, setTool } from "../state/editorStore";
import { SymbolPalette } from "./SymbolPalette";

describe("SymbolPalette", () => {
  afterEach(() => {
    cleanup();
    resetEditorForTests();
  });

  it("wyszukuje i wybiera symbol", async () => {
    const user = userEvent.setup();
    render(<SymbolPalette />);
    expect(screen.getByRole("button", { name: /Żarówka/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Przycisk zwierny/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Gniazdo wtyczkowe antenowe/ })).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Szukaj symbolu…"), "schod");
    expect(screen.getByRole("button", { name: "Łącznik schodowy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Łącznik schodowy podwójny" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Gniazdo wtyczkowe/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Łącznik schodowy" }));
    expect(getEditorState().pendingSymbolKind).toBe("switch-stair");
    expect(getEditorState().tool).toBe("symbol");
  });

  it("zatwierdza długość odcinka skali w milimetrach", async () => {
    const user = userEvent.setup();
    setTool("scale");
    clickScalePoint({ x: 0, y: 0 });
    clickScalePoint({ x: 100, y: 0 });
    render(<SymbolPalette />);
    const input = screen.getByRole("spinbutton", { name: "Długość odcinka (mm)" });
    expect(input).toHaveValue(null);
    await user.clear(input);
    await user.type(input, "900");
    expect(getEditorState().project.scaleReference).toBeNull();
    await user.click(screen.getByRole("button", { name: "Zatwierdź skalę" }));
    expect(getEditorState().project.scaleReference?.lengthM).toBeCloseTo(0.9);
    expect(input).toHaveValue(900);
  });

  it("skaluje wszystkie symbole do wartości widocznej w polu", async () => {
    const user = userEvent.setup();
    setPendingSymbol("switch-single");
    placeAt({ x: 0, y: 0 });
    placeAt({ x: 40, y: 0 });
    render(<SymbolPalette />);
    const input = screen.getByRole("spinbutton", { name: "Skaluj symbol" });
    await user.clear(input);
    await user.type(input, "0.6");
    await user.click(screen.getByRole("button", { name: "Skaluj wszystkie" }));
    expect(getEditorState().project.elements.map((el) => el.type === "symbol" ? el.scale : null)).toEqual([0.6, 0.6]);
    expect(getEditorState().project.defaultSymbolScale).toBe(0.6);
  });

  it("bierze skalę zaznaczonego symbolu, gdy różni się od domyślnej", async () => {
    const user = userEvent.setup();
    setPendingSymbol("switch-single");
    placeAt({ x: 0, y: 0 });
    const firstId = getEditorState().project.elements[0].id;
    placeAt({ x: 40, y: 0 });
    commitElementPatch(firstId, { scale: 1.8 });
    render(<SymbolPalette />);
    expect(screen.getByRole("spinbutton", { name: "Skaluj symbol" })).toHaveValue(1);
    selectIds([firstId]);
    await waitFor(() => expect(screen.getByRole("spinbutton", { name: "Skaluj symbol" })).toHaveValue(1.8));
    await user.click(screen.getByRole("button", { name: "Skaluj wszystkie" }));
    expect(getEditorState().project.elements.map((el) => el.type === "symbol" ? el.scale : null)).toEqual([1.8, 1.8]);
    expect(getEditorState().project.defaultSymbolScale).toBe(1.8);
  });
});
