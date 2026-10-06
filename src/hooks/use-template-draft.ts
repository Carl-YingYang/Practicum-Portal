"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { registerNavigationGuard } from "@/client/navigation-guard";
import { reportRequest } from "@/client/reports";
import type { TemplateContent, TemplateRecord } from "@/domain/templates/model";
export function useTemplateDraft(initial: TemplateRecord, accountId: string) {
  const [report, setReport] = useState(initial),
    [content, setContent] = useState(initial.content),
    [sequence, setSequence] = useState(0),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [edited, setEdited] = useState(false);
  const latest = useRef(initial.content),
    savedRevision = useRef(initial.revision),
    dirty = useRef(false),
    serial = useRef(0),
    inFlight = useRef<Promise<void> | null>(null),
    mounted = useRef(true);
  const recoveryKey = `practo:template-draft:${accountId}:${initial.id}`;
  const [recovery, setRecovery] = useState<TemplateContent | null>(null);
  useEffect(() => {
    mounted.current = true;
    try {
      const cached = JSON.parse(localStorage.getItem(recoveryKey) ?? "null");
      if (
        cached?.content &&
        JSON.stringify(cached.content) !== JSON.stringify(initial.content)
      )
        queueMicrotask(() => {
          if (mounted.current) setRecovery(cached.content);
        });
    } catch {
      /* Missing/invalid cache does not affect saved content. */
    }
    return () => {
      mounted.current = false;
    };
  }, [recoveryKey, initial.content]);
  const change = useCallback(
    (next: TemplateContent) => {
      latest.current = next;
      dirty.current = true;
      serial.current++;
      setContent(next);
      setSequence(serial.current);
      setEdited(true);
      setError("");
      try {
        localStorage.setItem(
          recoveryKey,
          JSON.stringify({ revision: savedRevision.current, content: next }),
        );
      } catch {
        setError(
          "Browser draft recovery is unavailable. Save before closing this tab.",
        );
      }
    },
    [recoveryKey],
  );
  const save = useCallback((): Promise<void> => {
    if (inFlight.current) return inFlight.current;
    if (!dirty.current) return Promise.resolve();
    const work = async () => {
      if (mounted.current) {
        setSaving(true);
        setError("");
      }
      try {
        do {
          const capture = serial.current;
          const next = await reportRequest<TemplateRecord>(
            `/api/templates/${initial.id}`,
            "PUT",
            { revision: savedRevision.current, content: latest.current },
          );
          savedRevision.current = next.revision;
          if (mounted.current) setReport(next);
          if (capture === serial.current) {
            latest.current = next.content;
            dirty.current = false;
            if (mounted.current) {
              setContent(next.content);
              setEdited(false);
            }
            try {
              localStorage.removeItem(recoveryKey);
            } catch {}
          }
        } while (dirty.current);
      } catch (e) {
        if (mounted.current)
          setError(e instanceof Error ? e.message : "Could not save template.");
        throw e;
      } finally {
        if (mounted.current) setSaving(false);
      }
    };
    inFlight.current = work().finally(() => {
      inFlight.current = null;
    });
    return inFlight.current;
  }, [initial.id, recoveryKey]);
  useEffect(() => {
    if (!dirty.current) return;
    const timer = setTimeout(() => {
      void save().catch(() => {});
    }, 900);
    return () => clearTimeout(timer);
  }, [sequence, save]);
  useEffect(() => registerNavigationGuard(save), [save]);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (dirty.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, []);
  const accept = useCallback((next: TemplateRecord) => {
    savedRevision.current = next.revision;
    latest.current = next.content;
    dirty.current = false;
    setReport(next);
    setContent(next.content);
    setEdited(false);
    setError("");
  }, []);
  return {
    report,
    content,
    change,
    save,
    accept,
    saving,
    error,
    dirty: edited,
    recovery,
    restore: () => {
      if (recovery) {
        change(recovery);
        setRecovery(null);
      }
    },
    discardRecovery: () => {
      try {
        localStorage.removeItem(recoveryKey);
      } catch {}
      setRecovery(null);
    },
    revision: () => savedRevision.current,
  };
}
