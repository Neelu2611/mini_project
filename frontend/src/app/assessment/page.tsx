import { AssessmentForm } from "@/components/assessment/assessment-form";
import "./assessment.css";

export const metadata = { title: "Patient Assessment" };

export default function Assessment() {
  return (
    <>
      <header className="page-intro">
        <h1>Patient Assessment</h1>
        <p>Use the discharge record to answer questions about a hospital stay for a patient with documented diabetes.</p>
      </header>
      <AssessmentForm />
    </>
  );
}
