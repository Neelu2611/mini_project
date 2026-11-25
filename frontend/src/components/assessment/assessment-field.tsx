"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { type Answer, type Feature, optionsFor } from "@/lib/assessment";
import { type FeatureKey, questionFor } from "@/lib/assessment-questions";

type Props = {
  field: Feature;
  answer?: Answer;
  error?: string;
  onChange: (value: Answer | undefined) => void;
};

function DiagnosisSelect({ field, answer, error, onChange }: Props) {
  const [search, setSearch] = useState("");
  const id = `field-${field.column}`;
  const options = optionsFor(field);
  const term = search.trim().toLowerCase();
  const matches = options.filter(({ label, value }) => label.toLowerCase().includes(term) ||
    (term.length > 0 && String(value).toLowerCase().replaceAll(".", "") === term.replaceAll(".", "")));
  const missing = !term ? matches.find((option) => option.value === field.missing.token) : undefined;
  const visible = missing
    ? [missing, ...matches.filter((option) => option !== missing).slice(0, 39)]
    : matches.slice(0, 40);
  const selected = options.find((option) => option.value === answer);
  if (selected && !visible.includes(selected)) visible.unshift(selected);

  return (
    <>
      <label className="diagnosis-search">
        <Search size={17} aria-hidden="true" />
        <span className="sr-only">Search options for {questionFor(field.column as FeatureKey).question}</span>
        <input type="search" autoComplete="off" value={search} onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by diagnosis title or recorded code" aria-controls={id} />
      </label>
      <select id={id} value={answer ?? ""} onChange={(event) => onChange(event.target.value || undefined)}
        aria-invalid={!!error} aria-describedby={`${id}-help ${id}-matches${error ? ` ${id}-error` : ""}`}>
        <option value="">Choose a recorded diagnosis</option>
        {visible.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
      </select>
      <p className="assessment-help" id={`${id}-matches`} aria-live="polite">
        {matches.length === 0 ? "No fitted diagnosis matches this search." :
          matches.length > 40 ? `Showing up to 40 of ${matches.length} matches. Refine the search to narrow the list.` :
          `${matches.length} matching options`}
      </p>
    </>
  );
}

export function AssessmentField({ field, answer, error, onChange }: Props) {
  const question = questionFor(field.column as FeatureKey);
  const id = `field-${field.column}`;
  const describedBy = `${id}-help${error ? ` ${id}-error` : ""}`;
  const source = <span className="answer-source">{question.source}</span>;
  const help = <p className="assessment-help" id={`${id}-help`}>
    {question.help ?? (question.control === "medication" ? "Use the documented prescription and dose status." : "Select the documented answer.")}
  </p>;
  const feedback = error && <p className="assessment-error" id={`${id}-error`}>{error}</p>;

  if (question.control === "radio") {
    return (
      <fieldset className="assessment-field" aria-describedby={describedBy} aria-invalid={!!error}>
        <legend>{question.question}</legend>
        {source}
        {help}
        <div className="radio-options">
          {optionsFor(field).map(({ value, label }, index) => (
            <label key={value}>
              <input type="radio" id={index === 0 ? id : `${id}-${index}`} name={field.column}
                checked={answer === value} onChange={() => onChange(value)} />
              {label}
            </label>
          ))}
        </div>
        {feedback}
      </fieldset>
    );
  }

  return (
    <div className="assessment-field">
      <label className="assessment-question" htmlFor={id}>{question.question}</label>
      {source}
      {help}
      {question.control === "diagnosis" ? (
        <DiagnosisSelect field={field} answer={answer} error={error} onChange={onChange} />
      ) : question.control === "integer" ? (
        <input type="number" id={id} min={0} max={Number.MAX_SAFE_INTEGER} step={1} inputMode="numeric"
          autoComplete="off" value={answer ?? ""} onChange={(event) => onChange(event.target.value)}
          aria-describedby={describedBy} aria-invalid={!!error} placeholder="Enter a whole number" />
      ) : (
        <select id={id} value={answer === null ? field.missing.token ?? "" : answer ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            onChange(value === "" ? undefined : field.type === "integer" ? Number(value) : value);
          }} aria-describedby={describedBy} aria-invalid={!!error}>
          <option value="">Choose an answer</option>
          {optionsFor(field).map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </select>
      )}
      {feedback}
    </div>
  );
}
