"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { ROLE_LABELS } from "@/lib/types";
import { formatDate } from "@/lib/selectors";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { Avatar } from "@/components/portal/shared/avatar";
import { RoleBadge } from "@/components/portal/shared/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mail,
  ShieldCheck,
  KeyRound,
  LogOut,
  Building2,
  Users,
  UserSquare2,
  ClipboardCheck,
  NotebookText,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";

export function CoordinatorProfile() {
  const currentUser = useAppStore((s) => s.currentUser);
  const logout = useAppStore((s) => s.logout);
  const students = useAppStore((s) => s.students);
  const supervisors = useAppStore((s) => s.supervisors);
  const evaluations = useAppStore((s) => s.evaluations);
  const journals = useAppStore((s) => s.journals);

  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNext, setShowNext] = React.useState(false);

  if (!currentUser) return null;

  const submittedEvals = evaluations.filter((e) => e.status === "submitted").length;
  const approvedJournals = journals.filter((j) => j.status === "approved").length;

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || !next || !confirm) {
      toast.error("Fill in all password fields.");
      return;
    }
    if (next !== confirm) {
      toast.error("New password and confirmation do not match.");
      return;
    }
    if (next.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    toast.success("Password updated", {
      description: "Use your new password the next time you sign in.",
    });
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  const handleLogout = () => {
    toast.success("Signed out");
    logout();
  };

  const stats = [
    { label: "Students", value: students.length, icon: Users },
    { label: "Supervisors", value: supervisors.length, icon: UserSquare2 },
    { label: "Companies", value: 5, icon: Building2 },
    { label: "Submitted Evals", value: submittedEvals, icon: ClipboardCheck },
    { label: "Approved Journals", value: approvedJournals, icon: NotebookText },
  ];

  return (
    <div>
      <PageHeader
        title="My Profile"
        description="Coordinator account and cohort overview."
        breadcrumb="Profile"
        actions={
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Account */}
        <SectionCard title="My Account" className="lg:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Avatar name={currentUser.name} size="xl" color={currentUser.avatarColor} />
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">{currentUser.name}</h2>
                <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <RoleBadge role={currentUser.role} solid />
                  <span className="text-xs text-muted-foreground">
                    Practicum Coordinator · Term 2024-2025
                  </span>
                </div>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{currentUser.email}</span>
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  Account ID: <span className="font-mono">{currentUser.id}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Cohort stats */}
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-3 lg:grid-cols-5">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="rounded-md border border-border bg-muted/20 px-3 py-2.5"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
                    {s.value}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Change password */}
        <SectionCard
          title="Change Password"
          description="For this demo, password changes are not persisted."
        >
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <Label className="mb-1.5">Current Password</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  placeholder="••••••••"
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showCurrent ? "Hide password" : "Show password"}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="mb-1.5">New Password</Label>
              <div className="relative">
                <Input
                  type={showNext ? "text" : "password"}
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  placeholder="At least 6 characters"
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowNext((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showNext ? "Hide password" : "Show password"}
                >
                  {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="mb-1.5">Confirm New Password</Label>
              <Input
                type={showNext ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter new password"
              />
            </div>
            <Button type="submit" className="w-full">
              <KeyRound className="h-4 w-4" />
              Update Password
            </Button>
          </form>
        </SectionCard>
      </div>

      {/* Account meta */}
      <SectionCard title="Session" className="mt-4">
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Role
            </p>
            <p className="mt-0.5 font-medium text-foreground">
              {ROLE_LABELS[currentUser.role]}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Account created
            </p>
            <p className="mt-0.5 font-medium text-foreground">
              {formatDate("2024-08-15T08:00:00.000Z")}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Active term
            </p>
            <p className="mt-0.5 font-medium text-foreground">2024-2025</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end border-t border-border pt-4">
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign out of portal
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
