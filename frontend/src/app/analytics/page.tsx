import { BookOpen, ChartNoAxesCombined, Grid3X3 } from "lucide-react";
import { NotebookComparison } from "@/components/ui/notebook-comparison";
import evaluation from "@/lib/notebook-evaluation.json";
import "../insights.css";

export const metadata = { title: "Model Analytics" };

const outcomes = ["NO", ">30", "<30"];
const reportNames: Record<string, string> = {
  "0": "No recorded readmission (NO)", "1": "After 30 days (>30)", "2": "Within 30 days (<30)",
  "macro avg": "Macro average", "weighted avg": "Support-weighted average",
};
const format = (value: number) => value.toLocaleString("en-US");
const percent = (value: number) => `${(value * 100).toFixed(2)}%`;
const selected = evaluation.classification[2];

export default function Analytics() {
  return (
    <>
      <header className="page-intro">
        <h1>Model Analytics</h1>
        <p>Historical performance of the selected Balanced XGBoost model and the notebook experiments.</p>
      </header>
      <section className="panel insights-panel"><h2>Live assessment model evaluation</h2><p>Diabetes discharge XGBoost v1 correctly classified 49.3% of 20,153 held-out UCI encounters. For readmission before 30 days, precision was 18.7% and recall was 42.6%. Each patient appeared in only one partition during evaluation. <a href="https://doi.org/10.24432/C5230J">Training and evaluation source</a></p></section>
      <aside className="insights-note"><BookOpen size={20} aria-hidden="true" /><div><strong>Recorded notebook evaluation</strong><p>The 80/20 stratified encounter split used seed 42, with {format(evaluation.holdout)} holdout encounters. Historical evaluation has not been independently reproduced. The same holdout informed model selection.</p></div></aside>
      <section className="panel insights-panel" aria-labelledby="selected-model">
        <h2 id="selected-model">Selected model · Balanced XGBoost</h2>
        <dl className="metric-grid">
          {[
            ["Overall accuracy", evaluation.accuracy], ["Class 2 precision", selected.precision],
            ["Class 2 recall", selected.recall], ["Class 2 F1", selected.f1],
          ].map(([label, value]) => <div className="metric" key={label}><dt>{label}</dt><dd>{percent(Number(value))}</dd></div>)}
        </dl>
        <p className="insights-caption">Source: notebook cells 185 and 211. Class 2 is the early-readmission category. ROC-AUC was not recorded in the notebook.</p>
      </section>
      <div className="insights-grid">
        <section className="panel insights-panel" aria-labelledby="classification-title">
          <h2 id="classification-title">Classification report</h2>
          <p>Macro averages weight each class equally. Weighted averages use the recorded class support.</p>
          <div className="insights-table-wrap" tabIndex={0} role="region" aria-label="Classification report table">
            <table className="insights-table">
              <thead><tr><th scope="col">Category</th><th scope="col">Precision</th><th scope="col">Recall</th><th scope="col">F1</th><th scope="col">Support</th></tr></thead>
              <tbody>{evaluation.classification.map(({ label, precision, recall, f1, support }) => (
                <tr key={label}><th scope="row">{reportNames[label]}</th><td>{percent(precision)}</td><td>{percent(recall)}</td><td>{percent(f1)}</td><td>{format(support)}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <p className="insights-caption">Cell 185 recorded rounded class and average metrics. Cell 211 recorded Class 2 at greater precision.</p>
        </section>
        <section className="panel insights-panel" aria-labelledby="matrix-title">
          <h2 id="matrix-title"><Grid3X3 size={19} aria-hidden="true" /> Confusion matrix</h2>
          <p>Rows are actual outcomes. Columns are predicted outcomes. Values count encounters.</p>
          <div className="insights-table-wrap" tabIndex={0} role="region" aria-label="Confusion matrix table">
            <table className="insights-table matrix-table">
              <thead><tr><th scope="col">Actual / Predicted</th>{outcomes.map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead>
              <tbody>{evaluation.matrix.map((row, index) => <tr key={outcomes[index]}>
                <th scope="row">{outcomes[index]}</th>
                {row.map((count, col) => <td key={outcomes[col]} style={{ backgroundColor: `rgb(8 115 106 / ${0.04 + 0.30 * count / row.reduce((sum, item) => sum + item, 0)})` }}>{format(count)}</td>)}
              </tr>)}</tbody>
            </table>
          </div>
          <p className="insights-caption">Source: cell 185. The selected model identified 945 of 2,272 recorded early readmissions in this holdout.</p>
        </section>
      </div>
      <section className="panel insights-panel" aria-labelledby="comparison-title">
        <h2 id="comparison-title"><ChartNoAxesCombined size={19} aria-hidden="true" /> Notebook model comparison</h2>
        <p>The chart compares selected experiments on early readmission. The table preserves the recorded evaluation values and source cells for all listed runs.</p>
        <NotebookComparison />
        <div className="insights-table-wrap" tabIndex={0} role="region" aria-label="Model comparison table">
          <table className="insights-table">
            <thead><tr><th scope="col">Experiment</th><th scope="col">Accuracy</th><th scope="col">Class 2 recall</th><th scope="col">Class 2 F1</th><th scope="col">Cell</th></tr></thead>
            <tbody>{evaluation.comparisons.map((run) => (
              <tr key={run.cell} className={run.cell === 185 ? "selected-run" : undefined}><th scope="row">{run.model}{run.cell === 185 && <span className="run-label">Selected</span>}</th><td>{percent(run.accuracy)}</td><td>{percent(run.recall)}</td><td>{percent(run.f1)}</td><td>{run.cell === 185 ? "185, 211" : run.cell}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <p className="insights-caption">The notebook selected Balanced XGBoost for early-readmission recall and F1. The source is <code>patient_readmission_review2_backup.ipynb</code>. These are historical encounter-level results with no independent or clinical validation.</p>
      </section>
    </>
  );
}
