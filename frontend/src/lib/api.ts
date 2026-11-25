import type { Features, Health, ModelInfo, Patient, Prediction, SamplePatient } from "./api-contracts";

const classTokens = ["NO", ">30", "<30"];
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const string = (value: unknown): value is string => typeof value === "string";
const integer = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value);
const score = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(string);
const hash = (value: unknown) => string(value) && /^[a-f0-9]{64}$/i.test(value);

export class ApiError extends Error {
  constructor(
    public readonly kind: "network" | "timeout" | "unavailable" | "validation" | "inference" | "response",
    message: string,
    public readonly fields: string[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isHealth(value: unknown): value is Health {
  return object(value) && (
    (value.status === "ok" && value.model_ready === true && value.service_available === true) ||
    (value.status === "degraded" && value.model_ready === false && value.service_available === false)
  );
}

function isModelInfo(value: unknown): value is ModelInfo {
  if (!object(value) || !object(value.historical_evaluation)) return false;
  const historical = value.historical_evaluation;
  return string(value.project_name) && string(value.model_name) && hash(value.model_sha256) &&
    integer(value.input_feature_count) && integer(value.transformed_feature_count) && string(value.disclaimer) &&
    Array.isArray(value.outcome_classes) && value.outcome_classes.length === classTokens.length &&
    value.outcome_classes.every((row, index) => object(row) && row.class_id === index &&
      row.outcome_label === classTokens[index] && string(row.category)) &&
    historical.status === "recorded_not_independently_reproduced" && string(historical.source) &&
    Array.isArray(historical.cells) && historical.cells.every(integer) && integer(historical.holdout_encounters) &&
    [historical.accuracy, historical.early_readmission_precision, historical.early_readmission_recall,
      historical.early_readmission_f1].every(score);
}

function isFeatures(value: unknown): value is Features {
  return object(value) && value.status === "verified" && string(value.schema_version) &&
    string(value.source) && hash(value.artifact_sha256) && integer(value.transformed_width_reported) &&
    Array.isArray(value.target_classes) && value.target_classes.length === classTokens.length &&
    value.target_classes.every((row, index) => object(row) && row.id === index && row.token === classTokens[index]) &&
    Array.isArray(value.features) && value.features.length === 47 &&
    value.features.every((field, index) => object(field) && field.position === index + 1 &&
      string(field.column) && string(field.display_name) && string(field.section) &&
      string(field.vocabulary_status) &&
      ((field.type === "string" && strings(field.supported_categorical_values)) ||
        (field.type === "integer" && field.supported_categorical_values === null)) &&
      object(field.missing) && (field.missing.token === null || string(field.missing.token)) &&
      string(field.missing.action) &&
      ["reject_null", "replace_null", "preserve_literal_marker"].includes(field.missing.action) &&
      object(field.validation) && string(field.validation.rule) && field.validation.required === true &&
      typeof field.validation.nullable === "boolean" &&
      (field.reference_codes === undefined ||
        (object(field.reference_codes) && Object.values(field.reference_codes).every(string))) &&
      (field.reference_code_source === undefined || string(field.reference_code_source))) &&
    new Set(value.features.map((field) => field.column)).size === 47;
}

function isSamplePatient(value: unknown): value is SamplePatient {
  return object(value) && value.synthetic === true && string(value.fixture) && object(value.patient) &&
    Object.keys(value.patient).length === 47 &&
    Object.entries(value.patient).every(([key, entry]) =>
      string(entry) || integer(entry) || (entry === null && ["max_glu_serum", "A1Cresult"].includes(key)));
}

function isPrediction(value: unknown): value is Prediction {
  return object(value) && integer(value.predicted_class) && classTokens[value.predicted_class] !== undefined &&
    value.outcome_label === classTokens[value.predicted_class] &&
    string(value.category) && string(value.model_name) && string(value.disclaimer) &&
    Array.isArray(value.probabilities) && value.probabilities.length === classTokens.length &&
    value.probabilities.every((row, index) => object(row) && row.class_id === index &&
      row.outcome_label === classTokens[index] && score(row.score)) &&
    Math.abs(value.probabilities.reduce((sum, row) => sum + row.score, 0) - 1) <= 1e-6;
}

export function createApiClient({
  baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
  timeoutMs = 8000,
} = {}) {
  async function request<T>(
    endpoint: string,
    verify: (value: unknown) => value is T,
    options: RequestInit = {},
    acceptDegraded = false,
  ): Promise<T> {
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
    try {
      const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/${endpoint}`, {
        ...options,
        cache: "no-store",
        signal,
      });
      const body: unknown = await response.json().catch((error: unknown) => {
        if (signal.aborted) throw error;
        return undefined;
      });
      if (response.status === 503) {
        if (acceptDegraded && isHealth(body) && body.status === "degraded" && verify(body)) return body;
        throw new ApiError("unavailable", "The prediction service is unavailable.");
      }
      if (response.status === 400 || response.status === 422) {
        const details = object(body) && object(body.error) ? body.error : undefined;
        throw new ApiError("validation", "The backend rejected the submitted fields.",
          details && strings(details.fields) ? details.fields : []);
      }
      if (response.status === 500 && endpoint === "predict") {
        throw new ApiError("inference", "The backend could not complete the prediction.");
      }
      if (!response.ok || !verify(body)) {
        throw new ApiError("response", "The backend returned an unexpected response.");
      }
      return body;
    } catch (error) {
      if (options.signal?.aborted || error instanceof ApiError) throw error;
      if (timeout.aborted) throw new ApiError("timeout", "The backend did not respond in time.");
      throw new ApiError("network", "Could not connect to the backend.");
    }
  }
  return {
    health: (signal?: AbortSignal) => request("health", isHealth, { signal }, true),
    modelInfo: (signal?: AbortSignal) => request("model-info", isModelInfo, { signal }),
    features: (signal?: AbortSignal) => request("features", isFeatures, { signal }),
    samplePatient: (signal?: AbortSignal) => request("sample-patient", isSamplePatient, { signal }),
    predictDiabetes: (answers: Record<string, unknown>, signal?: AbortSignal) => request("diabetes/predict", isPrediction, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(answers), signal,
    }),
    predict: (patient: Patient, signal?: AbortSignal) => request("predict", isPrediction, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patient), signal,
    }),
  };
}

export const api = createApiClient();
