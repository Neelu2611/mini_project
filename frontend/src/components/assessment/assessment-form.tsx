"use client";

import { ClipboardCheck, ClipboardList, FlaskConical, RotateCcw, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AssessmentField } from "./assessment-field";
import { useAssessmentSession } from "./assessment-session";
import { useFeatures } from "@/hooks/use-backend";
import { api, ApiError } from "@/lib/api";
import type { Features } from "@/lib/api-contracts";
import {
  buildPatientPayload, checkAssessmentSchema, formatAnswer, validateAnswers,
  type Answer, type FieldErrors,
} from "@/lib/assessment";
import { questionFor, questions, sections, type FeatureKey } from "@/lib/assessment-questions";

const review = { id: "review", title: "Final review and confirmation", short: "Review" };
const steps = [...sections, review];
const reviewIndex = sections.length;

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
  const { draft: { answers, demo, step }, setDraft, setResult, clearAssessment } = useAssessmentSession();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState("");
  const demoRequest = useRef<AbortController | null>(null);
  const predictionRequest = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const shouldFocusStep = useRef(false);
  const grouped = sections.map((group) => schema.features.filter((field) =>
    questionFor(field.column as FeatureKey).section === group.id));
  const answered = schema.features.filter((field) => answers[field.column as FeatureKey] !== undefined &&
    answers[field.column as FeatureKey] !== "").length;

  useEffect(() => () => {
    demoRequest.current?.abort();
    predictionRequest.current?.abort();
  }, []);
  useEffect(() => {
    if (shouldFocusStep.current) {
      heading.current?.focus();
      shouldFocusStep.current = false;
    }
  }, [step]);

  function goTo(next: number) {
    if (next !== step) shouldFocusStep.current = true;
    setDraft((old) => ({ ...old, step: next }));
    setErrors({});
    setConfirmed(false);
    setSubmissionError("");
  }

  function update(key: FeatureKey, value: Answer | undefined) {
    setDraft((old) => ({ ...old, answers: { ...old.answers, [key]: value } }));
    setResult(null);
    setErrors((old) => {
      const remaining = { ...old };
      delete remaining[key];
      return remaining;
    });
  }

  function reset() {
    if (predictionRequest.current) return;
    demoRequest.current?.abort();
    demoRequest.current = null;
    setDemoLoading(false);
    setDemoError("");
    clearAssessment();
    goTo(0);
  }

  async function loadDemo() {
    if (predictionRequest.current || demoRequest.current) return;
    const controller = new AbortController();
    demoRequest.current = controller;
    setDemoLoading(true);
    setDemoError("");
    try {
      const sample = await api.samplePatient(controller.signal);
      if (controller.signal.aborted) return;
      const patient = buildPatientPayload(schema, sample.patient);
      setDraft((old) => ({ ...old, answers: patient, demo: true }));
      setResult(null);
      goTo(0);
    } catch (error) {
      if (!controller.signal.aborted) {
        setDemoError(error instanceof ApiError ? error.message : "The synthetic fixture does not match the verified form.");
      }
    } finally {
      if (demoRequest.current === controller) {
        demoRequest.current = null;
        setDemoLoading(false);
      }
    }
  }

  function continueAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (predictionRequest.current || demoRequest.current) return;
    const fields = step < reviewIndex ? grouped[step] : schema.features;
    const invalid = validateAnswers(fields, answers);
    const first = Object.keys(invalid)[0] as FeatureKey | undefined;
    if (first) {
      if (step === reviewIndex) goTo(sections.findIndex((section) => section.id === questionFor(first).section));
      setErrors(invalid);
      requestAnimationFrame(() => document.getElementById(`field-${first}`)?.focus());
      return;
    }
    if (step < reviewIndex) {
      goTo(step + 1);
    } else if (confirmed) {
      void submitPrediction();
    }
  }

  async function submitPrediction() {
    const controller = new AbortController();
    predictionRequest.current = controller;
    setSubmitting(true);
    setSubmissionError("");
    setResult(null);
    try {
      const prediction = await api.predict(buildPatientPayload(schema, answers), controller.signal);
      if (controller.signal.aborted) return;
      setResult({ prediction, synthetic: demo });
      router.push("/results");
    } catch (error) {
      if (!controller.signal.aborted) {
        predictionRequest.current = null;
        setSubmitting(false);
        setSubmissionError(predictionErrorMessage(error));
      }
    }
  }

  return (
    <div className="assessment">
      <div className="assessment-notice">
        <ShieldCheck size={21} aria-hidden="true" />
        <p><strong>Academic prototype.</strong> Use synthetic or de-identified information. This form is for staff-assisted demonstration and must not guide clinical decisions.</p>
      </div>
      <div className="assessment-toolbar">
        <div className="assessment-actions">
          <button type="button" className="assessment-button demo-button" onClick={loadDemo} disabled={demoLoading || submitting}>
            <FlaskConical size={17} aria-hidden="true" /> {demoLoading ? "Loading demo…" : "Load Demo Patient"}
          </button>
          <button type="button" className="assessment-button reset-button" onClick={reset} disabled={submitting}>
            <RotateCcw size={16} aria-hidden="true" /> Reset Form
          </button>
        </div>
        {demo && <span className="demo-label" role="status">Synthetic demo loaded. Reset before entering other information.</span>}
      </div>
      {demoError && <p className="assessment-error" role="alert">{demoError}</p>}
      <div className="assessment-layout">
        <nav className="panel assessment-progress" aria-label="Assessment progress">
          <p className="step-progress-label">Step {step + 1} of {steps.length}</p>
          <progress value={step + 1} max={steps.length} aria-label="Assessment steps" />
          <ol>
            {steps.map((entry, index) => (
              <li key={entry.id} aria-current={index === step ? "step" : undefined}>
                <span>{index + 1}</span>{entry.short}
              </li>
            ))}
          </ol>
          <p className="answer-count">{answered} of {schema.features.length} answered</p>
        </nav>
        <form className="panel assessment-card" onSubmit={continueAssessment} noValidate autoComplete="off">
          <div className="assessment-card-heading">
            <span className="feature-icon">{step === reviewIndex ? <ClipboardCheck size={21} /> : <ClipboardList size={21} />}</span>
            <div>
              <h2 tabIndex={-1} ref={heading}>{steps[step].title}</h2>
              <p>{step < reviewIndex ? sections[step].detail : "Check the answers against the available records before confirming."}</p>
            </div>
          </div>
          {Object.keys(errors).length > 0 && <p className="assessment-error" role="alert">Review the highlighted answers before continuing.</p>}
          {step < reviewIndex ? (
            <div className="assessment-fields" key={step}>
              {grouped[step].map((field) => {
                const key = field.column as FeatureKey;
                return <AssessmentField key={key} field={field} answer={answers[key]} error={errors[key]} onChange={(value) => update(key, value)} />;
              })}
            </div>
          ) : (
            <>
              <div className="review-groups">
                {sections.map((section, index) => (
                  <section className="review-group" key={section.id}>
                    <div className="review-heading">
                      <h3>{section.short}</h3>
                      <button type="button" onClick={() => goTo(index)} aria-label={`Edit ${section.short}`} disabled={submitting || demoLoading}>Edit</button>
                    </div>
                    <dl>
                      {grouped[index].map((field) => {
                        const key = field.column as FeatureKey;
                        const answer = answers[key];
                        return <div key={key}><dt>{questionFor(key).question}</dt><dd>{answer === undefined ? "Unanswered" : formatAnswer(field, answer)}</dd></div>;
                      })}
                    </dl>
                  </section>
                ))}
              </div>
              <label className="review-confirmation">
                <input type="checkbox" checked={confirmed} disabled={submitting || demoLoading} onChange={(event) => setConfirmed(event.target.checked)} />
                I reviewed the answers and confirm they are appropriate for this demonstration.
              </label>
              {submitting && <p className="assessment-prepared" role="status">Running prediction…</p>}
              {submissionError && <p className="assessment-error" role="alert">{submissionError}</p>}
            </>
          )}
          <div className="assessment-footer">
            <button type="button" className="assessment-button reset-button" disabled={step === 0 || submitting || demoLoading} onClick={() => goTo(step - 1)}>Previous</button>
            <button type="submit" className="assessment-button assessment-primary"
              disabled={demoLoading || submitting || (step === reviewIndex && !confirmed)}>
              {step < reviewIndex ? "Next" : submitting ? "Predicting…" : submissionError ? "Retry Prediction" : "Predict Readmission"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
