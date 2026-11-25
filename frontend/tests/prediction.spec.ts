import { expect, test, type Page } from "@playwright/test";
import { api } from "../src/lib/api";

const cors = { "Access-Control-Allow-Origin": "http://localhost:3000" };
const predictionRoute = "**/api/predict";

async function reviewDemo(page: Page) {
  await page.goto("/assessment");
  await page.getByRole("button", { name: "Load Demo Patient" }).click();
  await expect(page.getByText("47 of 47 answered")).toBeVisible();
  for (let index = 0; index < 6; index++) {
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "Final review and confirmation" })).toBeVisible();
  await page.getByRole("checkbox", { name: /I reviewed the answers/ }).check();
}

test("real synthetic prediction matches direct API scores and new assessment clears the session", async ({ page }) => {
  const sample = await api.samplePatient();
  const direct = await api.predict(sample.patient);
  await page.goto("/assessment");
  const storage = () => page.evaluate(() => ({
    local: Object.entries(localStorage), session: Object.entries(sessionStorage),
  }));
  const baseline = await storage();
  await reviewDemo(page);

  const outgoing = page.waitForRequest((request) =>
    request.url().endsWith("/api/predict") && request.method() === "POST");
  await page.getByRole("button", { name: "Predict Readmission", exact: true }).click();
  expect((await outgoing).postDataJSON()).toEqual(sample.patient);
  await expect(page).toHaveURL("http://localhost:3000/results");
  await expect(page.getByText("Synthetic demonstration result")).toBeVisible();
  await expect(page.getByRole("heading", { name: direct.category })).toBeVisible();
  await expect(page.getByText(`Predicted class ${direct.predicted_class} · ${direct.outcome_label}`)).toBeVisible();
  await expect(page.getByText(direct.model_name, { exact: false })).toBeVisible();
  await expect(page.getByText(direct.disclaimer, { exact: true })).toBeVisible();
  await expect(page.locator(".result-scores dt")).toHaveText([
    "No recorded readmission NO",
    "Readmission after 30 days >30",
    "Readmission within 30 days <30",
  ]);
  const scores = (await page.locator(".result-scores dd").allTextContents()).map(Number);
  expect(scores).toHaveLength(3);
  for (const [index, score] of scores.entries()) {
    expect(Math.abs(score - direct.probabilities[index].score)).toBeLessThanOrEqual(1e-6);
  }
  for (const chart of ["score-donut", "score-bars"]) {
    await expect(page.getByTestId(chart).locator("svg.recharts-surface")).toBeVisible();
  }
  expect(await storage()).toEqual(baseline);
  await page.screenshot({ path: "../screenshots/03-prediction-results.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "../screenshots/08-mobile-results.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("button", { name: "Print summary" })).toBeHidden();
  await expect(page.locator(".result-scores dd")).toHaveCount(3);
  await expect(page.getByText(direct.disclaimer, { exact: true })).toBeVisible();
  await page.emulateMedia({ media: "screen" });
  console.log("Live synthetic result:", direct.predicted_class, direct.outcome_label, direct.probabilities.map((entry) => entry.score));

  await page.getByRole("link", { name: "Return to assessment" }).click();
  await expect(page.getByText("47 of 47 answered")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Final review and confirmation" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /I reviewed the answers/ })).not.toBeChecked();
  await page.getByRole("navigation", { name: "Workspace" }).getByRole("link", { name: "Prediction Results" }).click();
  await page.getByRole("button", { name: "Start new assessment" }).click();
  await expect(page.getByText("0 of 47 answered")).toBeVisible();
  await expect(page.getByText(/Synthetic demo loaded/)).toHaveCount(0);
  await page.getByRole("navigation", { name: "Workspace" }).getByRole("link", { name: "Prediction Results" }).click();
  await expect(page.getByRole("heading", { name: "No prediction to display" })).toBeVisible();
});

test("server and network failures retain the reviewed inputs and allow a successful retry", async ({ page }) => {
  await reviewDemo(page);
  const cases = [
    { status: 503, message: /The prediction model is unavailable/ },
    { status: 422, message: /The backend rejected these answers.*How many days was the patient in hospital/ },
    { status: 500, message: /The backend could not complete the prediction/ },
    { status: 200, message: /The backend returned an invalid prediction response/ },
    { status: null, message: /Could not reach the backend/ },
  ];
  for (const [index, scenario] of cases.entries()) {
    await page.route(predictionRoute, (route) => scenario.status === null ? route.abort() : route.fulfill({
      status: scenario.status,
      headers: cors,
      json: { error: { fields: ["time_in_hospital"], message: "private input placeholder" } },
    }));
    await page.getByRole("button", { name: index === 0 ? "Predict Readmission" : "Retry Prediction", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: scenario.message })).toBeVisible();
    await expect(page.getByText("private input placeholder")).toHaveCount(0);
    await expect(page.getByText("47 of 47 answered")).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /I reviewed the answers/ })).toBeChecked();
    await expect(page.locator(".review-groups dd")).toHaveCount(47);
    await page.unroute(predictionRoute);
  }
  await page.getByRole("button", { name: "Retry Prediction" }).click();
  await expect(page.getByText("Synthetic demonstration result")).toBeVisible();
});

test("an in-flight prediction blocks duplicate submissions, times out and can be retried", async ({ page }) => {
  await reviewDemo(page);
  let calls = 0;
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  await page.route(predictionRoute, async (route) => {
    calls++;
    await blocked;
    await route.abort().catch(() => undefined);
  });

  try {
    await page.getByRole("button", { name: "Predict Readmission", exact: true }).click();
    await expect(page.getByRole("button", { name: "Predicting…" })).toBeDisabled();
    await expect(page.getByText("Running prediction…")).toBeVisible();
    await page.locator(".assessment-card").dispatchEvent("submit", { bubbles: true, cancelable: true });
    await expect(page.getByRole("alert").filter({ hasText: "Prediction timed out." })).toBeVisible({ timeout: 15_000 });
    expect(calls).toBe(1);
    await expect(page.getByText("47 of 47 answered")).toBeVisible();
  } finally {
    release();
    await page.unroute(predictionRoute);
  }
  await page.getByRole("button", { name: "Retry Prediction" }).click();
  await expect(page.getByText("Synthetic demonstration result")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "No prediction to display" })).toBeVisible();
  await page.getByRole("link", { name: "Go to assessment" }).click();
  await expect(page.getByText("0 of 47 answered")).toBeVisible();
});

test("opening results directly shows an empty state", async ({ page }) => {
  await page.goto("/results");
  await expect(page.getByRole("heading", { name: "No prediction to display" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to assessment" })).toHaveAttribute("href", "/assessment");
});
