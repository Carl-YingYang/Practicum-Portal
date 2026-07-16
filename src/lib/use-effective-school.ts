"use client";

import { useMemo } from "react";
import { useAppStore } from "@/store/use-app-store";
import type { School } from "@/lib/types";
import { DEFAULT_SCHOOL_ID } from "@/lib/types";

/**
 * Resolve which school's branding the current user should see.
 *
 *   Student      → their assigned school (student.schoolId)
 *   Coordinator  → their school (coordinator.schoolId)
 *   Supervisor   → if ALL their interns share ONE school → that school
 *                  if interns span MULTIPLE schools (or zero) → default Practo
 *
 * This is the "branding brain" — every theme-aware surface reads from here.
 */
export function useEffectiveSchool(): { school: School; isDefault: boolean } {
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const coordinators = useAppStore((s) => s.coordinators);
  const getSchool = useAppStore((s) => s.getSchool);

  return useMemo(() => {
    if (!currentUser) {
      return { school: getSchool(DEFAULT_SCHOOL_ID), isDefault: true };
    }

    // Student → their school.
    if (currentUser.role === "student" && currentUser.studentId) {
      const student = students.find((s) => s.id === currentUser.studentId);
      const sid = student?.schoolId ?? DEFAULT_SCHOOL_ID;
      const school = getSchool(sid);
      return { school, isDefault: !!school.isDefault };
    }

    // Coordinator → their school.
    if (currentUser.role === "coordinator" && currentUser.coordinatorId) {
      const coord = coordinators.find((c) => c.id === currentUser.coordinatorId);
      const sid = coord?.schoolId ?? DEFAULT_SCHOOL_ID;
      const school = getSchool(sid);
      return { school, isDefault: !!school.isDefault };
    }

    // Supervisor → derive from interns.
    if (currentUser.role === "supervisor" && currentUser.supervisorId) {
      const myInterns = students.filter(
        (s) => s.supervisorId === currentUser.supervisorId,
      );
      const schoolIds = new Set(
        myInterns.map((s) => s.schoolId ?? DEFAULT_SCHOOL_ID),
      );
      // Single school → use it. Multiple or zero → default.
      if (schoolIds.size === 1) {
        const sid = Array.from(schoolIds)[0];
        const school = getSchool(sid);
        return { school, isDefault: !!school.isDefault };
      }
      return { school: getSchool(DEFAULT_SCHOOL_ID), isDefault: true };
    }

    return { school: getSchool(DEFAULT_SCHOOL_ID), isDefault: true };
  }, [currentUser, students, coordinators, getSchool]);
}

/**
 * Resolve the school a supervisor should EDIT (for the branding sheet).
 * Returns null if the supervisor can't edit (multi-school or no interns).
 */
export function useSupervisorEditableSchool(): School | null {
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const getSchool = useAppStore((s) => s.getSchool);

  return useMemo(() => {
    if (!currentUser || currentUser.role !== "supervisor" || !currentUser.supervisorId) {
      return null;
    }
    const myInterns = students.filter(
      (s) => s.supervisorId === currentUser.supervisorId,
    );
    const schoolIds = new Set(
      myInterns.map((s) => s.schoolId ?? DEFAULT_SCHOOL_ID),
    );
    // Can edit if all interns share ONE school (default or branded).
    // Multi-school supervisors can't edit (they see the default).
    if (schoolIds.size === 1) {
      const sid = Array.from(schoolIds)[0];
      return getSchool(sid);
    }
    return null;
  }, [currentUser, students, getSchool]);
}
