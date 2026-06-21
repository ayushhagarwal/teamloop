import { PrismaClient } from "@prisma/client";

declare global {
  var __teamloopPrisma: PrismaClient | undefined;
}

export const prisma = globalThis.__teamloopPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__teamloopPrisma = prisma;
}
