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
import { Copy, Check, KeyRound, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface CredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  email: string;
  tempPassword: string;
  onDone: () => void;
}

/**
 * CredentialsDialog — responsive one-time credentials reveal.
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
  onDone,
}: CredentialsDialogProps) {
  const isMobile = useIsMobile();
  const [copied, setCopied] = React.useState<"email" | "pass" | null>(null);

  const copy = (text: string, which: "email" | "pass") => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(which);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const body = (
    <div className="space-y-3 py-2">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Email</Label>
        <div className="flex gap-2">
          <Input readOnly value={email} className="font-mono text-sm" />
          <Button
            variant="outline"
            size="icon"
            onClick={() => copy(email, "email")}
            aria-label="Copy email"
          >
            {copied === "email" ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Temporary password</Label>
        <div className="flex gap-2">
          <Input readOnly value={tempPassword} className="font-mono text-sm" />
          <Button
            variant="outline"
            size="icon"
            onClick={() => copy(tempPassword, "pass")}
            aria-label="Copy password"
          >
            {copied === "pass" ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          The user will be asked to change this password on first sign-in. We
          can&apos;t recover it for you later — store it somewhere safe.
        </span>
      </div>
    </div>
  );

  const footer = (
    <div className="flex justify-end">
      <Button
        onClick={() => {
          onOpenChange(false);
          onDone();
        }}
      >
        I&apos;ve copied the details
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Account created — copy credentials"
        description={
          <>
            These login details for{" "}
            <span className="font-medium text-foreground">{name}</span> are shown
            only once. Hand them to the user securely.
          </>
        }
        maxHeight={90}
      >
        <div className="space-y-4 pb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-950/60">
            <KeyRound className="h-5 w-5 text-teal-700 dark:text-teal-300" />
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
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-950/60">
            <KeyRound className="h-5 w-5 text-teal-700 dark:text-teal-300" />
          </div>
          <DialogTitle>Account created — copy credentials</DialogTitle>
          <DialogDescription>
            These login details for <span className="font-medium text-foreground">{name}</span> are
            shown only once. Hand them to the user securely.
          </DialogDescription>
        </DialogHeader>
        {body}
        {footer}
      </DialogContent>
    </Dialog>
  );
}
