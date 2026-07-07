"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { getSupervisor } from "@/lib/selectors";
import { BottomSheet } from "@/components/portal/shared/bottom-sheet";
import { SupervisorPicker } from "@/components/portal/shared/supervisor-picker";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Student } from "@/lib/types";

interface ReassignSupervisorSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** The student being reassigned. */
  student: Student | null;
  /** Optional: list of students for bulk-assign. Overrides `student` if provided. */
  students?: Student[];
  onDone?: () => void;
}

/**
 * ReassignSupervisorSheet — bottom-sheet wrapper around the SupervisorPicker.
 *
 * Single-student mode: reassign one student's supervisor.
 * Bulk mode: assign the same supervisor to multiple students at once.
 *
 * Pre-filters the picker to the student's department so the best matches
 * surface first.
 */
export function ReassignSupervisorSheet({
  open,
  onOpenChange,
  student,
  students: bulkStudents,
  onDone,
}: ReassignSupervisorSheetProps) {
  const updateStudent = useAppStore((s) => s.updateStudent);
  const supervisors = useAppStore((s) => s.supervisors);
  const [picked, setPicked] = React.useState<string | null>(null);

  const targets = bulkStudents ?? (student ? [student] : []);
  const isBulk = (bulkStudents?.length ?? 0) > 1;
  // Use the first target's department/company as the picker default filter
  const dept = targets[0]?.department;
  const companyId = targets[0]?.companyId;

  React.useEffect(() => {
    if (open) {
      setPicked(targets[0]?.supervisorId ?? null);
    }
  }, [open, student?.id]);

  const handleConfirm = () => {
    if (!picked) {
      toast.error("Pick a supervisor first.");
      return;
    }
    const sup = getSupervisor(supervisors, picked);
    if (!sup) return;

    targets.forEach((st) => {
      updateStudent(st.id, { supervisorId: picked });
    });

    if (isBulk) {
      toast.success(`${targets.length} students assigned`, {
        description: `All assigned to ${sup.name}.`,
      });
    } else {
      const st = targets[0];
      toast.success(`${st?.name} reassigned`, {
        description: `Now mentored by ${sup.name}.`,
      });
    }
    onOpenChange(false);
    onDone?.();
  };

  const handleClear = () => {
    targets.forEach((st) => {
      updateStudent(st.id, { supervisorId: null });
    });
    if (isBulk) {
      toast.success(`${targets.length} students unassigned`);
    } else {
      toast.success(`${targets[0]?.name} unassigned`);
    }
    onOpenChange(false);
    onDone?.();
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isBulk ? `Assign ${targets.length} students` : "Reassign supervisor"}
      description={
        isBulk
          ? `Pick a supervisor for the ${targets.length} selected students.`
          : targets[0]
            ? `Pick a new supervisor for ${targets[0].name} (${targets[0].position}).`
            : undefined
      }
      maxHeight={90}
    >
      <div className="space-y-4 pb-4">
        <SupervisorPicker
          value={picked}
          onChange={setPicked}
          department={dept}
          companyId={companyId}
        />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {targets[0]?.supervisorId ? (
            <Button variant="ghost" onClick={handleClear} className="text-muted-foreground">
              Unassign
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={handleConfirm} disabled={!picked} className="sm:ml-auto">
            {isBulk ? `Assign ${targets.length} students` : "Confirm reassign"}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
