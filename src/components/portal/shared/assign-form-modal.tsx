"use client";

import { flushChanges } from "@/client/portal-client";
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  CalendarClock,
  Users,
  GraduationCap,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";
import { useToast } from "@/hooks/use-toast";
import {
  type FormAssignmentTarget,
  type FormDocument,
  FORM_CATEGORY_LABELS,
} from "@/lib/types";
import { useAccountUsers } from "@/lib/use-account-users";
import { format } from "date-fns";

const targetOptions: {
  value: FormAssignmentTarget;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: "all_supervisors",
    label: "All Company Supervisors",
    description: "Every active supervisor will see this form.",
    icon: Users,
  },
  {
    value: "all_students",
    label: "All Students",
    description: "Every active student will see this form.",
    icon: GraduationCap,
  },
  {
    value: "specific_users",
    label: "Specific people",
    description: "Choose the students or supervisors who should respond.",
    icon: UserCheck,
  },
];

/**
 * AssignFormModal — assign a published form to a target audience,
 * optionally with a due date. Used from the coordinator Forms hub.
 */
export function AssignFormModal({
  open,
  onOpenChange,
  form,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: FormDocument | null;
}) {
  const { toast } = useToast();
  const users = useAccountUsers().filter(
    (u) => u.role !== "coordinator" && u.accountStatus !== "disabled",
  );
  const [recipients, setRecipients] = React.useState<string[]>([]);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");
  const assignForm = useAppStore((s) => s.assignForm);
  const [target, setTarget] =
    React.useState<FormAssignmentTarget>("all_supervisors");
  const [dueDate, setDueDate] = React.useState<string>("");

  React.useEffect(() => {
    if (open) {
      // pick a sensible default based on category
      setTarget(
        form?.category === "journal" || form?.category === "program"
          ? "all_students"
          : "all_supervisors",
      );
      setDueDate("");
      setRecipients([]);
      setError("");
    }
  }, [open, form?.category]);

  async function handleAssign() {
    if (!form || (target === "specific_users" && recipients.length === 0))
      return;
    if (pending) return;
    setPending(true);
    setError("");
    try {
      assignForm({
        formId: form.id,
        target,
        targetUserIds: recipients,
        dueDate: dueDate || undefined,
      });
      await flushChanges();
      onOpenChange(false);
      const tLabel = targetOptions
        .find((t) => t.value === target)
        ?.label.toLowerCase();
      toast({
        title: "Form assigned",
        description: `"${form.title}" assigned to ${tLabel}. They'll see it in their Forms inbox immediately.`,
      });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not assign form. Retry with your selected recipients.",
      );
    } finally {
      setPending(false);
    }
  }

  if (!form) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogHeader>
          <DialogTitle className="text-base">Assign form</DialogTitle>
          <DialogDescription className="text-xs">
            Choose who should fill{" "}
            <span className="font-medium text-foreground">{form.title}</span> (
            {FORM_CATEGORY_LABELS[form.category]}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>Assign to</Label>
            <div className="grid grid-cols-1 gap-1.5">
              {targetOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTarget(opt.value)}
                    className={cn(
                      "flex items-start gap-2.5 rounded-md border px-3 py-2 text-left transition-colors",
                      target === opt.value
                        ? "border-primary bg-primary/5 ring-1 ring-inset ring-primary/30"
                        : "border-border/60 hover:bg-muted/40",
                    )}
                  >
                    <Icon
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        target === opt.value
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-foreground">
                        {opt.label}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {opt.description}
                      </div>
                    </div>
                    {target === opt.value && (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {target === "specific_users" && (
            <fieldset className="max-h-52 overflow-auto border border-border p-2">
              <legend className="px-1 text-xs font-medium">
                Recipients ({recipients.length})
              </legend>
              {users.map((u) => (
                <label
                  key={u.id}
                  className="flex min-h-11 cursor-pointer items-center gap-3 px-2 text-sm hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={recipients.includes(u.id)}
                    onChange={(e) =>
                      setRecipients((ids) =>
                        e.target.checked
                          ? [...ids, u.id]
                          : ids.filter((id) => id !== u.id),
                      )
                    }
                  />
                  <span className="min-w-0">
                    <span className="block truncate">{u.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {u.role} · {u.email}
                    </span>
                  </span>
                </label>
              ))}
              {users.length === 0 && (
                <p className="p-2 text-sm text-muted-foreground">
                  No active recipients.
                </p>
              )}
            </fieldset>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="afm-due">
              Due date{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <Input
                id="afm-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 max-w-[180px]"
              />
              {dueDate && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] text-muted-foreground"
                  onClick={() => setDueDate("")}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            disabled={
              pending ||
              (target === "specific_users" && recipients.length === 0)
            }
            onClick={() => void handleAssign()}
            className="gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" /> Assign form
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
