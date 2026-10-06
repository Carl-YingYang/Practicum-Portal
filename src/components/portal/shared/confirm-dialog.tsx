"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BottomSheet } from "@/components/portal/shared/bottom-sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import * as React from "react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  destructive?: boolean;
  children?: React.ReactNode; // extra content (e.g., reason textarea)
}

/**
 * ConfirmDialog — responsive confirmation modal.
 *
 * Per Responsive Contract §2.13:
 *  - On mobile (`< md`): renders as a BottomSheet (thumb-friendly, slides up).
 *  - On desktop (`>= md`): renders as a centered AlertDialog.
 *  - Same API either way: title, description, optional extra children,
 *    confirm + cancel actions.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  destructive,
  children,
}: ConfirmDialogProps) {
  const isMobile = useIsMobile();
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const lock = React.useRef(false);
  async function confirm(event?: React.MouseEvent) {
    event?.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    setError("");
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The change could not be saved. Please retry.",
      );
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  function changeOpen(next: boolean) {
    if (lock.current) return;
    setError("");
    onOpenChange(next);
  }

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={changeOpen}
        title={title}
        description={description}
        maxHeight={90}
      >
        <div className="space-y-4 pb-4">
          {children}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              disabled={saving}
              variant="outline"
              onClick={() => changeOpen(false)}
            >
              {cancelLabel}
            </Button>
            <Button
              disabled={saving}
              onClick={confirm}
              className={cn(
                destructive &&
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}
            >
              {saving ? "Saving…" : confirmLabel}
            </Button>
          </div>
        </div>
      </BottomSheet>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={changeOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground">{description}</div>
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        {children}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={saving}
            onClick={confirm}
            className={cn(
              destructive &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            )}
          >
            {saving ? "Saving…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
