import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function SectionPage({ title, description, icon: Icon, children }: {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <>
      <header className="page-intro">
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <section className="panel foundation-card">
        <span className="feature-icon"><Icon size={23} aria-hidden="true" /></span>
        <div>{children}</div>
      </section>
    </>
  );
}
