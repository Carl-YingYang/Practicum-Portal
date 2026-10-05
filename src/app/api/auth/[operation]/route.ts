import { z } from "zod";
import { db } from "@/server/database";
import { accountSnapshot } from "@/server/portal-service";
import { accountUsers } from "@/lib/prototype";
import type { PortalData } from "@/domain/portal/snapshot";
import {
  HttpError,
  checkOrigin,
  jsonBody,
  failure,
  demoEnabled,
  testMode,
  digest,
  verifyPassword,
  hashPassword,
  createSession,
  removeSession,
  sessionAccount,
  requireAccount,
} from "@/server/security";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  context: { params: Promise<{ operation: string }> },
) {
  try {
    if ((await context.params).operation !== "session")
      throw new HttpError(404, "Endpoint not found.");
    const account = await sessionAccount();
    const demoAccounts: import("@/lib/types").User[] = [];
    if (demoEnabled()) {
      const school = await db.portalSchool.findUnique({
        where: { id: "practo" },
      });
      if (!school)
        throw new HttpError(
          503,
          "Run npm run db:setup before opening the portal.",
        );
      const eligible = await db.portalAccount.findMany({
        where: {
          schoolId: "practo",
          isDemo: true,
          status: "active",
          mustChangePassword: false,
        },
        select: { id: true },
      });
      demoAccounts.push(
        ...accountUsers(JSON.parse(school.stateJson) as PortalData).filter(
          (u) => eligible.some((a) => a.id === u.id),
        ),
      );
    }
    return Response.json(
      {
        ...(account ? await accountSnapshot(account) : { currentUser: null }),
        testMode: testMode(),
        demoAccounts,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(
  request: Request,
  context: { params: Promise<{ operation: string }> },
) {
  try {
    checkOrigin(request);
    const operation = (await context.params).operation;
    if (operation === "logout") {
      await removeSession();
      return Response.json({ ok: true });
    }
    const body = await jsonBody(request);
    if (operation === "login") {
      const parsed = z
        .object({
          email: z.email().max(254),
          password: z.string().min(1).max(256),
        })
        .strict()
        .safeParse(body);
      if (!parsed.success)
        throw new HttpError(400, "Check your email and password.");
      const email = parsed.data.email.trim().toLowerCase(),
        key = digest(email);
      const attempt = await db.portalLoginAttempt.findUnique({
        where: { key },
      });
      if (attempt && attempt.resetAt > new Date() && attempt.count >= 10)
        throw new HttpError(
          429,
          "Too many sign-in attempts. Try again in 15 minutes.",
        );
      const account = await db.portalAccount.findUnique({ where: { email } });
      // A fixed valid dummy hash makes unknown-account attempts run scrypt too.
      const valid = await verifyPassword(
        parsed.data.password,
        account?.passwordHash ??
          "scrypt:00000000000000000000000000000000:" + "00".repeat(64),
      );
      if (!account || !valid || account.status === "disabled") {
        const resetAt = new Date(Date.now() + 15 * 60 * 1000);
        await db.portalLoginAttempt.upsert({
          where: { key },
          create: { key, count: 1, resetAt },
          update:
            attempt && attempt.resetAt > new Date()
              ? { count: { increment: 1 } }
              : { count: 1, resetAt },
        });
        throw new HttpError(
          401,
          "Check your email and password, or ask your coordinator for access.",
        );
      }
      await db.portalLoginAttempt.deleteMany({ where: { key } });
      await removeSession();
      await createSession(account.id);
      return Response.json(await accountSnapshot(account));
    }
    if (operation === "demo") {
      if (!demoEnabled())
        throw new HttpError(404, "Demo sign-in is unavailable.");
      const parsed = z
        .object({ userId: z.string().max(150) })
        .strict()
        .safeParse(body);
      if (!parsed.success) throw new HttpError(400, "Choose a sample account.");
      const account = await db.portalAccount.findUnique({
        where: { id: parsed.data.userId },
      });
      if (
        !account ||
        !account.isDemo ||
        account.schoolId !== "practo" ||
        account.status !== "active" ||
        account.mustChangePassword
      )
        throw new HttpError(403, "This sample account is unavailable.");
      await removeSession();
      await createSession(account.id);
      return Response.json(await accountSnapshot(account));
    }
    if (operation === "password") {
      const account = await requireAccount(true);
      const parsed = z
        .object({
          currentPassword: z.string().max(256),
          newPassword: z.string().min(8).max(128).regex(/[A-Z]/).regex(/[0-9]/),
        })
        .strict()
        .safeParse(body);
      if (
        !parsed.success ||
        parsed.data.currentPassword === parsed.data.newPassword
      )
        throw new HttpError(
          400,
          "Use a different password with at least 8 characters, a capital letter and a number.",
        );
      if (
        !(await verifyPassword(
          parsed.data.currentPassword,
          account.passwordHash,
        ))
      )
        throw new HttpError(400, "Your temporary password is incorrect.");
      const hash = await hashPassword(parsed.data.newPassword);
      await db.$transaction(async (tx) => {
        const school = await tx.portalSchool.update({
          where: { id: account.schoolId },
          data: { revision: { increment: 1 } },
        });
        const data = JSON.parse(school.stateJson) as PortalData;
        const profile = [
          ...data.students,
          ...data.supervisors,
          ...data.coordinators,
        ].find((p) => p.id === account.profileId)!;
        profile.mustChangePassword = false;
        profile.accountStatus = "active";
        await tx.portalSchool.update({
          where: { id: school.id },
          data: { stateJson: JSON.stringify(data) },
        });
        await tx.portalAccount.update({
          where: { id: account.id },
          data: {
            passwordHash: hash,
            mustChangePassword: false,
            status: "active",
          },
        });
        await tx.portalSession.deleteMany({ where: { accountId: account.id } });
      });
      await createSession(account.id);
      return Response.json(
        await accountSnapshot({
          ...account,
          status: "active",
          mustChangePassword: false,
        }),
      );
    }
    throw new HttpError(404, "Endpoint not found.");
  } catch (error) {
    return failure(error);
  }
}
