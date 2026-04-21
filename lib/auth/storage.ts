import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import type {AdminUserRecord, AuthSessionRecord} from "@/lib/auth/types";
import {createId, fileNameFromPath} from "@/lib/utils";

const authRoot = path.join(process.cwd(), "storage", "auth");
const sessionsDir = path.join(authRoot, "sessions");
const adminUserPath = path.join(authRoot, "admin-user.json");

async function ensureAuthStorage() {
  await Promise.all([
    fs.mkdir(authRoot, {recursive: true}),
    fs.mkdir(sessionsDir, {recursive: true})
  ]);
}

function createEmptyAdminUser(username: string): AdminUserRecord {
  const now = new Date().toISOString();

  return {
    id: "admin-owner",
    username,
    totp: {
      method: null,
      encryptedSecret: null,
      enrolledAt: null
    },
    createdAt: now,
    updatedAt: now
  };
}

export async function readAdminUser(username: string) {
  await ensureAuthStorage();

  try {
    const raw = await fs.readFile(adminUserPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<AdminUserRecord>;
    const fallback = createEmptyAdminUser(username);

    return {
      ...fallback,
      ...parsed,
      username,
      totp: {
        ...fallback.totp,
        ...parsed.totp
      }
    } satisfies AdminUserRecord;
  } catch {
    const initialUser = createEmptyAdminUser(username);

    await writeAdminUser(initialUser);

    return initialUser;
  }
}

export async function writeAdminUser(user: AdminUserRecord) {
  await ensureAuthStorage();

  await fs.writeFile(adminUserPath, JSON.stringify(user, null, 2), "utf8");
}

function sessionPath(sessionId: string) {
  const safeId = fileNameFromPath(sessionId);

  return path.join(sessionsDir, `${safeId}.json`);
}

export async function writeSession(session: AuthSessionRecord) {
  await ensureAuthStorage();

  await fs.writeFile(sessionPath(session.id), JSON.stringify(session, null, 2), "utf8");
}

export async function createSession(
  values: Omit<AuthSessionRecord, "id" | "createdAt" | "updatedAt">
) {
  const now = new Date().toISOString();
  const session: AuthSessionRecord = {
    ...values,
    id: createId(),
    createdAt: now,
    updatedAt: now
  };

  await writeSession(session);

  return session;
}

export async function readSession(sessionId: string) {
  await ensureAuthStorage();

  try {
    const raw = await fs.readFile(sessionPath(sessionId), "utf8");

    return JSON.parse(raw) as AuthSessionRecord;
  } catch {
    return null;
  }
}

export async function deleteSession(sessionId: string) {
  await ensureAuthStorage();

  try {
    await fs.unlink(sessionPath(sessionId));
  } catch {}
}

export async function pruneExpiredSessions() {
  await ensureAuthStorage();
  const files = await fs.readdir(sessionsDir);
  const now = Date.now();

  await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map(async (file) => {
        try {
          const raw = await fs.readFile(path.join(sessionsDir, file), "utf8");
          const session = JSON.parse(raw) as AuthSessionRecord;

          if (Date.parse(session.expiresAt) <= now) {
            await fs.unlink(path.join(sessionsDir, file));
          }
        } catch {}
      })
  );
}
