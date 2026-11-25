import { expect, test } from "@playwright/test";
import { api } from "../src/lib/api";
import { buildPatientPayload, optionsFor, validateAnswers } from "../src/lib/assessment";
import { questionFor, questions, sections, type FeatureKey } from "../src/lib/assessment-questions";

test("all 47 questions and options match their verified wire fields", async () => {
  const [schema, sample] = await Promise.all([api.features(), api.samplePatient()]);
  expect(Object.keys(questions).sort()).toEqual(schema.features.map((field) => field.column).sort());
  expect(new Set(Object.values(questions).map((item) => item.question)).size).toBe(47);
  for (const field of schema.features) {
    const key = field.column as FeatureKey;
    expect(sections.map((section) => section.id)).toContain(questionFor(key).section);
    expect(validateAnswers([field], {})).toHaveProperty(key);
    const expected = field.reference_codes
      ? Object.keys(field.reference_codes).map(Number)
      : field.supported_categorical_values ?? [];
    const options = optionsFor(field);
    expect(options.map((option) => option.value)).toEqual(expected);
    expect(new Set(options.map((option) => option.label)).size).toBe(options.length);
    if (questionFor(key).control === "diagnosis") {
      expect(options.some((option) => option.label.startsWith("Recorded ICD-9-CM code"))).toBe(false);
    }
    for (const value of expected) expect(validateAnswers([field], { [key]: value })).toEqual({});
    expect(Object.keys(validateAnswers([field], { [key]: null })).length).toBe(field.validation.nullable ? 0 : 1);
  }
  const payload = buildPatientPayload(schema, sample.patient);
  expect(Object.keys(payload)).toEqual(schema.features.map((field) => field.column));
  expect(payload).toEqual(sample.patient);
  const prediction = await api.predict(payload);
  expect(prediction.model_name).toBe("Balanced XGBoost");
  expect(prediction.probabilities.map((row) => row.outcome_label)).toEqual(["NO", ">30", "<30"]);
});

test("payload builder rejects unsupported values and preserves explicit missing markers", async () => {
  const [schema, sample] = await Promise.all([api.features(), api.samplePatient()]);
  const data = sample.patient;
  for (const difference of [
    { time_in_hospital: -1 }, { num_medications: "1.2" }, { num_procedures: "9007199254740992" },
    { discharge_disposition_id: 999 }, { examide: "Steady" }, { gender: null }, { age: "?" },
  ]) {
    expect(() => buildPatientPayload(schema, { ...data, ...difference })).toThrow();
  }
  const payload = buildPatientPayload(schema, { ...data, num_procedures: "0", diag_3: "?", A1Cresult: null });
  expect(payload.num_procedures).toBe(0);
  expect(payload.diag_3).toBe("?");
  expect(payload.A1Cresult).toBeNull();
});

test("staff can validate, load the demo, review all steps, confirm and reset", async ({ page }) => {
  const predictionCalls: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/predict")) predictionCalls.push(request.url());
  });
  await page.goto("/assessment");
  await expect(page.getByRole("heading", { name: "Patient demographics", exact: true })).toBeVisible();
  await page.screenshot({ path: "../screenshots/02-patient-assessment.png", fullPage: true });
  const next = page.getByRole("button", { name: "Next", exact: true });
  await next.click();
  await expect(page.getByText("Review the highlighted answers before continuing.")).toBeVisible();
  await expect(page.locator("#field-race")).toBeFocused();

  await page.getByRole("button", { name: "Load Demo Patient" }).click();
  await expect(page.getByText("47 of 47 answered")).toBeVisible();
  await expect(page.getByText(/Synthetic demo loaded/)).toBeVisible();
  for (const section of sections) {
    await expect(page.getByRole("heading", { name: section.title, exact: true })).toBeVisible();
    for (const [key, question] of Object.entries(questions)) {
      if (question.section !== section.id) continue;
      await expect(page.locator(`#field-${key}`)).toBeVisible();
      await expect(page.getByText(question.question, { exact: true })).toBeVisible();
    }
    if (section.id === "encounter") {
      await expect(page.locator("#field-admission_source_id option:checked")).toHaveText("Emergency Room");
      const days = page.locator("#field-time_in_hospital");
      await days.fill("-1");
      await next.click();
      await expect(days).toHaveAttribute("aria-invalid", "true");
      await days.fill("3");
    }
    if (section.id === "diagnoses") {
      await expect(page.locator("#field-diag_1 option").nth(1)).toHaveText("Not recorded");
      await page.getByRole("searchbox").first().fill("Heart failure");
      await expect(page.locator("#field-diag_1 option").filter({ hasText: /^Heart failure \(428\)$/ })).toHaveCount(1);
      await page.locator("#field-diag_1").selectOption("428");
    }
    await next.click();
  }
  await expect(page.getByRole("heading", { name: "Final review and confirmation" })).toBeVisible();
  await expect(page.locator(".review-groups dt")).toHaveCount(47);
  await expect(page.locator(".review-groups dd").filter({ hasText: "Heart failure (428)" })).toHaveCount(1);
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await expect(page.getByRole("heading", { name: sections[5].title })).toBeVisible();
  await next.click();
  const predict = page.getByRole("button", { name: "Predict Readmission" });
  await expect(predict).toBeDisabled();
  await page.getByRole("checkbox", { name: /I reviewed the answers/ }).check();
  await expect(predict).toBeEnabled();
  expect(predictionCalls).toEqual([]);

  await page.getByRole("button", { name: "Reset Form" }).click();
  await expect(page.getByText("0 of 47 answered")).toBeVisible();
  await expect(page.locator("#field-race")).toHaveValue("");
  await expect(page.getByText(/Synthetic demo loaded/)).toHaveCount(0);
});

test("staff assessment fits a narrow mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/assessment");
  await expect(page.getByRole("heading", { name: sections[0].title })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.getByText("Step 1 of 7")).toBeVisible();
  await expect(page.getByRole("button", { name: "Load Demo Patient" })).toBeVisible();
});
