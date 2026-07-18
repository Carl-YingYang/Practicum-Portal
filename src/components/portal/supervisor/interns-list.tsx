"use client";

import { useMemo, useState } from "react";
import { Search, Users, FileSpreadsheet } from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import {
  studentsForSupervisor,
  evaluationsForStudent,
  averageScore,
  getCompany,
  hoursPercent,
} from "@/lib/selectors";
import { PageHeader } from "@/components/portal/layout/page-header";
import { InternCard } from "@/components/portal/shared/intern-card";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadCsv } from "@/lib/client-pdf";
import { toast } from "sonner";

export function InternsList() {
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const evaluations = useAppStore((s) => s.evaluations);
  const companies = useAppStore((s) => s.companies);
  const schoolIdentity = useAppStore((s) => s.schoolIdentity);
  const navigate = useAppStore((s) => s.navigate);

  const supervisorId = currentUser?.supervisorId ?? "";
  const [query, setQuery] = useState("");

  const interns = useMemo(
    () => studentsForSupervisor(students, supervisorId),
    [students, supervisorId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return interns;
    return interns.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.studentNumber.toLowerCase().includes(q)
    );
  }, [interns, query]);

  /** Export the filtered interns to CSV. */
  const handleExportCsv = () => {
    if (filtered.length === 0) {
      toast.error("No interns to export.");
      return;
    }
    const head = [
      "Student",
      "Student Number",
      "Course",
      "Company",
      "Email",
      "Required Hours",
      "Logged Hours",
      "Completion %",
      "Last Evaluation",
      "Status",
    ];
    const body = filtered.map((s) => {
      const studentEvals = evaluationsForStudent(evaluations, s.id).filter(
        (e) => e.supervisorId === supervisorId
      );
      const submitted = studentEvals.find((e) => e.status === "submitted");
      const lastScore = submitted ? averageScore(submitted) : 0;
      const pct = hoursPercent(s);
      const status = submitted
        ? "Evaluated"
        : studentEvals.find((e) => e.status === "draft")
          ? "Draft"
          : "Pending";
      return [
        s.name,
        s.studentNumber,
        s.course,
        getCompany(companies, s.companyId)?.name ?? "—",
        s.email,
        String(s.requiredHours),
        String(s.loggedHours),
        `${pct}%`,
        lastScore > 0 ? lastScore.toFixed(2) : "—",
        status,
      ];
    });
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `my-interns-${stamp}.csv`;
    downloadCsv(filename, head, body);
    toast.success("CSV exported", {
      description: `${filtered.length} interns exported to ${filename}.`,
    });
  };

  return (
    <div>
      <PageHeader
        title="My Interns"
        description="All interns assigned to your supervision."
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button
              variant="outline"
              onClick={handleExportCsv}
              disabled={filtered.length === 0}
              className="w-full sm:w-auto"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export CSV
            </Button>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or student #…"
                className="pl-9"
                aria-label="Search interns"
              />
            </div>
          </div>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={query ? "No matches found" : "No interns assigned"}
          description={
            query
              ? "Try a different search term."
              : "You don't have any interns assigned to you yet."
          }
          tone={query ? "slate" : "amber"}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => {
            const studentEvals = evaluationsForStudent(evaluations, s.id).filter(
              (e) => e.supervisorId === supervisorId
            );
            const submitted = studentEvals.find((e) => e.status === "submitted");
            const draft = studentEvals.find((e) => e.status === "draft");
            return (
              <InternCard
                key={s.id}
                student={s}
                companyName={getCompany(companies, s.companyId)?.name}
                schoolName={schoolIdentity.shortName}
                lastScore={submitted ? averageScore(submitted) : undefined}
                hasEvaluation={!!submitted}
                onOpen={() =>
                  navigate("supervisor.intern-view", { studentId: s.id })
                }
                onEvaluate={() => {
                  if (submitted) {
                    navigate("supervisor.intern-view", { studentId: s.id });
                  } else if (draft) {
                    navigate("supervisor.evaluation-new", {
                      evaluationId: draft.id,
                    });
                  } else {
                    navigate("supervisor.evaluation-new", {
                      preselectStudentId: s.id,
                    });
                  }
                }}
                evaluateLabel={submitted ? "View" : draft ? "Edit Draft" : "Evaluate"}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
