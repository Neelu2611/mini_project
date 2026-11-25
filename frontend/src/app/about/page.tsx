import { Activity, ClipboardList, Cpu, Layers3, Monitor, Server, ShieldCheck } from "lucide-react";
import "../insights.css";

export const metadata = { title: "About the System" };

const flow = [
  { icon: Monitor, title: "Next.js", detail: "Seven-step assessment, review and score presentation." },
  { icon: Server, title: "FastAPI", detail: "Validates the 47-field JSON request and returns ordered scores." },
  { icon: Layers3, title: "Fitted preprocessor", detail: "Encodes the same categories and produces 2,396 columns." },
  { icon: Cpu, title: "Balanced XGBoost", detail: "Scores the three outcomes using the original trained model." },
];

export default function About() {
  return (
    <>
      <header className="page-intro"><h1>About the System</h1><p>Patient Readmission Prediction System</p></header>
      <section className="panel insights-panel">
        <h2>Project objective</h2>
        <p>Demonstrate how structured discharge-encounter data can be validated and scored for three historical readmission outcomes. The workflow is designed for a staff-assisted academic demonstration with verified synthetic examples.</p>
      </section>
      <section className="panel insights-panel" aria-labelledby="architecture-title">
        <h2 id="architecture-title">System architecture</h2>
        <ol className="architecture-flow">
          {flow.map(({ icon: Icon, title, detail }) => <li key={title}><span className="feature-icon"><Icon size={20} aria-hidden="true" /></span><h3>{title}</h3><p>{detail}</p></li>)}
        </ol>
      </section>
      <div className="insights-grid">
        <section className="panel insights-panel">
          <h2><ClipboardList size={19} aria-hidden="true" /> Prediction workflow</h2>
          <ol className="method-steps">
            <li>Complete and confirm the encounter fields. The frontend sends one typed request.</li>
            <li>Python preserves fitted feature order and categorical strings, maps explicit null lab answers to <code>Not measured</code>, and retains numeric passthrough fields.</li>
            <li>The original fitted transformer and classifier generate an ordered prediction. Next.js keeps the current draft and result in memory.</li>
          </ol>
        </section>
        <section className="panel insights-panel">
          <h2><Activity size={19} aria-hidden="true" /> Outcome classes</h2>
          <dl className="class-list">
            <div><dt>0 · NO</dt><dd>No recorded readmission</dd></div>
            <div><dt>1 · &gt;30</dt><dd>Readmission after 30 days</dd></div>
            <div><dt>2 · &lt;30</dt><dd>Readmission within 30 days, using the notebook’s original early-readmission label</dd></div>
          </dl>
        </section>
      </div>
      <aside className="insights-note"><ShieldCheck size={20} aria-hidden="true" /><div><strong>Academic prototype</strong><p>Scores are uncalibrated. Historical evaluation has not been independently reproduced, and clinical use has not been validated. Use synthetic or de-identified inputs for demonstrations.</p></div></aside>
    </>
  );
}
