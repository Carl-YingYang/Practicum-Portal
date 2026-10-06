"use client";
import { useRef, useState } from "react";

/** Lock immediately (before React renders) and keep failed actions retryable. */
export function useAsyncAction() {
  const running = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function run(action: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setPending(true);
    setError("");
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The action failed. Please try again.");
    } finally {
      running.current = false;
      setPending(false);
    }
  }
  return { pending, error, run };
}
