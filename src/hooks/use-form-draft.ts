"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/use-app-store";
import { flushChanges } from "@/client/portal-client";
import { registerNavigationGuard } from "@/client/navigation-guard";
import type { FormFieldValue, FormSubmission } from "@/lib/types";
type Values = Record<string, FormFieldValue>;
export function useFormDraft(
  formId: string | undefined,
  userId: string | undefined,
  targetStudentId: string | undefined,
  initial: FormSubmission | undefined,
) {
  const key = `practo:form-draft:${userId}:${formId}:${targetStudentId ?? "self"}`;
  const [values, setValues] = useState<Values>(initial?.values ?? {}),
    [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
      "idle",
    ),
    [error, setError] = useState(""),
    [recovery, setRecovery] = useState<Values | null>(null);
  const valuesRef = useRef(values),
    dirty = useRef(false),
    serial = useRef(0),
    inFlight = useRef<Promise<void> | null>(null),
    initialRef = useRef(initial),
    mounted = useRef(true);
  useEffect(() => {
    initialRef.current = initial;
  }, [initial]);
  useEffect(() => {
    mounted.current = true;
    const next = initialRef.current?.values ?? {};
    valuesRef.current = next;
    setValues(next);
    dirty.current = false;
    setError("");
    setSaveState("idle");
    setRecovery(null);
    try {
      const cached = JSON.parse(localStorage.getItem(key) ?? "null");
      if (cached && JSON.stringify(cached) !== JSON.stringify(next))
        setRecovery(cached);
    } catch {}
    return () => {
      mounted.current = false;
    };
  }, [key]);
  const save = useCallback((): Promise<void> => {
    if (inFlight.current) return inFlight.current;
    if (!dirty.current) return Promise.resolve();
    const work = async () => {
      if (mounted.current) {
        setSaveState("saving");
        setError("");
      }
      try {
        do {
          const captured = serial.current,
            state = useAppStore.getState();
          const record = state.formSubmissions.find(
            (s) =>
              s.formId === formId &&
              s.userId === userId &&
              (s.targetStudentId ?? undefined) === targetStudentId,
          );
          if (
            record &&
            !["in_progress", "needs_revision"].includes(record.status)
          )
            throw new Error(
              "This response is locked. Your local answers are retained.",
            );
          const id =
            record?.id ??
            state.startFormResponse({ formId: formId!, targetStudentId });
          if (!id)
            throw new Error(
              "This form is no longer assigned or published. Your answers are retained.",
            );
          state.saveSubmissionDraft(id, { ...valuesRef.current });
          await flushChanges();
          if (captured === serial.current) dirty.current = false;
        } while (dirty.current);
        try {
          localStorage.removeItem(key);
        } catch {}
        if (mounted.current) setSaveState("saved");
      } catch (e) {
        if (mounted.current) {
          setSaveState("error");
          setError((e as Error).message);
        }
        throw e;
      }
    };
    inFlight.current = work().finally(() => {
      inFlight.current = null;
    });
    return inFlight.current;
  }, [formId, userId, targetStudentId, key]);
  function update(blockId: string, value: FormFieldValue) {
    const next = { ...valuesRef.current, [blockId]: value };
    valuesRef.current = next;
    dirty.current = true;
    serial.current++;
    setValues(next);
    setSaveState("saving");
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      setError("Browser recovery unavailable. Save before closing.");
    }
    void save().catch(() => {});
  }
  useEffect(() => registerNavigationGuard(save), [save]);
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, []);
  return {
    values,
    valuesRef,
    setValues,
    saveState,
    setSaveState,
    error,
    recovery,
    save,
    update,
    reset: async () => {
      valuesRef.current = {};
      setValues({});
      dirty.current = true;
      serial.current++;
      try {
        localStorage.setItem(key, "{}");
      } catch {}
      await save();
    },
    restore: () => {
      if (recovery) {
        valuesRef.current = recovery;
        setValues(recovery);
        dirty.current = true;
        serial.current++;
        setRecovery(null);
        void save().catch(() => {});
      }
    },
    discard: () => {
      try {
        localStorage.removeItem(key);
      } catch {}
      setRecovery(null);
    },
  };
}
