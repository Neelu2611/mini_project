"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

type State<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string; kind?: ApiError["kind"] };

function useBackend<T>(load: (signal?: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<State<T>>({ status: "loading" });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => {
    setState({ status: "loading" });
    setRevision((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ status: "ready", data });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            status: "error",
            message: error instanceof ApiError ? error.message : "Unable to load backend information.",
            kind: error instanceof ApiError ? error.kind : undefined,
          });
        }
      },
    );
    return () => controller.abort();
  }, [load, revision]);
  return { state, refresh };
}

export const useHealth = () => useBackend(api.health);
export const useModelInfo = () => useBackend(api.modelInfo);
export const useFeatures = () => useBackend(api.features);
