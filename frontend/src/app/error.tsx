"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="panel notice" role="alert">
      <h1>The workspace could not load</h1>
      <button className="secondary-button" onClick={reset}>Try again</button>
    </section>
  );
}
