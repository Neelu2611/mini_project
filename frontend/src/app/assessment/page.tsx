import { AssessmentForm } from "@/components/assessment/assessment-form";
import "./assessment.css";

export const metadata = { title: "Patient Assessment" };

export default function Assessment() {
  return (
    <>
      <header className="page-intro">
        <h1>Patient Assessment</h1>
        <p>Staff-assisted assessment for one discharge encounter. Confirm patient-reported details and verify clinical answers against hospital records.</p>
      </header>
      <AssessmentForm />
    </>
  );
}
