"use client";

import { BookOpen, Layers3 } from "lucide-react";
import type { ReactNode } from "react";
import { useModelInfo } from "@/hooks/use-backend";
import type { ModelInfo } from "@/lib/api-contracts";

const number = new Intl.NumberFormat("en-US");
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 2 });

function HistoricalMetrics({ model }: { model: ModelInfo }) {
  const evaluation = model.historical_evaluation;
  if (evaluation.holdout_encounters === 0) {
    return <p className="state-copy" role="status">No historical evaluation results are available.</p>;
  }
  const metrics = [
    ["Overall accuracy", evaluation.accuracy],
    ["Early readmission precision", evaluation.early_readmission_precision],
    ["Early readmission recall", evaluation.early_readmission_recall],
    ["Early readmission F1", evaluation.early_readmission_f1],
  ] as const;

  return (
    <>
      <dl className="metric-grid">
        {metrics.map(([label, value]) => (
          <div className="metric" key={label}>
            <dt>{label}</dt>
            <dd>{percent.format(value)}</dd>
          </div>
        ))}
      </dl>
      <div className="metric-provenance">
        <p>Recorded on {number.format(evaluation.holdout_encounters)} holdout encounters for {model.model_name}. These results have not been independently reproduced.</p>
        <p><span>Notebook</span> <code>{evaluation.source.split("/").at(-1)}</code> · Cells {evaluation.cells.join(", ")} · Bundle <code title={model.model_sha256}>{model.model_sha256.slice(0, 12)}</code></p>
      </div>
    </>
  );
}

export function ModelSummary({ welcome }: { welcome: ReactNode }) {
  const { state, refresh } = useModelInfo();
  return (
    <>
      <div className="overview-grid">
        {welcome}
        <section className="panel model-panel" aria-labelledby="model-summary" aria-busy={state.status === "loading"}>
          <div className="model-heading">
            <span className="feature-icon"><Layers3 size={20} aria-hidden="true" /></span>
            <h2 id="model-summary">Model overview</h2>
          </div>
          {state.status === "loading" && <p className="state-copy" role="status">Loading model information…</p>}
          {state.status === "error" && (
            <div className="model-error"><p role="alert">{state.message}</p><button className="secondary-button" onClick={refresh}>Try again</button></div>
          )}
          {state.status === "ready" && (
            <>
              <p className="model-name">{state.data.model_name}</p>
              <dl className="model-facts">
                <div><dt>Raw input features</dt><dd>{number.format(state.data.input_feature_count)}</dd></div>
                <div><dt>Transformed features</dt><dd>{number.format(state.data.transformed_feature_count)}</dd></div>
                <div><dt>Outcome classes</dt><dd>{state.data.outcome_classes.length}</dd></div>
              </dl>
            </>
          )}
        </section>
      </div>
      <section className="panel evaluation-panel" aria-labelledby="historical-evaluation" aria-busy={state.status === "loading"}>
        <div className="model-heading">
          <span className="feature-icon"><BookOpen size={20} aria-hidden="true" /></span>
          <h2 id="historical-evaluation">Historical notebook evaluation</h2>
        </div>
        {state.status === "loading" && <p className="state-copy" role="status">Loading historical results…</p>}
        {state.status === "error" && <p className="state-copy">Historical results are unavailable. Retry from Model overview.</p>}
        {state.status === "ready" && <HistoricalMetrics model={state.data} />}
      </section>
    </>
  );
}
