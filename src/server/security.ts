import {
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { db } from "./database";
import type { PortalAccount } from "@prisma/client";
import { isDemoLoginEnabled } from "./runtime-mode";
const scrypt = promisify(nodeScrypt);
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const testMode = () => process.env.APP_ENV === "testing";
export const demoEnabled = () =>
  isDemoLoginEnabled({
    appEnv: process.env.APP_ENV,
    nodeEnv: process.env.NODE_ENV,
    enabled: process.env.ENABLE_DEMO_LOGIN,
  });
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${((await scrypt(password, salt, 64)) as Buffer).toString("hex")}`;
}
export async function verifyPassword(password: string, hash: string) {
  const [kind, salt, value] = hash.split(":");
  if (kind !== "scrypt" || !salt || !value) return false;
  const expected = Buffer.from(value, "hex");
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
const cookieName = "practo_session";
export async function sessionAccount(): Promise<PortalAccount | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const session = await db.portalSession.findUnique({
    where: { tokenHash: digest(token) },
    include: { account: true },
  });
  if (
    !session ||
    session.expiresAt < new Date() ||
    session.account.status === "disabled"
  )
    return null;
  return session.account;
}
export async function requireAccount(allowInvited = false) {
  const account = await sessionAccount();
  if (!account) throw new HttpError(401, "Please sign in to continue.");
  if (!allowInvited && account.mustChangePassword)
    throw new HttpError(403, "Change your temporary password first.");
  return account;
}
export async function createSession(accountId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
  await db.portalSession.create({
    data: { tokenHash: digest(token), accountId, expiresAt },
  });
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    sameSite: "strict",
    secure:
      process.env.NODE_ENV === "production" &&
      process.env.COOKIE_SECURE !== "false",
    path: "/",
    expires: expiresAt,
  });
}
export async function removeSession() {
  const jar = await cookies(),
    token = jar.get(cookieName)?.value;
  if (token)
    await db.portalSession.deleteMany({ where: { tokenHash: digest(token) } });
  jar.delete(cookieName);
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const protocol =
    request.headers.get("x-forwarded-proto") ??
    new URL(request.url).protocol.replace(":", "");
  const expected =
    process.env.APP_ORIGIN ?? `${protocol}://${request.headers.get("host")}`;
  if (!origin || origin !== expected)
    throw new HttpError(403, "This request must come from the portal.");
}
export async function jsonBody(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "Send JSON data.");
  const text = await request.text();
  if (Buffer.byteLength(text) > 1000000)
    throw new HttpError(413, "This request is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Invalid JSON data.");
  }
}
export function failure(error: unknown) {
  const status = error instanceof HttpError ? error.status : 500;
  // Do not expose Prisma messages, passwords, connection strings or stack traces.
  return Response.json(
    {
      error:
        error instanceof HttpError
          ? error.message
          : "The server could not save this request. Check database setup and try again.",
    },
    { status },
  );
}
