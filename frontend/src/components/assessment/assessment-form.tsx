"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AssessmentField } from "./assessment-field";
import { useAssessmentSession } from "./assessment-session";
import { useFeatures } from "@/hooks/use-backend";
import { api, ApiError } from "@/lib/api";
import type { Features } from "@/lib/api-contracts";
import {
  checkAssessmentSchema, validateAnswers,
  type Answer, type FieldErrors,
} from "@/lib/assessment";
import { questionFor, questions, type FeatureKey } from "@/lib/assessment-questions";

import evaluation from "@/lib/diabetes-short-v1.json";
const shortKeys = evaluation.fields as FeatureKey[];
function predictionErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return "Prediction could not be completed. Please try again.";
  switch (error.kind) {
    case "validation": {
      const labels = error.fields.filter((field) => Object.hasOwn(questions, field))
        .map((field) => questionFor(field as FeatureKey).question);
      return labels.length
        ? `The backend rejected these answers. Review and edit the affected questions before retrying. ${labels.join(" ")}`
        : "The backend rejected the assessment. Review the answers before retrying.";
    }
    case "timeout": return "Prediction timed out. Your answers are still here. Please try again.";
    case "unavailable": return "The prediction model is unavailable. Check backend readiness and retry.";
    case "network": return "Could not reach the backend. Check the connection and retry.";
    case "inference": return "The backend could not complete the prediction. Please try again.";
    case "response": return "The backend returned an invalid prediction response. Please try again.";
  }
}

export function AssessmentForm() {
  const { state, refresh } = useFeatures();
  if (state.status === "loading") return <p className="panel notice" role="status">Loading the verified assessment questions…</p>;
  if (state.status === "error") return (
    <div className="panel notice"><p role="alert">{state.message}</p><button type="button" className="secondary-button" onClick={refresh}>Retry loading questions</button></div>
  );
  try {
    checkAssessmentSchema(state.data);
  } catch {
    return <p className="panel notice" role="alert">The backend schema does not match this form. Contact the project administrator.</p>;
  }
  return <AssessmentWizard schema={state.data} />;
}

function AssessmentWizard({ schema }: { schema: Features }) {
  const router = useRouter();
  const { draft: { answers }, setDraft, setResult, clearAssessment } = useAssessmentSession();
  const fields = shortKeys.map(key => schema.features.find(field => field.column === key)!);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  function update(key: FeatureKey, value: Answer | undefined) {
    setDraft(old => ({ ...old, answers: { ...old.answers, [key]: value } }));
    setResult(null);
    setErrors(old => ({ ...old, [key]: undefined }));
    setMessage("");
  }

  async function predict() {
    if (request.current) return;
    const invalid = validateAnswers(fields, answers);
    for (const field of fields) {
      const key = field.column as FeatureKey;
      const bounds = (evaluation.bounds as Record<string, number[]>)[key];
      const value = Number(answers[key]);
      if (bounds && (value < bounds[0] || value > bounds[1])) invalid[key] = "Enter a value between " + bounds.join(" and ") + ".";
      const allowed = (evaluation.allowed as Record<string, (string | number)[]>)[key];
      if (allowed && !allowed.some(option => String(option) === String(answers[key]))) invalid[key] = "Select a value represented in the training data.";
    }
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setMessage("");
    try {
      const patient = Object.fromEntries(fields.map(field => {
        const value = answers[field.column as FeatureKey];
        return [field.column, field.type === "integer" ? Number(value) : value];
      }));
      const prediction = await api.predictDiabetes(patient, controller.signal);
      if (controller.signal.aborted) return;
      setResult({ prediction, synthetic: false });
      router.push("/results");
    } catch (error) {
      if (!controller.signal.aborted) setMessage(predictionErrorMessage(error));
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return <form className="panel assessment-card" noValidate onSubmit={event => {
    event.preventDefault();
    void predict();
  }}>
    <h2>Diabetes discharge assessment</h2>
    <fieldset className="assessment-fields" disabled={busy}>
      {fields.map(field => {
        const key = field.column as FeatureKey;
        return <AssessmentField key={key} field={field} answer={answers[key]} error={errors[key]} onChange={value => update(key, value)} />;
      })}
    </fieldset>
    <p>Academic prototype for de-identified diabetes encounters. All model inputs come from these answers.</p>
    {message && <p role="alert">{message}</p>}
    <div className="assessment-footer">
      <button type="button" disabled={busy} className="assessment-button" onClick={() => { clearAssessment(); setErrors({}); setMessage(""); }}>Reset</button>
      <button disabled={busy} className="assessment-button assessment-primary">{busy ? "Predicting?" : "Predict Readmission"}</button>
    </div>
  </form>;
}
