"use client";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/use-app-store";
import { flushChanges } from "@/client/portal-client";
import { createEditorHistory } from "@/domain/editor-history";
import {
  formDraftContent,
  formDraftSignature,
} from "@/domain/forms/response-form";
import type { FormDocument } from "@/lib/types";
export function useFormEditorHistory(form: FormDocument | undefined) {
  const history = useRef<ReturnType<
    typeof createEditorHistory<ReturnType<typeof formDraftContent>>
  > | null>(null);
  const scope = useRef("");
  const replaying = useRef(false);
  const [availability, setAvailability] = useState({
    canUndo: false,
    canRedo: false,
  });
  function updateAvailability() {
    setAvailability({
      canUndo: !!history.current?.canUndo,
      canRedo: !!history.current?.canRedo,
    });
  }
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!form) return;
    const key = `${form.id}:${form.version}:${form.status}`;
    if (scope.current !== key) {
      scope.current = key;
      history.current = createEditorHistory(formDraftContent(form));
    } else if (!replaying.current && form.status === "draft") {
      const focus = document.activeElement;
      const group =
        focus instanceof HTMLInputElement ||
        focus instanceof HTMLTextAreaElement
          ? focus.id ||
            focus.getAttribute("aria-label") ||
            focus.getAttribute("placeholder") ||
            "text"
          : "";
      history.current?.record(formDraftContent(form), group);
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) updateAvailability();
    });
    return () => {
      cancelled = true;
    };
  }, [form]);
  async function replay(direction: "undo" | "redo") {
    if (!form || busy || !history.current) return;
    setBusy(true);
    setError("");
    try {
      const expected = formDraftSignature(history.current.present);
      await flushChanges();
      const current = useAppStore
        .getState()
        .formDocuments.find((f) => f.id === form.id);
      if (!current || formDraftSignature(current) !== expected)
        throw Error(
          "Draft changed. Reload before undoing to protect newer edits.",
        );
      const next = history.current[direction]();
      if (!next) return;
      replaying.current = true;
      useAppStore.getState().replaceFormDraft(form.id, expected, next);
      await flushChanges();
    } catch (e) {
      setError((e as Error).message);
      const current = useAppStore
        .getState()
        .formDocuments.find((f) => f.id === form.id);
      if (current) history.current.reset(formDraftContent(current));
    } finally {
      replaying.current = false;
      setBusy(false);
      updateAvailability();
    }
  }
  return {
    ...availability,
    busy,
    error,
    undo: () => replay("undo"),
    redo: () => replay("redo"),
  };
}
