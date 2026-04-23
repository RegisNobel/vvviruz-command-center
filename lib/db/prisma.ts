import {createRequire} from "node:module";
import type {PrismaClient as PrismaClientType} from "@prisma/client";

import {ensureDatabaseUrl} from "@/lib/db/load-env";

ensureDatabaseUrl();

const require = createRequire(import.meta.url);
const {PrismaClient} = require("@prisma/client") as typeof import("@prisma/client");

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClientType;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
