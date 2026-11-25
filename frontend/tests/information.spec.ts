import { expect, test } from "@playwright/test";
import { api } from "../src/lib/api";
import evidence from "../src/lib/notebook-evaluation.json";

test("analytics, dataset and about pages preserve provenance and support keyboard and mobile use", async ({ page }) => {
  const model = await api.modelInfo();
  await page.goto("/analytics");
  await expect(page.getByRole("heading", { name: "Model Analytics", exact: true })).toBeVisible();
  await expect(page.getByText(/historical evaluation has not been independently reproduced/i).first()).toBeVisible();
  await expect(page.getByText(/ROC-AUC was not recorded/)).toBeVisible();
  const accuracy = `${(model.historical_evaluation.accuracy * 100).toFixed(2)}%`;
  await expect(page.getByRole("region", { name: /Selected model/ }).getByText(accuracy)).toBeVisible();
  const matrix = page.getByRole("region", { name: "Confusion matrix table" });
  const matrixValues = (await matrix.locator("tbody td").allTextContents()).map((value) => Number(value.replaceAll(",", "")));
  expect(matrixValues).toEqual(evidence.matrix.flat());
  expect(matrixValues.reduce((total, item) => total + item, 0)).toBe(model.historical_evaluation.holdout_encounters);
  await expect(page.getByRole("region", { name: "Model comparison table" }).locator("tbody tr")).toHaveCount(11);
  await expect(page.getByTestId("historical-comparison-chart").locator(".recharts-wrapper > svg.recharts-surface")).toBeVisible();
  await page.screenshot({ path: "../screenshots/04-model-analytics.png", fullPage: true });

  await page.goto("/dataset");
  await expect(page.getByRole("heading", { name: "Dataset Overview", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Supplied workbook and working CSV" }).getByText("1,879", { exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "Supplied dataset column names" }).locator("li")).toHaveCount(46);
  await expect(page.getByText(/no model accuracy was calculated from it/)).toBeVisible();
  await page.screenshot({ path: "../screenshots/05-dataset-overview.png", fullPage: true });

  await page.goto("/about");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await skip.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
  await expect(page.getByRole("heading", { name: "System architecture" })).toBeVisible();
  await expect(page.locator(".architecture-flow li")).toHaveCount(4);
  await expect(page.getByText(/clinical use has not been validated/)).toBeVisible();
  await page.screenshot({ path: "../screenshots/06-about-system.png", fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/analytics", "/dataset", "/about"]) {
    await page.goto(path);
    await expect(page.locator("#main h1")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  }
});
