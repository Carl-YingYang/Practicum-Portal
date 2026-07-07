"use client";

import * as React from "react";
import { SlideOver } from "@/components/portal/shared/slide-over";
import { Avatar } from "@/components/portal/shared/avatar";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/use-app-store";
import { portalUsers } from "@/lib/mock-data";
import {
  getStudent,
  getSupervisor,
  getCompany,
  submissionsForUser,
  hoursPercent,
} from "@/lib/selectors";
import {
  Mail,
  Building2,
  Clock,
  GraduationCap,
  FileText,
  ExternalLink,
  Send,
  ClipboardList,
  Hourglass,
} from "lucide-react";
import { type Student, type Supervisor } from "@/lib/types";
import { format } from "date-fns";

/**
 * PersonDetailsSlideOver — a unified quick-look panel for either a student
 * or a supervisor. Shows their profile + recent form submissions + quick
 * actions (view full record / start a message). Opens from anywhere a
 * student or supervisor is mentioned (submissions queue, attention panels).
 */
export function PersonDetailsSlideOver({
  open,
  onOpenChange,
  studentId,
  supervisorId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  studentId?: string;
  supervisorId?: string;
}) {
  const navigate = useAppStore((s) => s.navigate);
  const students = useAppStore((s) => s.students);
  const supervisors = useAppStore((s) => s.supervisors);
  const companies = useAppStore((s) => s.companies);
  const formSubmissions = useAppStore((s) => s.formSubmissions);
  const formDocuments = useAppStore((s) => s.formDocuments);
  const journals = useAppStore((s) => s.journals);

  const student = studentId ? getStudent(students, studentId) : undefined;
  const supervisor = supervisorId ? getSupervisor(supervisors, supervisorId) : undefined;
  const company = (student ?? supervisor)?.companyId
    ? getCompany(companies, (student ?? supervisor)!.companyId)
    : undefined;

  // find the portal user record (for avatar color + email consistency)
  const portalUser = React.useMemo(() => {
    if (student) {
      return portalUsers.find((u) => u.studentId === student.id);
    }
    if (supervisor) {
      return portalUsers.find((u) => u.supervisorId === supervisor.id);
    }
    return undefined;
  }, [student, supervisor]);

  // for a student, find their supervisor and vice versa
  const studentSupervisor = student?.supervisorId ? getSupervisor(supervisors, student.supervisorId) : undefined;
  const supervisorStudents = supervisor ? students.filter((s) => s.supervisorId === supervisor.id) : [];

  // the portal user id for submission lookup
  const userIdForSubs = portalUser?.id;
  const userSubs = React.useMemo(() => {
    if (!userIdForSubs) return [];
    return submissionsForUser(formSubmissions, userIdForSubs).slice(0, 5);
  }, [formSubmissions, userIdForSubs]);

  // student journals
  const studentJournals = React.useMemo(() => {
    if (!student) return [];
    return journals.filter((j) => j.studentId === student.id).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 4);
  }, [journals, student]);

  if (!student && !supervisor) {
    return (
      <SlideOver open={open} onOpenChange={onOpenChange} title="Person not found" description="No record matches this id." >
        <div className="text-[12px] text-muted-foreground">Close this panel and try again.</div>
      </SlideOver>
    );
  }

  const name = (student ?? supervisor)!.name;
  const email = (student ?? supervisor)!.email;
  const avatarColor = portalUser?.avatarColor ?? "#64748b";
  const roleLabel = student ? "Student" : "Company Supervisor";

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={name}
      description={roleLabel}
      eyebrow={company?.name}
      headerActions={undefined}
    >
      <div className="space-y-4">
        {/* Identity card */}
        <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-card p-3.5">
          <Avatar name={name} size="lg" color={avatarColor} />
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold text-foreground">{name}</div>
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span className="truncate">{email}</span>
            </div>
            {company && (
              <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Building2 className="h-3 w-3" />
                {company.name}
              </div>
            )}
          </div>
        </div>

        {/* Student-specific stats */}
        {student && (
          <div className="grid grid-cols-2 gap-2">
            <StatTile
              icon={Hourglass}
              label="Hours progress"
              value={`${Math.round(hoursPercent(student))}%`}
              hint={`${student.loggedHours} / ${student.requiredHours} hrs`}
            />
            <StatTile
              icon={ClipboardList}
              label="Journals"
              value={String(journals.filter((j) => j.studentId === student.id).length)}
              hint={`${journals.filter((j) => j.studentId === student.id && j.status === "pending").length} pending review`}
            />
          </div>
        )}

        {/* Supervisor-specific stats */}
        {supervisor && (
          <div className="grid grid-cols-2 gap-2">
            <StatTile
              icon={GraduationCap}
              label="Assigned interns"
              value={String(supervisorStudents.length)}
              hint={`${supervisorStudents.filter((s) => s.status === "active").length} active`}
            />
            <StatTile
              icon={FileText}
              label="Form submissions"
              value={String(userSubs.length)}
              hint="Across all assigned forms"
            />
          </div>
        )}

        {/* Student details */}
        {student && (
          <div className="rounded-lg border border-border/60 bg-card p-3.5">
            <div className="grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-2">
              <DetailRow label="Student number" value={student.studentNumber} />
              <DetailRow label="Course" value={student.course} />
              <DetailRow label="Status" value={student.status === "active" ? "Active" : "Inactive"} />
              <DetailRow
                label="Supervisor"
                value={studentSupervisor?.name ?? "Unassigned"}
              />
            </div>
          </div>
        )}

        {/* Recent form submissions */}
        {userSubs.length > 0 && (
          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Recent form submissions
            </h3>
            <div className="space-y-1.5">
              {userSubs.map((sub) => {
                const form = formDocuments.find((f) => f.id === sub.formId);
                return (
                  <div
                    key={sub.id}
                    className="flex items-center gap-2 rounded-md border border-border/50 bg-card px-2.5 py-2 text-[12px]"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                      {form?.title ?? "Unknown form"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {sub.submittedAt ? format(new Date(sub.submittedAt), "MMM d") : "In progress"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Student recent journals */}
        {studentJournals.length > 0 && (
          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Recent journals
            </h3>
            <div className="space-y-1.5">
              {studentJournals.map((j) => (
                <div
                  key={j.id}
                  className="flex items-center gap-2 rounded-md border border-border/50 bg-card px-2.5 py-2 text-[12px]"
                >
                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {format(new Date(j.date), "MMM d, yyyy")} · {j.hours}h
                  </span>
                  <span className="text-[11px] capitalize text-muted-foreground">{j.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          {student && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                onOpenChange(false);
                navigate("coordinator.student-view", { studentId: student.id });
              }}
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open full record
            </Button>
          )}
          {supervisor && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                onOpenChange(false);
                navigate("coordinator.supervisor-view", { supervisorId: supervisor.id });
              }}
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open full record
            </Button>
          )}
          {(studentSupervisor || supervisor) && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => {
                onOpenChange(false);
                navigate("coordinator.messages");
              }}
            >
              <Send className="h-3.5 w-3.5" /> Message
            </Button>
          )}
        </div>
      </div>
    </SlideOver>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-2.5">
      <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-0.5 text-base font-semibold tabular-nums leading-tight">{value}</div>
      {hint && <div className="text-[10.5px] text-muted-foreground/80">{hint}</div>}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-[12.5px] font-medium text-foreground">{value}</div>
    </div>
  );
}
