import { Database, FileSpreadsheet, FlaskConical } from "lucide-react";
import Link from "next/link";
import profile from "@/lib/dataset-profile.json";
import "../insights.css";

export const metadata = { title: "Dataset Overview" };

export default function Dataset() {
  return (
    <>
      <header className="page-intro"><h1>Dataset Overview</h1><p>Inventory of the supplied workbook and its compatibility with the deployed model.</p></header>
      <section className="panel insights-panel" aria-labelledby="supplied-inventory">
        <h2 id="supplied-inventory"><FileSpreadsheet size={20} aria-hidden="true" /> Supplied workbook and working CSV</h2>
        <dl className="metric-grid">
          <div className="metric"><dt>Data rows</dt><dd>{profile.records.toLocaleString("en-US")}</dd></div>
          <div className="metric"><dt>Supplied columns</dt><dd>{profile.column_count}</dd></div>
          <div className="metric"><dt>Required model fields</dt><dd>{profile.model_feature_count}</dd></div>
          <div className="metric"><dt>Exact field-name matches</dt><dd>{profile.exact_matches}</dd></div>
        </dl>
        <p className="insights-caption">Counts were read from the converted CSV in <code>Dataset/</code>. The source named <code>diabetic_data.csv</code> is an Excel workbook. The working copy has 1,879 data rows plus its header.</p>
      </section>
      <div className="insights-grid">
        <section className="panel insights-panel">
          <h2><Database size={19} aria-hidden="true" /> Model compatibility</h2>
          <p>The supplied columns describe diabetes-related measurements, lifestyle and history. The model expects a discharge encounter with admission and discharge codes, prior visit counts, diagnosis codes, lab categories and medication states.</p>
          <p><code>Age</code> and <code>Gender</code> look similar by name, but the workbook uses numeric fields where the model requires fitted categorical strings. Its numerical <code>HbA1c</code> value also differs from the model’s recorded result category.</p>
        </section>
        <section className="panel insights-panel">
          <h2><FlaskConical size={19} aria-hidden="true" /> Demonstration data</h2>
          <p>Verified synthetic fixtures satisfy the exact 47-field schema and exercise the original model without using supplied records.</p>
          <p>The supplied workbook is separate from the historical training data and holdout. It is used for compatibility review, and no model accuracy was calculated from it.</p>
          <Link href="/assessment" className="hero-link insights-link">Open patient assessment</Link>
        </section>
      </div>
      <section className="panel insights-panel" aria-labelledby="supplied-columns">
        <h2 id="supplied-columns">Available column names</h2>
        <p>Schema-level inventory only. Individual records and values are excluded.</p>
        <ul className="column-list" aria-label="Supplied dataset column names">
          {profile.columns.map((column) => <li key={column}><code>{column}</code></li>)}
        </ul>
      </section>
    </>
  );
}
