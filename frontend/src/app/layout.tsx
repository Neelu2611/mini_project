import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { AssessmentSessionProvider } from "@/components/assessment/assessment-session";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Diabetes Readmission Prediction System", template: "%s | Readmission Prediction" },
  description: "An academic workspace for exploring the verified readmission prediction model.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AppShell><AssessmentSessionProvider>{children}</AssessmentSessionProvider></AppShell></body></html>;
}
