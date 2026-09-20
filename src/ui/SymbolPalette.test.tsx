import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { getEditorState, resetEditorForTests } from "../state/editorStore";
import { SymbolPalette } from "./SymbolPalette";

describe("SymbolPalette", () => {
  afterEach(() => resetEditorForTests());

  it("wyszukuje i wybiera symbol", async () => {
    const user = userEvent.setup();
    render(<SymbolPalette />);
    expect(screen.getByRole("button", { name: /Żarówka/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Przycisk łączeniowy/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Gniazdo wtyczkowe antenowe/ })).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Szukaj symbolu…"), "schod");
    expect(screen.getByRole("button", { name: /Łącznik schodowy/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Gniazdo wtyczkowe/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Łącznik schodowy/ }));
    expect(getEditorState().pendingSymbolKind).toBe("switch-stair");
    expect(getEditorState().tool).toBe("symbol");
  });
});
