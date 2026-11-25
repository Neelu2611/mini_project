"use client";

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { Prediction } from "@/lib/api-contracts";
import type { Answers } from "@/lib/assessment";

type Draft = { answers: Answers; demo: boolean; step: number };
type Result = { prediction: Prediction; synthetic: boolean };

const emptyDraft: Draft = { answers: {}, demo: false, step: 0 };
const AssessmentSession = createContext<{
  draft: Draft;
  setDraft: Dispatch<SetStateAction<Draft>>;
  result: Result | null;
  setResult: Dispatch<SetStateAction<Result | null>>;
  clearAssessment: () => void;
} | null>(null);

export function AssessmentSessionProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [result, setResult] = useState<Result | null>(null);

  function clearAssessment() {
    setDraft(emptyDraft);
    setResult(null);
  }

  return <AssessmentSession.Provider value={{ draft, setDraft, result, setResult, clearAssessment }}>
    {children}
  </AssessmentSession.Provider>;
}

export function useAssessmentSession() {
  const session = useContext(AssessmentSession);
  if (!session) throw new Error("Assessment session provider is required.");
  return session;
}
