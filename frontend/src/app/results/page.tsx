import { PredictionResult } from "@/components/assessment/prediction-result";
import "./results.css";

export const metadata = { title: "Prediction Results" };

export default function Results() {
  return (
    <>
      <header className="page-intro">
        <h1>Prediction Results</h1>
        <p>Review the predicted outcome and scores for this assessment.</p>
      </header>
      <PredictionResult />
    </>
  );
}
