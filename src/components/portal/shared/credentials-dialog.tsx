"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { BottomSheet } from "@/components/portal/shared/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, KeyRound, AlertCircle, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { ROLE_LABELS, type Role } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  email: string;
  tempPassword: string;
  /** Account role — shown as a chip when provided. */
  role?: Role;
  /** Prototype account id (User ID) — shown when provided. */
  userId?: string;
  onDone: () => void;
  purpose?: "created" | "reset";
}

/**
 * CredentialsDialog — responsive one-time credentials reveal.
 *
 * Reveals newly generated credentials only after a confirmed server save.
 * Existing passwords are never retrieved. Deliver these details privately.
 *
 * Per Responsive Contract §2.13:
 *  - Mobile (`< md`): BottomSheet (slides up, thumb-reachable copy buttons).
 *  - Desktop (`>= md`): centered Dialog.
 */
export function CredentialsDialog({
  open,
  onOpenChange,
  name,
  email,
  tempPassword,
  role,
  userId,
  onDone,
  purpose = "created",
}: CredentialsDialogProps) {
  const isMobile = useIsMobile();
  const [copied, setCopied] = React.useState<string | null>(null);

  const copy = async (text: string, which: string, label: string) => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      setCopied(which);
      toast.success(`Copied ${label}`);
      setTimeout(() => setCopied(null), 1500);
    } catch { toast.error("Could not copy. Select and copy the value manually."); }
  };

  const copyAll = () => {
    const lines = [
      `Name: ${name}`,
      `Email: ${email}`,
      ...(userId ? [`User ID: ${userId}`] : []),
      ...(role ? [`Role: ${ROLE_LABELS[role]}`] : []),
      `Temporary password: ${tempPassword}`,
      "",
      "Note: this temporary password must be changed at first sign-in.",
    ];
    void copy(lines.join("\n"), "all", "credentials");

  };

  const rows: { key: string; label: string; value: string; mono?: boolean }[] =
    [
      { key: "name", label: "Name", value: name },
      { key: "email", label: "Email", value: email },
      ...(userId
        ? [{ key: "uid", label: "User ID", value: userId, mono: true }]
        : []),
      {
        key: "pass",
        label: "Temporary password",
        value: tempPassword,
        mono: true,
      },
    ];

  const body = (
    <div className="space-y-3 py-1">
      {role && (
        <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/30 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">Role</p>
            <p className="text-sm font-medium text-foreground">
              {ROLE_LABELS[role]}
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
            {ROLE_LABELS[role]}
          </span>
        </div>
      )}
      {rows.map((row) => (
        <div key={row.key} className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{row.label}</Label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={row.value}
              className={cn(row.mono ? "font-mono text-sm" : "text-sm")}
              aria-label={row.label}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copy(row.value, row.key, row.label.toLowerCase())}
              aria-label={`Copy ${row.label.toLowerCase()}`}
              className="shrink-0"
            >
              {copied === row.key ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      ))}
      <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Shown only once. The user must change this temporary password at
          first sign-in. Give these details privately to the account owner. If lost,
          reset access to generate a replacement.
        </span>
      </div>
    </div>
  );

  const footer = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button variant="outline" onClick={copyAll} className="w-full sm:w-auto">
        <ClipboardList className="h-4 w-4" />
        Copy all credentials
      </Button>
      <Button
        onClick={() => {
          onOpenChange(false);
          onDone();
        }}
        className="w-full sm:w-auto"
      >
        Done
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={purpose === "reset" ? "Access reset — copy credentials" : "Account created — copy credentials"}
        description={
          <>
            Login details for{" "}
            <span className="font-medium text-foreground">{name}</span>. Hand
            them to the user securely.
          </>
        }
        maxHeight={90}
      >
        <div className="space-y-4 pb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          {body}
          {footer}
        </div>
      </BottomSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <DialogTitle>{purpose === "reset" ? "Access reset — copy credentials" : "Account created — copy credentials"}</DialogTitle>
          <DialogDescription>
            Login details for{" "}
            <span className="font-medium text-foreground">{name}</span>. Hand
            them to the user securely.
          </DialogDescription>
        </DialogHeader>
        {body}
        <div className="mt-2">{footer}</div>
      </DialogContent>
    </Dialog>
  );
}
