"use client";
import * as React from "react";
import { changePassword } from "@/client/portal-client";
import { useAppStore } from "@/store/use-app-store";
import { ROLE_LABELS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  GraduationCap,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Check,
  X,
  Info,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
/**
 * FirstLoginPasswordChange — focused prototype gate shown after signing in
 * with a one-time temporary (Invited) password. The user sets a personal
 * password before reaching their dashboard.
 *
 * Honest scope: the "change" only mutates in-memory mock state so the flow is
 * demonstrable end-to-end. It is shaped to map 1:1 onto a future Supabase
 * Auth password update — no fake backend, no exposed secrets.
 */
interface Requirement {
  key: "length" | "uppercase" | "number";
  label: string;
  test: (value: string) => boolean;
}
const REQUIREMENTS: Requirement[] = [
  { key: "length", label: "At least 8 characters", test: (v) => v.length >= 8 },
  {
    key: "uppercase",
    label: "One uppercase letter (A–Z)",
    test: (v) => /[A-Z]/.test(v),
  },
  { key: "number", label: "One number (0–9)", test: (v) => /[0-9]/.test(v) },
];
export function FirstLoginPasswordChange() {
  const currentUser = useAppStore((s) => s.currentUser);
  const complete = changePassword;
  const logout = useAppStore((s) => s.logout);
  const [temp, setTemp] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showTemp, setShowTemp] = React.useState(false);
  const [showNext, setShowNext] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const tempRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    tempRef.current?.focus();
  }, []);
  if (!currentUser) return null;
  const requirementState = (key: Requirement["key"]) => {
    const req = REQUIREMENTS.find((r) => r.key === key)!;
    return req.test(next);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const nextErrors: Record<string, string> = {};
    if (!temp)
      nextErrors.temp = "Enter the temporary password from your coordinator.";
    if (!next) nextErrors.next = "Choose a new password.";
    else if (!REQUIREMENTS.every((r) => r.test(next)))
      nextErrors.next = "New password doesn't meet all requirements yet.";
    if (!confirm) nextErrors.confirm = "Re-enter your new password.";
    else if (next && confirm !== next)
      nextErrors.confirm = "Passwords don't match.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSubmitting(true);
    const result = await complete(temp, next);
    setSubmitting(false);
    if (result.ok) {
      toast.success("Password updated — welcome aboard!", {
        description:
          "Your account is now active. Redirecting to your dashboard…",
      });
      return;
    }
    if (result.reason === "bad-temp") {
      setErrors({
        temp: "That temporary password doesn't match. Check the credentials your coordinator gave you.",
      });
    } else if (result.reason === "weak-password") {
      setErrors({ next: "New password must be at least 8 characters." });
    } else {
      setErrors({
        temp: "Something went wrong. Please try signing in again.",
      });
    }
  };
  return (
    <div
      className="flex min-h-screen flex-col bg-background"
      style={{
        // Re-assert the default Azure palette for consistency with the login page.
        ["--primary" as string]: "#266ca9",
        ["--ring" as string]: "#266ca9",
      }}
    >
      {/* Compact brand strip — consistent with the login screen */}
      <header className="border-b border-border/60 px-4 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-[480px] items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground elev-sm">
            <GraduationCap className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <p className="font-heading text-sm font-bold leading-tight text-foreground">
              Practicum Management
            </p>
            <p className="text-[11px] leading-tight text-muted-foreground">
              First sign-in — secure your account
            </p>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-[480px]">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <KeyRound className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Set your new password
              </h1>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Welcome,{" "}
                <span className="font-medium text-foreground">
                  {currentUser.name}
                </span>
                . Your account was created with a temporary password — choose a
                new one to activate your account.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground ring-1 ring-inset ring-border/60">
                  {ROLE_LABELS[currentUser.role]}
                </span>
                <span className="truncate">{currentUser.email}</span>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-4 rounded-md border border-border/70 bg-card p-5 elev-xs sm:p-6"
          >
            <PasswordField
              id="temp-password"
              label="Temporary password"
              hint="Given to you by your practicum coordinator."
              value={temp}
              onChange={(v) => {
                setTemp(v);
                if (errors.temp) setErrors((e) => ({ ...e, temp: "" }));
              }}
              visible={showTemp}
              onToggleVisible={() => setShowTemp((s) => !s)}
              error={errors.temp}
              inputRef={tempRef}
              autoComplete="current-password"
            />

            <div className="border-t border-border/60 pt-4">
              <PasswordField
                id="new-password"
                label="New password"
                value={next}
                onChange={(v) => {
                  setNext(v);
                  if (errors.next) setErrors((e) => ({ ...e, next: "" }));
                }}
                visible={showNext}
                onToggleVisible={() => setShowNext((s) => !s)}
                error={errors.next}
                autoComplete="new-password"
              />
              <ul className="mt-2 space-y-1" aria-label="Password requirements">
                {REQUIREMENTS.map((r) => {
                  const met = requirementState(r.key);
                  return (
                    <li
                      key={r.key}
                      className={cn(
                        "flex items-center gap-1.5 text-xs",
                        met
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground",
                      )}
                    >
                      {met ? (
                        <Check
                          className="h-3.5 w-3.5"
                          strokeWidth={2.5}
                          aria-hidden
                        />
                      ) : (
                        <X
                          className="h-3.5 w-3.5"
                          strokeWidth={2}
                          aria-hidden
                        />
                      )}
                      <span>{r.label}</span>
                      <span className="sr-only">
                        {met ? "requirement met" : "requirement not met yet"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <PasswordField
              id="confirm-password"
              label="Confirm new password"
              value={confirm}
              onChange={(v) => {
                setConfirm(v);
                if (errors.confirm) setErrors((e) => ({ ...e, confirm: "" }));
              }}
              visible={showConfirm}
              onToggleVisible={() => setShowConfirm((s) => !s)}
              error={errors.confirm}
              autoComplete="new-password"
            />

            <Button
              type="submit"
              size="lg"
              className="h-11 w-full"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Updating password…
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Update password &amp; continue
                </>
              )}
            </Button>

            <p className="flex items-start gap-2 rounded-md bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>
                Your new password is securely hashed on the server. Keep it
                private and use it for your next sign-in.
              </span>
            </p>
          </form>

          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-muted-foreground"
              onClick={() => {
                toast.success("Signed out");
                logout();
              }}
            >
              <LogOut className="h-3.5 w-3.5" />
              Not you? Sign out
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
function PasswordField({
  id,
  label,
  hint,
  value,
  onChange,
  visible,
  onToggleVisible,
  error,
  autoComplete,
  inputRef,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  error?: string;
  autoComplete?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[13px] font-medium">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          ref={inputRef}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          className="h-11 pr-11"
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button
          type="button"
          onClick={onToggleVisible}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={
            visible
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
        >
          {visible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
