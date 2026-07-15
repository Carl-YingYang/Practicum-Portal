"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import {
  studentsForSupervisor,
  evaluationsForStudent,
  averageScore,
  getCompany,
} from "@/lib/selectors";
import { PageHeader } from "@/components/portal/layout/page-header";
import { InternCard } from "@/components/portal/shared/intern-card";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { Input } from "@/components/ui/input";

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

  return (
    <div>
      <PageHeader
        title="My Interns"
        description="All interns assigned to your supervision."
        actions={
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
