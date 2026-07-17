"use client";

import { useMemo } from "react";
import { useAppStore } from "@/store/use-app-store";
import type { School, SchoolIdentity, AccentColor } from "@/lib/types";
import { DEFAULT_SCHOOL_ID } from "@/lib/types";

/**
 * Effective school — the resolved School with the coordinator-configured
 * SchoolIdentity branding layered on top. The 3 identity-derived fields
 * (accentColor, heroImage, visibleCards) take precedence over the seeded
 * School defaults so what the coordinator sets in School Settings is what
 * every supervisor/student actually sees.
 */
export type EffectiveSchool = School & {
  /**
   * Coordinator-picked accent color. Stored as a string on SchoolIdentity
   * (one of: sage, terracotta, slate, sand, clay, or a custom hex). When
   * the value matches an AccentColor enum member, downstream lookups like
   * ACCENT_HEX[accentColor] keep working; otherwise code should fall back
   * to a default.
   */
  accentColor: AccentColor | string;
  /** Single hero image data URL from School Settings (≤ 200KB). */
  heroImage?: string;
  /** Object-form visible-cards map from School Settings. */
  identityVisibleCards?: SchoolIdentity["visibleCards"];
};

/**
 * Resolve which school's branding the current user should see.
 *
 *   Student      → their assigned school (student.schoolId)
 *   Coordinator  → their school (coordinator.schoolId)
 *   Supervisor   → if ALL their interns share ONE school → that school
 *                  if interns span MULTIPLE schools (or zero) → default Practo
 *
 * This is the "branding brain" — every theme-aware surface reads from here.
 * The coordinator-configured SchoolIdentity's accentColor / heroImage /
 * visibleCards are merged on top of the seeded School record.
 */
export function useEffectiveSchool(): { school: EffectiveSchool; isDefault: boolean } {
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const coordinators = useAppStore((s) => s.coordinators);
  const getSchool = useAppStore((s) => s.getSchool);
  const schoolIdentity = useAppStore((s) => s.schoolIdentity);

  return useMemo(() => {
    const mergeIdentity = (school: School): EffectiveSchool => ({
      ...school,
      // Identity accent takes precedence when explicitly set.
      accentColor: schoolIdentity.accentColor ?? school.accentColor,
      heroImage: schoolIdentity.heroImage,
      identityVisibleCards: schoolIdentity.visibleCards,
    });

    if (!currentUser) {
      return { school: mergeIdentity(getSchool(DEFAULT_SCHOOL_ID)), isDefault: true };
    }

    // Student → their school.
    if (currentUser.role === "student" && currentUser.studentId) {
      const student = students.find((s) => s.id === currentUser.studentId);
      const sid = student?.schoolId ?? DEFAULT_SCHOOL_ID;
      const school = getSchool(sid);
      return { school: mergeIdentity(school), isDefault: !!school.isDefault };
    }

    // Coordinator → their school.
    if (currentUser.role === "coordinator" && currentUser.coordinatorId) {
      const coord = coordinators.find((c) => c.id === currentUser.coordinatorId);
      const sid = coord?.schoolId ?? DEFAULT_SCHOOL_ID;
      const school = getSchool(sid);
      return { school: mergeIdentity(school), isDefault: !!school.isDefault };
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
        return { school: mergeIdentity(school), isDefault: !!school.isDefault };
      }
      return { school: mergeIdentity(getSchool(DEFAULT_SCHOOL_ID)), isDefault: true };
    }

    return { school: mergeIdentity(getSchool(DEFAULT_SCHOOL_ID)), isDefault: true };
  }, [currentUser, students, coordinators, getSchool, schoolIdentity]);
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
