import type { Features, Patient } from "./api-contracts";
import { questions, type FeatureKey } from "./assessment-questions";
import diagnosisTitles from "./diagnosis-titles.json";

export type Feature = Features["features"][number];
export type Answer = string | number | null;
export type Answers = Partial<Record<FeatureKey, Answer>>;
export type FieldErrors = Partial<Record<FeatureKey, string>>;

const medicationLabels: Record<string, string> = {
  No: "Not prescribed",
  Steady: "Prescribed, dose unchanged",
  Up: "Prescribed, dose increased",
  Down: "Prescribed, dose decreased",
};

const categoryLabels: Partial<Record<FeatureKey, Record<string, string>>> = {
  race: { AfricanAmerican: "African American", Caucasian: "White (recorded as Caucasian)" },
  gender: { "Unknown/Invalid": "Unknown or invalid in record" },
  change: { Ch: "Yes, a change was recorded", No: "No change recorded" },
  max_glu_serum: { ">200": "Above 200 mg/dL (recorded category)", ">300": "Above 300 mg/dL (recorded category)", Norm: "Recorded as normal" },
  A1Cresult: { ">7": "Above 7% (recorded category)", ">8": "Above 8% (recorded category)", Norm: "Recorded as normal" },
};

const diagnoses: Readonly<Partial<Record<string, string>>> = diagnosisTitles;

export function checkAssessmentSchema(schema: Features) {
  if (schema.features.length !== Object.keys(questions).length ||
      schema.features.some((field) => !Object.hasOwn(questions, field.column))) {
    throw new Error("The feature schema does not match this assessment form.");
  }
  return schema;
}

export function formatAnswer(field: Feature, value: Answer): string {
  const key = field.column as FeatureKey;
  if (value === null) return "Not measured";
  if (typeof value === "number") {
    const description = field.reference_codes?.[value];
    if (!description) return String(value);
    if (description === "NULL") return "Recorded as unspecified";
    const duplicate = Object.values(field.reference_codes ?? {}).filter((label) => label === description).length > 1;
    const suffix = duplicate ? ` (recorded code ${value})` : "";
    return description.replace(/\bSNF\b/g, "skilled nursing facility")
      .replace(/\bICF\b/g, "intermediate care facility")
      .replace(/\bAMA\b/g, "against medical advice")
      .replace(/\bHMO\b/g, "health maintenance organization")
      .replace(/\bExpired\b/g, "Died") + suffix;
  }
  if (value === "?") return "Not recorded";
  const question = questions[key];
  if (question.control === "diagnosis") {
    return diagnoses[value] ? `${diagnoses[value]} (${value})` : `Recorded ICD-9-CM code ${value}`;
  }
  if (question.control === "medication") return medicationLabels[value] ?? value;
  if (key === "age" || key === "weight") {
    const band = /^\[(\d+)-(\d+)\)$/.exec(value);
    const unit = key === "age" ? "years" : "lb";
    if (band) return `${band[1]} to under ${band[2]} ${unit}`;
    if (value === ">200") return "More than 200 lb";
  }
  if (key === "medical_specialty") return value.replace(/([a-z])([A-Z])/g, "$1 $2");
  return categoryLabels[key]?.[value] ?? value;
}

export function optionsFor(field: Feature) {
  const values = field.reference_codes ? Object.keys(field.reference_codes).map(Number) : field.supported_categorical_values ?? [];
  return values.map((value) => ({ value, label: formatAnswer(field, value) }));
}

function typedAnswer(field: Feature, answer: Answer | undefined): Answer | undefined {
  if (answer === undefined || answer === "") return undefined;
  if (answer === null) return field.validation.nullable ? null : undefined;
  if (field.type === "integer") {
    const value = typeof answer === "string" && /^\d+$/.test(answer) ? Number(answer) : answer;
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) return undefined;
    return !field.reference_codes || Object.hasOwn(field.reference_codes, value) ? value : undefined;
  }
  return typeof answer === "string" && field.supported_categorical_values?.includes(answer) ? answer : undefined;
}

export function validateAnswers(fields: readonly Feature[], answers: Answers): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of fields) {
    const key = field.column as FeatureKey;
    if (typedAnswer(field, answers[key]) !== undefined) continue;
    if (answers[key] === undefined || answers[key] === "") {
      errors[key] = "An answer is required. Check the record if you are unsure.";
    } else {
      errors[key] = field.type === "integer" && !field.reference_codes
        ? "Enter a whole number of zero or more within the supported range."
        : "Choose a supported answer from the available options.";
    }
  }
  return errors;
}

export function buildPatientPayload(schema: Features, answers: Answers): Patient {
  checkAssessmentSchema(schema);
  const pairs = schema.features.map((field) => {
    const answer = typedAnswer(field, answers[field.column as FeatureKey]);
    if (answer === undefined) throw new Error("Complete all required answers before continuing.");
    return [field.column, answer] as const;
  });
  return Object.fromEntries(pairs) as Patient;
}
