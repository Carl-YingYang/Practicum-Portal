import { roleHomeView } from "@/lib/nav";
import { accountUsers, DEFAULT_SCHOOL_ID } from "@/lib/prototype";
import {
  type Company,
  type Coordinator,
  type Student,
  type Supervisor,
} from "@/lib/types";
import type { StoreApi } from "zustand/vanilla";
import { createHelpers } from "../helpers";
import type { AppState } from "../types";
export function createAccountsActions(
  set: StoreApi<AppState>["setState"],
  get: StoreApi<AppState>["getState"],
  uuid: () => string,
): Pick<
  AppState,
  | "login"
  | "loginAs"
  | "setAccountStatus"
  | "resetAccountCredentials"
  | "createStudent"
  | "updateStudent"
  | "createSupervisor"
  | "updateSupervisor"
  | "upsertCompany"
  | "createCoordinator"
  | "updateCoordinator"
> {
  const { logActivity, genTempPassword, buildDefaultBlock } =
    createHelpers(uuid);
  return {
    login: (role) => {
      const user = accountUsers(get()).find(
        (u) => u.role === role && u.accountStatus !== "disabled",
      );
      if (user) get().loginAs(user.id);
    },
    loginAs: (userId) => {
      const user = accountUsers(get()).find(
        (u) => u.id === userId && u.accountStatus !== "disabled",
      );
      if (user)
        set({
          currentUser: user,
          view: roleHomeView[user.role],
          viewParams: {},
          history: [],
        });
    },
    setAccountStatus: (role, recordId, status) => {
      const cur = get().currentUser;
      if (status === "disabled" && cur) {
        const ownsRecord =
          (role === "student" && cur.studentId === recordId) ||
          (role === "supervisor" && cur.supervisorId === recordId) ||
          (role === "coordinator" && cur.coordinatorId === recordId);
        if (ownsRecord) return; // never lock yourself out
      }
      set((s) => {
        if (role === "student") {
          return {
            students: s.students.map((x) =>
              x.id === recordId ? { ...x, accountStatus: status } : x,
            ),
          };
        }
        if (role === "supervisor") {
          return {
            supervisors: s.supervisors.map((x) =>
              x.id === recordId ? { ...x, accountStatus: status } : x,
            ),
          };
        }
        return {
          coordinators: s.coordinators.map((x) =>
            x.id === recordId ? { ...x, accountStatus: status } : x,
          ),
        };
      });
    },
    resetAccountCredentials: (role, recordId) => {
      const tempPassword = genTempPassword();
      let name = "";
      let email = "";
      if (role === "student") {
        const rec = get().students.find((x) => x.id === recordId);
        if (rec) {
          name = rec.name;
          email = rec.email;
          set((s) => ({
            students: s.students.map((x) =>
              x.id === recordId
                ? {
                    ...x,
                    password: tempPassword,
                    mustChangePassword: true,
                    accountStatus: "invited" as const,
                  }
                : x,
            ),
          }));
        }
      } else if (role === "supervisor") {
        const rec = get().supervisors.find((x) => x.id === recordId);
        if (rec) {
          name = rec.name;
          email = rec.email;
          set((s) => ({
            supervisors: s.supervisors.map((x) =>
              x.id === recordId
                ? {
                    ...x,
                    password: tempPassword,
                    mustChangePassword: true,
                    accountStatus: "invited" as const,
                  }
                : x,
            ),
          }));
        }
      } else {
        const rec = get().coordinators.find((x) => x.id === recordId);
        if (rec) {
          name = rec.name;
          email = rec.email;
          set((s) => ({
            coordinators: s.coordinators.map((x) =>
              x.id === recordId
                ? {
                    ...x,
                    password: tempPassword,
                    mustChangePassword: true,
                    accountStatus: "invited" as const,
                  }
                : x,
            ),
          }));
        }
      }
      return { name, email, role, tempPassword };
    },
    createStudent: (input) => {
      const duplicate = accountUsers(get()).find(
        (user) =>
          user.email.trim().toLowerCase() === input.email.trim().toLowerCase(),
      );
      if (duplicate)
        throw new Error("An account already uses this email address.");
      const candidate = get().supervisors.find(
        (sup) => sup.id === input.supervisorId,
      );
      const load = candidate
        ? get().students.filter(
            (s) => s.supervisorId === candidate.id && s.status === "active",
          ).length
        : 0;
      const assigned =
        candidate &&
        candidate.status === "active" &&
        candidate.accountStatus !== "disabled" &&
        load < candidate.capacity &&
        (!input.companyId || input.companyId === candidate.companyId)
          ? candidate
          : null;
      const id = uuid();
      const now = new Date().toISOString();
      const tempPassword = genTempPassword();
      const student: Student = {
        id,
        studentNumber: input.studentNumber,
        name: input.name,
        email: input.email,
        course: input.course,
        section: input.section,
        schoolYear: input.schoolYear,
        requiredHours: input.requiredHours,
        loggedHours: 0,
        schoolId:
          get().coordinators.find(
            (c) => c.id === get().currentUser?.coordinatorId,
          )?.schoolId ?? DEFAULT_SCHOOL_ID,
        companyId: input.companyId || assigned?.companyId || "",
        supervisorId: assigned?.id ?? null,
        status: "active",
        position: input.position,
        department: input.department,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        workMode: input.workMode ?? "onsite",
        // Controlled provisioning: the one-time temporary password IS the
        // login credential until the user sets a personal one at first sign-in.
        accountStatus: "invited",
        mustChangePassword: true,
        password: tempPassword,
        createdAt: now,
      };
      set((s) => ({
        students: [...s.students, student],
        activity: logActivity(
          s.activity,
          "student_created",
          `${input.name} was added to the cohort`,
          s.currentUser?.id ?? "",
        ),
      }));
      // The student signs in with email + temporary password, then sets a
      // personal password on first login. The User ID remains their student number.
      return { studentId: id, tempPassword, idNumber: input.studentNumber };
    },
    updateStudent: (id, input) =>
      set((s) => ({
        students: s.students.map((st) =>
          st.id === id ? { ...st, ...input } : st,
        ),
      })),
    createSupervisor: (input) => {
      const duplicate = accountUsers(get()).find(
        (user) =>
          user.email.trim().toLowerCase() === input.email.trim().toLowerCase(),
      );
      if (duplicate)
        throw new Error("An account already uses this email address.");
      const id = uuid();
      const now = new Date().toISOString();
      const tempPassword = genTempPassword();
      // Auto-generate an employee ID like "EMP-007" if not provided.
      const idNumber =
        input.idNumber?.trim() ||
        `EMP-${String(get().supervisors.length + 1).padStart(3, "0")}`;
      const supervisor: Supervisor = {
        id,
        name: input.name,
        email: input.email,
        companyId: input.companyId,
        status: "active",
        title: input.title ?? "Supervisor",
        department: input.department ?? "Other",
        capacity: input.capacity ?? 5,
        idNumber,
        phone: input.phone,
        salutation: input.salutation,
        schoolYear: input.schoolYear,
        accountStatus: "invited",
        mustChangePassword: true,
        password: tempPassword,
        createdAt: now,
      };
      set((s) => ({
        supervisors: [...s.supervisors, supervisor],
        activity: logActivity(
          s.activity,
          "supervisor_created",
          `${input.name} was added as a supervisor`,
          s.currentUser?.id ?? "",
        ),
      }));
      return { supervisorId: id, tempPassword, idNumber };
    },
    updateSupervisor: (id, input) =>
      set((s) => ({
        supervisors: s.supervisors.map((sup) =>
          sup.id === id ? { ...sup, ...input } : sup,
        ),
      })),
    upsertCompany: (input) => {
      const name = input.name.trim();
      if (!name) return "";
      const existing = get().companies.find(
        (c) => c.name.trim().toLowerCase() === name.toLowerCase(),
      );
      if (existing) {
        // Merge any newly-provided rich fields onto the existing record.
        const hasNew = (Object.keys(input) as (keyof typeof input)[]).some(
          (k) =>
            k !== "name" &&
            input[k] !== undefined &&
            (existing as unknown as Record<string, unknown>)[k as string] ===
              undefined,
        );
        if (hasNew) {
          set((s) => ({
            companies: s.companies.map((c) =>
              c.id === existing.id
                ? { ...c, ...input, name: existing.name }
                : c,
            ),
          }));
        }
        return existing.id;
      }
      const id = uuid();
      const company: Company = { ...input, id, name };
      set((s) => ({ companies: [...s.companies, company] }));
      return id;
    },
    createCoordinator: (input) => {
      const duplicate = accountUsers(get()).find(
        (user) =>
          user.email.trim().toLowerCase() === input.email.trim().toLowerCase(),
      );
      if (duplicate)
        throw new Error("An account already uses this email address.");
      const id = uuid();
      const now = new Date().toISOString();
      const tempPassword = genTempPassword();
      // Pick a deterministic avatar color from a small professional palette.
      const palette = [
        "#475569",
        "#0f766e",
        "#7c3aed",
        "#b45309",
        "#be185d",
        "#1e40af",
      ];
      const avatarColor = palette[get().coordinators.length % palette.length];
      // Auto-generate a coordinator ID like "COORD-002" if not provided.
      const idNumber =
        input.idNumber?.trim() ||
        `COORD-${String(get().coordinators.length + 1).padStart(3, "0")}`;
      const coordinator: Coordinator = {
        id,
        name: input.name,
        email: input.email,
        title: input.title ?? "Practicum Coordinator",
        department: input.department ?? "Computer Studies",
        status: "active",
        avatarColor,
        schoolId:
          get().coordinators.find(
            (c) => c.id === get().currentUser?.coordinatorId,
          )?.schoolId ?? DEFAULT_SCHOOL_ID,
        idNumber,
        accountStatus: "invited",
        mustChangePassword: true,
        password: tempPassword,
        createdAt: now,
      };
      set((s) => ({
        coordinators: [...s.coordinators, coordinator],
        activity: logActivity(
          s.activity,
          "student_created",
          `${input.name} was added as a coordinator`,
          s.currentUser?.id ?? "",
        ),
      }));
      return { coordinatorId: id, tempPassword, idNumber };
    },
    updateCoordinator: (id, input) =>
      set((s) => ({
        coordinators: s.coordinators.map((c) =>
          c.id === id ? { ...c, ...input } : c,
        ),
      })),
  };
}
