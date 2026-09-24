import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { clickScalePoint, getEditorState, resetEditorForTests, setTool } from "../state/editorStore";
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

  it("zapisuje długość odcinka skali w milimetrach", async () => {
    const user = userEvent.setup();
    setTool("scale");
    clickScalePoint({ x: 0, y: 0 });
    clickScalePoint({ x: 100, y: 0 });
    render(<SymbolPalette />);
    const input = screen.getByRole("spinbutton", { name: "Długość odcinka (mm)" });
    expect(input).toHaveValue(1000);
    await user.clear(input);
    await user.type(input, "900");
    expect(getEditorState().project.scaleReference?.lengthM).toBeCloseTo(0.9);
    expect(input).toHaveValue(900);
  });
});
