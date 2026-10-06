import { randomBytes } from "node:crypto";
import { db } from "./database";
import { hashPassword } from "./security";
import { createPortalStore } from "@/domain/portal/engine";
import { snapshot, withoutCredentials } from "@/domain/portal/snapshot";
import { accountUsers, recalculateHours } from "@/lib/prototype";
import { calendarDay, journalHours } from "@/domain/journal-period";
import { todayISODate } from "@/lib/selectors";
export async function seedPortal(reset = false) {
  if (reset && process.env.APP_ENV !== "testing")
    throw new Error("Reset is available only with APP_ENV=testing.");
  const existing = await db.portalSchool.count();
  if (existing && !reset) return [];
  const data = snapshot(createPortalStore().getState());
  const today = todayISODate();
  data.schoolIdentity = {
    ...data.schoolIdentity,
    name: "Practo Test Academy",
    shortName: "PTA",
    journalCadence: "weekly",
  };
  data.schools = data.schools
    .filter((s) => s.id === "practo")
    .map((s) => ({ ...s, name: data.schoolIdentity.name, shortName: "PTA" }));
  data.companies = data.companies.slice(0, 6).map((c, i) => ({
    id: c.id,
    name: `Sample Partner ${i + 1}`,
    address: "Sample City, Philippines",
    industry: "Technology",
    contactEmail: `partner${i + 1}@example.test`,
  }));
  for (const [role, profiles] of [
    ["student", data.students],
    ["supervisor", data.supervisors],
    ["coordinator", data.coordinators],
  ] as const) {
    profiles.forEach((p, i) => {
      p.email = `${role}${i + 1}@example.test`;
      p.name = `Sample ${role[0].toUpperCase() + role.slice(1)} ${i + 1}`;
      p.accountStatus = "active";
      p.mustChangePassword = false;
      delete p.password;
    });
  }
  data.students.forEach((s) => {
    s.schoolId = "practo";
    s.startDate = calendarDay(today, -30);
    s.endDate = calendarDay(today, 90);
  });
  data.coordinators.forEach((c) => {
    c.schoolId = "practo";
  });
  // Student 5 starts empty; Student 6 has a completed 80-hour sample requirement.
  if (data.students[5]) data.students[5].requiredHours = 80;
  data.timeLogs = data.students.flatMap((s, index) =>
    Array.from({ length: index === 4 ? 0 : 10 }, (_, i) => {
      const date = calendarDay(today, -14 + i);
      return {
        id: `seed-time-${s.id}-${i}`,
        userId: s.id,
        role: "student" as const,
        clockInAt: `${date}T08:00:00+08:00`,
        clockOutAt: `${date}T16:00:00+08:00`,
        durationMs: 28800000,
        note: "Synthetic attendance for prototype testing",
        createdAt: `${date}T08:00:00+08:00`,
      };
    }),
  );
  data.students = recalculateHours(data.students, data.timeLogs);
  const oldDate = calendarDay(today, -10);
  data.journals = data.students.slice(0, 4).map((s, i) => ({
    id: `seed-journal-${i}`,
    studentId: s.id,
    date: oldDate,
    cadence: "weekly" as const,
    hours: journalHours(data.timeLogs, s.id, oldDate).hours,
    tasks: "Tested the sample portal workflow and documented results.",
    learnings: "Clear feedback helps improve the next submission.",
    status: ["approved", "pending", "rejected", "draft"][i] as
      "approved" | "pending" | "rejected" | "draft",
    submittedAt: i < 3 ? `${oldDate}T17:00:00+08:00` : null,
    reviewedAt: i === 0 || i === 2 ? `${oldDate}T18:00:00+08:00` : null,
    rejectionReason:
      i === 2 ? "Please include your testing outcomes." : undefined,
    reviewedBy: i === 0 || i === 2 ? (s.supervisorId ?? undefined) : undefined,
    createdAt: `${oldDate}T16:00:00+08:00`,
  }));
  data.evaluations = data.evaluations
    .filter((e) => e.studentId !== data.students[4]?.id)
    .map((e) => ({
      ...e,
      term: `${Number(today.slice(0, 4))}-${Number(today.slice(0, 4)) + 1}`,
      createdAt: `${oldDate}T16:00:00+08:00`,
    }));
  data.formAssignments = data.formAssignments.map((a) => ({
    ...a,
    dueDate: calendarDay(today, 7),
  }));
  data.formSubmissions = [];
  data.activity = [];
  const users = accountUsers(data);
  const credentials = users.map((u) => ({
    name: u.name,
    email: u.email,
    role: u.role,
    password: `Test-${randomBytes(16).toString("hex")}`,
    id: u.id,
  }));
  const hashes = await Promise.all(
    credentials.map((c) => hashPassword(c.password)),
  );
  await db.$transaction(
    async (tx) => {
      if (reset) {
        await tx.practicumAssignment.deleteMany();
        await tx.practicumTemplateVersion.deleteMany();
        await tx.practicumTemplate.deleteMany();
        await tx.practicumReport.deleteMany();
        await tx.portalSchool.deleteMany();
        await tx.portalLoginAttempt.deleteMany();
      }
      await tx.portalSchool.create({
        data: {
          id: "practo",
          name: data.schoolIdentity.name,
          stateJson: JSON.stringify(withoutCredentials(data)),
        },
      });
      for (const [index, u] of users.entries())
        await tx.portalAccount.create({
          data: {
            id: u.id,
            schoolId: "practo",
            profileId: (u.studentId ?? u.supervisorId ?? u.coordinatorId)!,
            role: u.role,
            email: u.email,
            passwordHash: hashes[index],
            status: u.accountStatus ?? "active",
            isDemo: true,
          },
        });
      // A separate school proves that scoped APIs do not leak records across schools.
      const isolated = structuredClone(data);
      isolated.students = [];
      isolated.supervisors = [];
      isolated.journals = [];
      isolated.timeLogs = [];
      isolated.evaluations = [];
      isolated.formSubmissions = [];
      isolated.formAssignments = [];
      isolated.coordinators = [
        {
          ...data.coordinators[0],
          id: "isolated-coord",
          schoolId: "isolated-school",
          name: "Isolated Test Coordinator",
          email: "isolated@example.test",
        },
      ];
      isolated.schools = [
        {
          ...data.schools[0],
          id: "isolated-school",
          name: "Isolated Test Academy",
        },
      ];
      await tx.portalSchool.create({
        data: {
          id: "isolated-school",
          name: "Isolated Test Academy",
          stateJson: JSON.stringify(isolated),
        },
      });
      const secret = `Test-${randomBytes(16).toString("hex")}`;
      await tx.portalAccount.create({
        data: {
          id: "u-coord-isolated-coord",
          profileId: "isolated-coord",
          schoolId: "isolated-school",
          role: "coordinator",
          email: "isolated@example.test",
          passwordHash: await hashPassword(secret),
        },
      });
      credentials.push({
        name: "Isolated Test Coordinator",
        email: "isolated@example.test",
        role: "coordinator",
        password: secret,
        id: "u-coord-isolated-coord",
      });
    },
    { timeout: 20000 },
  );
  return credentials;
}
