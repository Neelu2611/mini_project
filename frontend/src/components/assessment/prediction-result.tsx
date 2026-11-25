"use client";

import { Activity, CheckCircle2, ClipboardList, FlaskConical, Printer, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAssessmentSession } from "./assessment-session";

const outcomeNames = {
  NO: "No recorded readmission",
  ">30": "Readmission after 30 days",
  "<30": "Readmission within 30 days",
} as const;

const colors = { NO: "#08736a", ">30": "#32709e", "<30": "#795a93" } as const;
const explanations = {
  NO: "The model selected the category for encounters with no recorded readmission. A readmission could still occur.",
  ">30": "The model selected the category for encounters whose readmission was recorded after 30 days.",
  "<30": "The model selected the early-readmission category, represented by the original <30 label.",
} as const;
const percentage = (score: number) => `${(score * 100).toFixed(1)}%`;

export function PredictionResult() {
  const router = useRouter();
  const { result, clearAssessment } = useAssessmentSession();

  function startNew() {
    clearAssessment();
    router.push("/assessment");
  }

  if (!result) {
    return (
      <section className="panel foundation-card" aria-labelledby="empty-result">
        <span className="feature-icon"><Activity size={23} aria-hidden="true" /></span>
        <div>
          <h2 id="empty-result">No prediction to display</h2>
          <p>Submit an assessment to view a prediction here. Refreshing the page clears the current result.</p>
          <div className="result-actions"><Link className="hero-link" href="/assessment"><ClipboardList size={17} aria-hidden="true" /> Go to assessment</Link></div>
        </div>
      </section>
    );
  }

  const { prediction, synthetic } = result;
  const chartData = prediction.probabilities.map((entry) => ({
    ...entry, name: outcomeNames[entry.outcome_label], fill: colors[entry.outcome_label],
  }));
  return (
    <div className="result-view">
      {synthetic && <p className="result-demo"><FlaskConical size={18} aria-hidden="true" /> Synthetic demonstration result</p>}
      <section className="panel result-panel result-outcome" aria-labelledby="predicted-outcome">
        <p className="result-status"><CheckCircle2 size={16} aria-hidden="true" /> Prediction complete</p>
        <div className="result-heading">
          <span className="feature-icon"><Activity size={22} aria-hidden="true" /></span>
          <div><h2 id="predicted-outcome">{prediction.category}</h2><p>Predicted class {prediction.predicted_class} · {prediction.outcome_label}</p></div>
        </div>
        <p className="result-model"><strong>Model</strong> {prediction.model_name}</p>
        <p className="result-explanation">{explanations[prediction.outcome_label]}</p>
      </section>
      <section className="panel result-panel result-breakdown" aria-labelledby="score-breakdown">
        <h3 id="score-breakdown">Uncalibrated model scores</h3>
        <p className="result-description">Both charts display the same three outputs on a 0–100% scale.</p>
        <div className="result-charts" aria-hidden="true">
          <div className="result-chart" data-testid="score-donut">
            <p>Score distribution</p>
            <ResponsiveContainer width="100%" height={185}>
              <PieChart accessibilityLayer={false}>
                <Pie data={chartData} dataKey="score" nameKey="name" innerRadius="53%" outerRadius="81%" paddingAngle={2} stroke="none" isAnimationActive={false} />
                <Tooltip formatter={(value) => percentage(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="result-chart" data-testid="score-bars">
            <p>Scores by outcome</p>
            <ResponsiveContainer width="100%" height={185}>
              <BarChart data={chartData} layout="vertical" accessibilityLayer={false} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <XAxis type="number" domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFormatter={(value) => `${Math.round(value * 100)}%`} tick={{ fontSize: 11, fill: "#516477" }} />
                <YAxis type="category" dataKey="outcome_label" width={43} tick={{ fontSize: 12, fill: "#142a40" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => percentage(Number(value))} />
                <Bar dataKey="score" name="Model score" radius={[0, 5, 5, 0]} maxBarSize={22} isAnimationActive={false}>
                  {chartData.map((entry) => <Cell key={entry.class_id} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <dl className="result-scores">
          {prediction.probabilities.map(({ class_id, outcome_label, score }) => (
            <div key={class_id}>
              <dt><span className="outcome-swatch" style={{ backgroundColor: colors[outcome_label] }} aria-hidden="true" />{outcomeNames[outcome_label]} <span className="result-token">{outcome_label}</span></dt>
              <dd>{score.toFixed(8)}</dd>
            </div>
          ))}
        </dl>
      </section>
      <aside className="result-disclaimer"><ShieldCheck size={20} aria-hidden="true" /><p>{prediction.disclaimer}</p></aside>
      <div className="result-actions">
        <Link className="result-secondary" href="/assessment">Return to assessment</Link>
        <button type="button" className="result-secondary" onClick={() => window.print()}><Printer size={17} aria-hidden="true" /> Print summary</button>
        <button type="button" className="hero-link" onClick={startNew}>Start new assessment</button>
      </div>
    </div>
  );
}
