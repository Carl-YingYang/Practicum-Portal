"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushChanges, portalStore } from "@/client/portal-client";
import { registerNavigationGuard } from "@/client/navigation-guard";
import { journalHours, type JournalCadence } from "@/domain/journal-period";
import type { Journal } from "@/lib/types";
export interface JournalDraftValues {
  date: string;
  tasks: string;
  learnings: string;
}

/** Serial saves retain edits made while a request is pending, and all exits await them. */
export function useJournalDraft(
  studentId: string,
  cadence: JournalCadence,
  initial: JournalDraftValues,
  existing?: Journal,
) {
  const [form, setForm] = useState(initial);
  const latest = useRef(initial);
  const draftId = useRef(existing?.id);
  const revision = useRef(0),
    savedRevision = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);
  const mounted = useRef(true);
  const [activeId, setActiveId] = useState(existing?.id);
  const [edited, setEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = useCallback((): Promise<void> => {
    if (inFlight.current) return inFlight.current;
    const work = async () => {
      if (mounted.current) {
        setSaving(true);
        setError("");
      }
      try {
        do {
          const currentRevision = revision.current;
          const values = { ...latest.current };
          if (!values.date || !studentId)
            throw new Error("Choose a valid date before saving.");
          const state = portalStore.getState();
          const record = state.journals.find(
            (journal) => journal.id === draftId.current,
          );
          if (record && !["draft", "rejected"].includes(record.status))
            throw new Error(
              "This journal is locked for review. Your text has not been overwritten.",
            );
          const hours = journalHours(
            state.timeLogs,
            studentId,
            values.date,
            cadence,
          ).hours;
          if (record) state.updateJournalDraft(record.id, { ...values, hours });
          else
            draftId.current = state.createJournal({
              studentId,
              ...values,
              hours,
              submit: false,
            });
          await flushChanges();
          savedRevision.current = currentRevision;
          if (mounted.current) setActiveId(draftId.current);
        } while (savedRevision.current !== revision.current);
        if (mounted.current) setEdited(false);
      } catch (error) {
        if (mounted.current) {
          setEdited(true);
          setError(
            error instanceof Error
              ? error.message
              : "Draft could not be saved. Retry saving before leaving.",
          );
        }
        throw error;
      } finally {
        if (mounted.current) setSaving(false);
      }
    };
    const promise = work().finally(() => {
      inFlight.current = null;
    });
    inFlight.current = promise;
    return promise;
  }, [studentId, cadence]);
  function update(patch: Partial<JournalDraftValues>) {
    latest.current = { ...latest.current, ...patch };
    revision.current += 1;
    setForm(latest.current);
    setEdited(true);
    setError("");
  }
  function reset(values: JournalDraftValues) {
    if (inFlight.current)
      throw new Error("Wait for the current save to finish.");
    draftId.current = undefined;
    revision.current = 0;
    savedRevision.current = 0;
    latest.current = values;
    setForm(values);
    setActiveId(undefined);
    setEdited(false);
    setError("");
  }
  useEffect(() => {
    mounted.current = true;
    const unregister = registerNavigationGuard(async () => {
      if (inFlight.current) await inFlight.current;
      if (revision.current !== savedRevision.current) await save();
    });
    const warn = (event: BeforeUnloadEvent) => {
      if (revision.current !== savedRevision.current || inFlight.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      mounted.current = false;
      unregister();
      window.removeEventListener("beforeunload", warn);
    };
  }, [save]);
  useEffect(() => {
    if (!edited || error) return;
    const timer = setTimeout(() => {
      void save().catch(() => {});
    }, 750);
    return () => clearTimeout(timer);
  }, [form, edited, error, save]);
  return {
    form,
    update,
    save,
    reset,
    activeId,
    draftId,
    edited,
    saving,
    error,
    setError,
  };
}
