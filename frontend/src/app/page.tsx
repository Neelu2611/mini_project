import Link from "next/link";
import { Activity, ClipboardList, HeartPulse, ScanLine, ShieldCheck } from "lucide-react";
import { ModelSummary } from "@/components/ui/model-summary";

const workflow = [
  { title: "Enter encounter details", description: "Provide the required demographic, hospital, diagnosis, lab and medication fields.", icon: ClipboardList },
  { title: "Validate and transform", description: "The backend checks the inputs and applies the original fitted preprocessor.", icon: ScanLine },
  { title: "Review the model output", description: "Balanced XGBoost returns a predicted class and scores for all three outcomes.", icon: Activity },
];

export default function Dashboard() {
  return (
    <>
      <header className="page-intro">
        <h1>Dashboard</h1>
      </header>
      <ModelSummary welcome={
        <section className="overview-hero" aria-labelledby="overview-title">
          <div className="hero-content">
            <div className="hero-icon"><HeartPulse size={25} strokeWidth={1.7} aria-hidden="true" /></div>
            <h2 id="overview-title">Patient Readmission Prediction System</h2>
            <p>Explore how a fitted model uses discharge encounter data to classify hospital readmission outcomes.</p>
            <Link href="/assessment" className="hero-link"><ClipboardList size={18} aria-hidden="true" /> Start Patient Assessment</Link>
          </div>
        </section>
      } />
      <section className="workflow" aria-labelledby="workflow-title">
        <h2 id="workflow-title">How prediction works</h2>
        <ol className="workflow-grid">
          {workflow.map(({ title, description, icon: Icon }, index) => (
            <li className="panel workflow-card" key={title}>
              <div className="workflow-marker">
                <span className="feature-icon"><Icon size={21} aria-hidden="true" /></span>
                <span className="step-number" aria-label={`Step ${index + 1}`}>{index + 1}</span>
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </li>
          ))}
        </ol>
      </section>
      <aside className="dashboard-disclaimer">
        <ShieldCheck size={20} aria-hidden="true" />
        <p><strong>Academic prototype.</strong> Model scores are uncalibrated. Do not use them for clinical decisions.</p>
      </aside>
    </>
  );
}
