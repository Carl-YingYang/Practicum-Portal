import type { Prisma, PortalAccount } from "@prisma/client";
import { db } from "./database";
import { HttpError, hashPassword } from "./security";
import { createPortalStore } from "@/domain/portal/engine";
import {
  snapshot,
  withoutCredentials,
  type PortalData,
} from "@/domain/portal/snapshot";
import { accountUsers, recalculateHours } from "@/lib/prototype";
import { authorizeCommand, commandSchema, scopedData } from "./permissions";
import { randomUUID } from "node:crypto";
import type { User } from "@/lib/types";
type Transaction = Prisma.TransactionClient;
export function actorFor(data: PortalData, account: PortalAccount): User {
  const actor = accountUsers(data).find(
    (u) =>
      (u.studentId ?? u.supervisorId ?? u.coordinatorId) ===
        account.profileId && u.role === account.role,
  );
  if (!actor || actor.accountStatus === "disabled")
    throw new HttpError(401, "This account is unavailable.");
  return {
    ...actor,
    id: account.id,
    mustChangePassword: account.mustChangePassword,
    accountStatus: account.status as User["accountStatus"],
  };
}
export async function accountSnapshot(account: PortalAccount) {
  const school = await db.portalSchool.findUnique({
    where: { id: account.schoolId },
  });
  if (!school)
    throw new HttpError(503, "Run database setup before opening the portal.");
  const data = withoutCredentials(JSON.parse(school.stateJson) as PortalData),
    actor = actorFor(data, account);
  return {
    data: scopedData(data, actor),
    currentUser: actor,
    revision: school.revision,
  };
}
export async function syncAccounts(
  tx: Transaction,
  data: PortalData,
  schoolId: string,
) {
  const users = accountUsers(data);
  for (const user of users) {
    const profileId = (user.studentId ??
      user.supervisorId ??
      user.coordinatorId)!;
    const profile = [
      ...data.students,
      ...data.supervisors,
      ...data.coordinators,
    ].find((p) => p.id === profileId)!;
    const existing = await tx.portalAccount.findUnique({
      where: {
        schoolId_role_profileId: { schoolId, role: user.role, profileId },
      },
    });
    const fields = {
      email: user.email.trim().toLowerCase(),
      status: user.accountStatus ?? "active",
      mustChangePassword: user.mustChangePassword ?? false,
    };
    if (!existing && !profile.password)
      throw new HttpError(
        400,
        "Account creation requires a temporary password.",
      );
    const passwordHash = profile.password
      ? await hashPassword(profile.password)
      : existing!.passwordHash;
    if (existing) {
      await tx.portalAccount.update({
        where: { id: existing.id },
        data: { ...fields, passwordHash },
      });
      if (profile.password || fields.status === "disabled")
        await tx.portalSession.deleteMany({
          where: { accountId: existing.id },
        });
    } else
      await tx.portalAccount.create({
        data: {
          id: user.id,
          schoolId,
          profileId,
          role: user.role,
          ...fields,
          passwordHash,
        },
      });
  }
}
export async function executeCommand(account: PortalAccount, body: unknown) {
  const parsed = commandSchema.safeParse(body);
  if (!parsed.success) throw new HttpError(400, "Invalid portal command.");
  const command = parsed.data;
  await db.$transaction(
    async (tx) => {
      // Acquire SQLite's write lock before reading the aggregate. Concurrent
      // commands serialize, so clock-in and read/modify/write cannot lose data.
      const school = await tx.portalSchool.update({
        where: { id: account.schoolId },
        data: { revision: { increment: 1 } },
      });
      const liveAccount = await tx.portalAccount.findUnique({
        where: { id: account.id },
      });
      if (
        !liveAccount ||
        liveAccount.status === "disabled" ||
        liveAccount.mustChangePassword
      )
        throw new HttpError(403, "This account cannot change records.");
      if (
        await tx.portalReceipt.findUnique({
          where: {
            accountId_requestId: {
              accountId: account.id,
              requestId: command.requestId,
            },
          },
        })
      )
        return;
      const data = JSON.parse(school.stateJson) as PortalData;
      const actor = actorFor(data, liveAccount);
      authorizeCommand(command, data, actor);
      const existingIds = new Set(
        Object.values(data).flatMap((value) =>
          Array.isArray(value) ? value.map((row) => row.id) : [],
        ),
      );
      if (
        command.ids.some((id) => existingIds.has(id)) ||
        new Set(command.ids).size !== command.ids.length
      )
        throw new HttpError(400, "Generated IDs must be unique.");
      let idIndex = 0;
      const store = createPortalStore(
        () => command.ids[idIndex++] ?? randomUUID(),
      );
      store.setState({ ...data, currentUser: actor });
      const action = store.getState()[command.action] as (
        ...args: unknown[]
      ) => unknown;
      try {
        action(...command.args);
      } catch {
        throw new HttpError(
          409,
          "The change could not be applied. Check for duplicate emails or invalid values.",
        );
      }
      const next = snapshot(store.getState());
      // A cadence is captured at creation; preference changes do not rewrite
      // previous reporting periods.
      if (command.action === "createJournal")
        for (const journal of next.journals)
          if (!data.journals.some((j) => j.id === journal.id))
            journal.cadence = data.schoolIdentity.journalCadence ?? "weekly";
      next.students = recalculateHours(next.students, next.timeLogs);
      await syncAccounts(tx, next, account.schoolId);
      await tx.portalSchool.update({
        where: { id: school.id },
        data: {
          name: next.schoolIdentity.name,
          stateJson: JSON.stringify(withoutCredentials(next)),
        },
      });
      await tx.portalReceipt.create({
        data: { accountId: account.id, requestId: command.requestId },
      });
    },
    { maxWait: 10000, timeout: 20000 },
  );
  const live = await db.portalAccount.findUnique({ where: { id: account.id } });
  return accountSnapshot(live!);
}
