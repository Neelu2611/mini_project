import { expect, test } from "@playwright/test";
import { api, createApiClient } from "../src/lib/api";

test("desktop dashboard loads live readiness and model metadata", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Model ready", { exact: true })).toBeVisible();
  await expect(page.getByText("Balanced XGBoost", { exact: true })).toBeVisible();
  await expect(page.getByText("2,396", { exact: true })).toBeVisible();
  await page.screenshot({ path: "../screenshots/01-dashboard.png", fullPage: true });
});

test("each foundation route highlights its active navigation item", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Workspace" });
  for (const route of ["Patient Assessment", "Prediction Results", "Model Analytics", "Dataset Overview", "About the System", "Dashboard"]) {
    const link = nav.getByRole("link", { name: route, exact: true });
    await link.click();
    await expect(page.getByRole("heading", { name: route, exact: true, level: 1 })).toBeVisible({ timeout: 30_000 });
    await expect(link).toHaveAttribute("aria-current", "page");
  }
});

test("mobile and tablet layouts fit the viewport and expose navigation", async ({ page }) => {
  for (const width of [800, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(page.getByText("Model ready", { exact: true })).toBeVisible();
    await expect(page.getByText("Balanced XGBoost", { exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Workspace" })).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (width === 390) await page.screenshot({ path: "../screenshots/07-mobile-dashboard.png", fullPage: true });
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("navigation").getByRole("link", { name: "Patient Assessment" }).click();
    await expect(page.getByRole("heading", { name: "Patient Assessment", level: 1 })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Workspace" })).toBeHidden();
  }
});

test("browser reports an unreachable backend and recovers on retry", async ({ page }) => {
  await page.route("**/api/health", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByText("Backend unreachable", { exact: true })).toBeVisible();
  await page.unroute("**/api/health");
  await page.getByRole("button", { name: "Check backend connection" }).click();
  await expect(page.getByText("Model ready", { exact: true })).toBeVisible();
});

test("degraded readiness and invalid metadata render distinct states", async ({ page }) => {
  const headers = { "Access-Control-Allow-Origin": "http://localhost:3000" };
  await page.route("**/api/health", (route) => route.fulfill({
    status: 503,
    headers,
    json: { status: "degraded", model_ready: false, service_available: false },
  }));
  await page.route("**/api/model-info", (route) => route.fulfill({ headers, json: {} }));
  await page.goto("/");
  await expect(page.getByText("Model unavailable", { exact: true })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "The backend returned an unexpected response." })).toBeVisible();
});

test("verified sample and prediction work through the client and browser CORS", async ({ page }) => {
  const [features, sample] = await Promise.all([api.features(), api.samplePatient()]);
  expect(features.features).toHaveLength(47);
  expect(sample.synthetic).toBe(true);
  expect(Object.keys(sample.patient).sort()).toEqual(features.features.map((field) => field.column).sort());
  const result = await api.predict(sample.patient);
  expect(result.model_name).toBe("Balanced XGBoost");
  expect(result.probabilities.map((entry) => entry.outcome_label)).toEqual(["NO", ">30", "<30"]);
  expect(Math.abs(result.probabilities.reduce((sum, item) => sum + item.score, 0) - 1)).toBeLessThanOrEqual(1e-6);
  await expect(api.predict({ ...sample.patient, race: "invalid synthetic category" })).rejects.toMatchObject({ kind: "validation" });

  await page.goto("/");
  const actual = await page.evaluate(async (patient) => {
    const response = await fetch("http://localhost:8000/api/predict", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patient),
    });
    return { status: response.status, result: await response.json() };
  }, sample.patient);
  expect(actual.status).toBe(200);
  expect(actual.result).toEqual(result);
});

test("client separates timeout, unavailable and unexpected responses", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(null, { status: 503 });
    await expect(api.modelInfo()).rejects.toMatchObject({ kind: "unavailable" });
    globalThis.fetch = async () => Response.json({ probabilities: [] });
    await expect(api.modelInfo()).rejects.toMatchObject({ kind: "response" });
    globalThis.fetch = (_url, options) => new Promise((_resolve, reject) => {
      const signal = options?.signal;
      signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
    await expect(createApiClient({ timeoutMs: 10 }).health()).rejects.toMatchObject({ kind: "timeout" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
