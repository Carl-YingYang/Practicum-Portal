import { PrismaClient } from "@prisma/client";
const globalDatabase = globalThis as unknown as {
  portalDatabase?: PrismaClient;
};
export const db = globalDatabase.portalDatabase ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalDatabase.portalDatabase = db;
