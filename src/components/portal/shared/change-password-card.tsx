"use client";
import * as React from "react";
import { updateOwnPassword } from "@/client/portal-client";
import { SectionCard } from "./section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";

export function ChangePasswordCard() {
  const id = React.useId();
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [visible, setVisible] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const locked = React.useRef(false);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (locked.current) return;
    setError("");
    if (!current || !next || !confirm) {
      setError("Complete all password fields.");
      return;
    }
    if (next.length < 8 || !/[A-Z]/.test(next) || !/[0-9]/.test(next)) {
      setError("Use at least 8 characters, one capital letter and one number.");
      return;
    }
    if (next === current) {
      setError("Choose a different password.");
      return;
    }
    if (next !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    locked.current = true;
    setSaving(true);
    try {
      await updateOwnPassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("Password updated", {
        description: "Your other sessions have been signed out.",
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Password could not be saved.",
      );
    } finally {
      locked.current = false;
      setSaving(false);
    }
  }
  return (
    <SectionCard
      title="Change password"
      description="Update your personal password. Your coordinator still manages account access."
    >
      <form onSubmit={save} className="space-y-4" aria-busy={saving}>
        <fieldset disabled={saving} className="min-w-0 space-y-3">
          {[
            {
              key: "current",
              label: "Current password",
              value: current,
              change: setCurrent,
              autocomplete: "current-password",
            },
            {
              key: "new",
              label: "New password",
              value: next,
              change: setNext,
              autocomplete: "new-password",
            },
            {
              key: "confirm",
              label: "Confirm new password",
              value: confirm,
              change: setConfirm,
              autocomplete: "new-password",
            },
          ].map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={`${id}-${field.key}`}>{field.label}</Label>
              <Input
                id={`${id}-${field.key}`}
                type={visible ? "text" : "password"}
                autoComplete={field.autocomplete}
                value={field.value}
                onChange={(event) => field.change(event.target.value)}
                maxLength={field.key === "current" ? 256 : 128}
                aria-describedby={`${id}-requirements`}
                required
              />
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setVisible(!visible)}
            aria-pressed={visible}
          >
            {visible ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {visible ? "Hide passwords" : "Show passwords"}
          </Button>
        </fieldset>
        <p id={`${id}-requirements`} className="text-xs text-muted-foreground">
          At least 8 characters, one capital letter and one number.
        </p>
        {error && (
          <p role="alert" className="break-words text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={saving} className="w-full">
          <KeyRound className="h-4 w-4" />
          {saving ? "Saving password…" : "Update password"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Forgot your password? Ask your coordinator to reset access.
        </p>
      </form>
    </SectionCard>
  );
}
