"use client";

import Link from "next/link";

export default function ResultsError({ reset }: { reset: () => void }) {
  return (
    <section className="panel notice" role="alert">
      <h1>The prediction summary could not load</h1>
      <div className="result-actions">
        <button type="button" className="result-secondary" onClick={reset}>Try again</button>
        <Link className="hero-link" href="/assessment">Return to assessment</Link>
      </div>
    </section>
  );
}
