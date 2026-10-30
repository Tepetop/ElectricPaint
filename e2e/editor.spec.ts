import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

test("import, symbole, grupa, trasa, warstwy i eksport", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ElectricPaint" })).toBeVisible();
  await page.getByRole("button", { name: "Przykład" }).click();
  await expect(page.getByText("Warstwa:")).toBeVisible();
  expect(await page.evaluate(() => {
    const project = window.__ep!.getEditorState().project;
    const names = new Map(project.layers.map((layer) => [layer.id, layer.name]));
    return {
      layers: project.layers.map((layer) => layer.name),
      assignments: project.elements.map((element) => names.get(element.layerId)),
    };
  })).toEqual({
    layers: ["Gniazda", "Wypusty", "Oświetlenie", "Łączniki", "Przewody", "Inne"],
    assignments: ["Łączniki", "Oświetlenie", "Gniazda", "Przewody"],
  });

  await page.getByRole("button", { name: "Łącznik schodowy IP20", exact: true }).click();
  await page.evaluate(() => {
    window.__ep?.placeAt({ x: 520, y: 220 });
    const created = window.__ep?.getEditorState().project.elements.at(-1);
    if (created) window.__ep?.selectIds([created.id]);
  });
  await expect(page.getByText("Oznaczenie").first()).toBeVisible();

  await page.getByRole("button", { name: "Nowa grupa" }).click();
  await page.getByRole("button", { name: "Dodaj zaznaczone" }).first().click();
  await expect(page.getByText(/Łączniki:.*L2/)).toBeVisible();

  await page.getByRole("button", { name: "Przewód" }).click();
  await page.evaluate(() => {
    window.__ep?.setTool("cable");
    window.__ep?.placeAt({ x: 200, y: 780 });
    window.__ep?.placeAt({ x: 480, y: 780 });
    window.__ep?.finishCable();
  });
  await expect(page.getByText("Legenda tras")).toBeVisible();

  await page.getByRole("button", { name: "Dodaj", exact: true }).click();
  await expect(page.locator('input[value="Warstwa 7"]')).toBeVisible();

  await expect(page.getByRole("button", { name: "Eksport PNG" })).toHaveCount(0);

  const downloadProject = page.waitForEvent("download");
  await page.getByRole("button", { name: "Zapisz", exact: true }).click();
  const projectFile = await downloadProject;
  const path = await projectFile.path();
  expect(projectFile.suggestedFilename()).toMatch(/\.epaint$/);

  await page.getByRole("button", { name: "Nowy", exact: true }).click();
  await page.getByTestId("open-project").setInputFiles(path);
  await expect(page.getByText("Oświetlenie salon")).toBeVisible();
});

test("zakładki, ponowne numerowanie grup i dopasowanie widoku", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("tab")).toHaveCount(0);
  await page.getByRole("button", { name: "Nowy projekt" }).click();
  await expect(page.getByRole("tab")).toHaveCount(1);
  await page.getByRole("button", { name: "Łącznik schodowy IP20", exact: true }).click();
  await page.evaluate(() => window.__ep?.placeAt({ x: 100, y: 100 }));
  await page.getByRole("button", { name: "Nowy", exact: true }).click();
  await expect(page.getByRole("tab")).toHaveCount(2);
  expect(await page.evaluate(() => window.__ep?.getEditorState().project.elements.length)).toBe(0);

  await page.getByRole("button", { name: "Gniazdo wtykowe IP20", exact: true }).click();
  await page.evaluate(() => window.__ep?.placeAt({ x: 200, y: 200 }));
  await page.getByRole("tab", { name: /Nowy rzut 1/ }).click();
  expect(await page.evaluate(() => {
    const element = window.__ep?.getEditorState().project.elements[0];
    return element?.type === "symbol" ? element.kind : null;
  })).toBe("switch-stair");

  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Nowa grupa" }).click();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Usuń grupę" }).first().click();
  await page.getByRole("button", { name: "Nowa grupa" }).click();
  await expect(page.locator(".group-item input").first()).toHaveValue("S1");

  await page.getByRole("tab", { name: /Nowy rzut 2/ }).click();
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.getByRole("button", { name: "Dopasuj" }).click();
  const fit = await page.evaluate(() => {
    const host = document.querySelector<HTMLElement>(".canvas-wrap")!;
    const state = window.__ep!.getEditorState();
    return { actual: state.zoom, expected: Math.min(host.clientWidth / state.project.canvas.width, host.clientHeight / state.project.canvas.height) * 0.96 };
  });
  expect(fit.actual).toBeCloseTo(fit.expected, 4);
});

test("wybór wielu symboli i wspólna zmiana warstwy", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Nowy projekt" }).click();
  await expect(page.locator(".stage-host canvas")).toBeVisible();
  await page.evaluate(() => {
    window.__ep!.setPendingSymbol("switch-single");
    window.__ep!.placeAt({ x: 100, y: 100 });
    window.__ep!.placeAt({ x: 240, y: 100 });
  });
  await page.getByRole("button", { name: "Wybór wielu" }).click();
  await expect(page.getByRole("button", { name: "Wybór wielu" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Wyczyść zaznaczenie (1)" }).click();

  async function clickSymbol(x: number) {
    const canvas = await page.locator(".stage-host canvas").first().boundingBox();
    if (!canvas) throw new Error("Brak płótna");
    const { zoom, pan } = await page.evaluate(() => window.__ep!.getEditorState());
    await page.mouse.click(canvas.x + pan.x + (x + 24) * zoom, canvas.y + pan.y + 124 * zoom);
  }

  await clickSymbol(100);
  await clickSymbol(240);
  await expect(page.getByText("Zaznaczono 2 elementów.")).toBeVisible();
  await clickSymbol(100);
  expect(await page.evaluate(() => window.__ep!.getEditorState().selectedIds.length)).toBe(1);
  await clickSymbol(100);
  await page.getByRole("combobox", { name: "Warstwa" }).selectOption({ label: "Gniazda" });
  expect(await page.evaluate(() => {
    const project = window.__ep!.getEditorState().project;
    const target = project.layers.find((layer) => layer.name === "Gniazda")?.id;
    return project.elements.map((element) => element.layerId === target);
  })).toEqual([true, true]);
  await page.getByRole("button", { name: "Cofnij" }).click();
  expect(await page.evaluate(() => {
    const project = window.__ep!.getEditorState().project;
    const original = project.layers.find((layer) => layer.name === "Łączniki")?.id;
    return project.elements.every((element) => element.layerId === original);
  })).toBe(true);
});

test("eksport PDF zachowuje polskie znaki i dzieli tabelę symboli na strony", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Przykład" }).click();
  await page.getByRole("button", { name: "Gniazdo wtykowe podwójne IP20", exact: true }).click();
  await page.evaluate(() => {
    for (let index = 0; index < 40; index++) {
      window.__ep!.placeAt({ x: 100 + (index % 10) * 80, y: 100 + Math.floor(index / 10) * 70 });
    }
    window.__ep!.selectIds([window.__ep!.getEditorState().project.elements.at(-1)!.id]);
  });
  await page.getByRole("textbox", { name: "Opis" }).fill("Żółć, łącznik i oświetlenie przy wejściu do kuchni oraz salonu.");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Eksport PDF" }).click();
  const download = await downloadPromise;
  const pdf = await getDocument({ data: new Uint8Array(await readFile(await download.path()!)) }).promise;
  expect(pdf.numPages).toBeGreaterThanOrEqual(4);

  const symbolTexts: string[] = [];
  const cableTexts: string[] = [];
  for (let number = 2; number <= pdf.numPages; number++) {
    const text = await (await pdf.getPage(number)).getTextContent();
    const pageText = text.items.map((item) => "str" in item ? item.str : "").join(" ");
    expect(pageText.includes("Lista symboli") || pageText.includes("Lista przewodów")).toBe(true);
    if (pageText.includes("Lista symboli")) {
      expect(pageText).toContain("Oznaczenie");
      symbolTexts.push(pageText);
    } else {
      cableTexts.push(pageText);
    }
  }
  expect(symbolTexts.join(" ")).toContain("Łącznik jednobiegunowy");
  expect(symbolTexts.join(" ")).toContain("Żółć, łącznik i oświetlenie");
  expect(symbolTexts.at(-1)).toContain("G41");
  expect(cableTexts.length).toBeGreaterThan(0);
  expect(cableTexts.join(" ")).toContain("Oświetlenie salon");
});

test("ekran startowy nie ma zakładek", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Nowy projekt" })).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(0);
});

test("Esc czyści zaznaczenie", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Nowy projekt" }).click();
  await expect(page.locator(".stage-host canvas")).toBeVisible();
  await page.evaluate(() => {
    window.__ep!.setPendingSymbol("switch-single");
    window.__ep!.placeAt({ x: 100, y: 100 });
  });
  expect(await page.evaluate(() => window.__ep!.getEditorState().selectedIds.length)).toBe(1);
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => window.__ep!.getEditorState().selectedIds)).toEqual([]);
});

test("przeciągnięcie etykiety zostawia pobliski offset", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Nowy projekt" }).click();
  await expect(page.locator(".stage-host canvas")).toBeVisible();
  await page.evaluate(() => {
    window.__ep!.setPendingSymbol("switch-single");
    window.__ep!.placeAt({ x: 100, y: 100 });
    window.__ep!.setTool("select");
  });
  const canvas = await page.locator(".stage-host canvas").first().boundingBox();
  if (!canvas) throw new Error("Brak płótna");
  const { zoom, pan } = await page.evaluate(() => window.__ep!.getEditorState());
  const startX = canvas.x + pan.x + 160 * zoom;
  const startY = canvas.y + pan.y + 120 * zoom;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 12, startY + 6, { steps: 5 });
  await page.mouse.up();
  const offset = await page.evaluate(() => {
    const element = window.__ep!.getEditorState().project.elements[0];
    return element?.type === "symbol" ? element.labelOffset ?? null : null;
  });
  expect(offset).not.toBeNull();
  expect(Number.isInteger(offset!.x)).toBe(true);
  expect(Number.isInteger(offset!.y)).toBe(true);
  expect(Math.abs(offset!.x) + Math.abs(offset!.y)).toBeGreaterThan(0);
  expect(offset!.x).toBeGreaterThanOrEqual(4);
  expect(offset!.x).toBeLessThanOrEqual(24);
  expect(Math.abs(offset!.y)).toBeLessThanOrEqual(16);
});
