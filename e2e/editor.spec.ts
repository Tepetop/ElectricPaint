import { expect, test } from "@playwright/test";

test("import, symbole, grupa, trasa, warstwy i eksport", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ElectricPaint" })).toBeVisible();
  await page.getByRole("button", { name: "Przykład" }).click();
  await expect(page.getByText("Warstwa:")).toBeVisible();

  await page.getByRole("button", { name: "Łącznik schodowy", exact: true }).click();
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
  await expect(page.locator('input[value="Warstwa 2"]')).toBeVisible();

  const downloadPng = page.waitForEvent("download");
  await page.getByRole("button", { name: "Eksport PNG" }).click();
  const png = await downloadPng;
  expect(png.suggestedFilename()).toMatch(/\.png$/);

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
  await expect(page.getByRole("tab")).toHaveCount(1);
  await page.getByRole("button", { name: "Łącznik schodowy", exact: true }).click();
  await page.evaluate(() => window.__ep?.placeAt({ x: 100, y: 100 }));
  await page.getByRole("button", { name: "Nowy", exact: true }).click();
  await expect(page.getByRole("tab")).toHaveCount(2);
  expect(await page.evaluate(() => window.__ep?.getEditorState().project.elements.length)).toBe(0);

  await page.getByRole("button", { name: "Gniazdo wtyczkowe pojedyncze", exact: true }).click();
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
