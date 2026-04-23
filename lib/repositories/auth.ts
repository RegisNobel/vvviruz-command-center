import {prisma} from "@/lib/db/prisma";
import {toDate} from "@/lib/db/serialization";
import type {AdminUserRecord, AuthSessionRecord} from "@/lib/auth/types";
import {createId} from "@/lib/utils";

const ADMIN_USER_ID = "admin-owner";

function createEmptyAdminUser(username: string): AdminUserRecord {
  const now = new Date().toISOString();

  return {
    id: ADMIN_USER_ID,
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

function toAdminUserRecord(user: {
  id: string;
  username: string;
  totpMethod: string | null;
  totpEncryptedSecret: string | null;
  totpEnrolledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AdminUserRecord {
  return {
    id: user.id,
    username: user.username,
    totp: {
      method: (user.totpMethod as AdminUserRecord["totp"]["method"]) ?? null,
      encryptedSecret: user.totpEncryptedSecret,
      enrolledAt: user.totpEnrolledAt?.toISOString() ?? null
    },
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}

function toSessionRecord(session: {
  id: string;
  userId: string;
  username: string;
  stage: string;
  factorMethod: string | null;
  pendingTotpSecret: string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}): AuthSessionRecord {
  return {
    id: session.id,
    userId: session.userId,
    username: session.username,
    stage: session.stage as AuthSessionRecord["stage"],
    factorMethod: (session.factorMethod as AuthSessionRecord["factorMethod"]) ?? null,
    pendingTotpSecret: session.pendingTotpSecret,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    expiresAt: session.expiresAt.toISOString()
  };
}

export async function adminUserExists(userId: string) {
  const user = await prisma.adminUser.findUnique({
    where: {
      id: userId
    },
    select: {
      id: true
    }
  });

  return Boolean(user);
}

export async function sessionExists(sessionId: string) {
  const session = await prisma.authSession.findUnique({
    where: {
      id: sessionId
    },
    select: {
      id: true
    }
  });

  return Boolean(session);
}

export async function readAdminUser(username: string) {
  const existing = await prisma.adminUser.findUnique({
    where: {
      id: ADMIN_USER_ID
    }
  });

  if (!existing) {
    const created = createEmptyAdminUser(username);

    await writeAdminUser(created);

    return created;
  }

  if (existing.username !== username) {
    const updated = await prisma.adminUser.update({
      where: {
        id: ADMIN_USER_ID
      },
      data: {
        username,
        updatedAt: new Date()
      }
    });

    return toAdminUserRecord(updated);
  }

  return toAdminUserRecord(existing);
}

export async function writeAdminUser(user: AdminUserRecord) {
  await prisma.adminUser.upsert({
    where: {
      id: user.id
    },
    create: {
      id: user.id,
      username: user.username,
      totpMethod: user.totp.method,
      totpEncryptedSecret: user.totp.encryptedSecret,
      totpEnrolledAt: user.totp.enrolledAt ? toDate(user.totp.enrolledAt) : null,
      createdAt: toDate(user.createdAt),
      updatedAt: toDate(user.updatedAt)
    },
    update: {
      username: user.username,
      totpMethod: user.totp.method,
      totpEncryptedSecret: user.totp.encryptedSecret,
      totpEnrolledAt: user.totp.enrolledAt ? toDate(user.totp.enrolledAt) : null,
      createdAt: toDate(user.createdAt),
      updatedAt: toDate(user.updatedAt)
    }
  });
}

export async function writeSession(session: AuthSessionRecord) {
  await prisma.authSession.upsert({
    where: {
      id: session.id
    },
    create: {
      id: session.id,
      userId: session.userId,
      username: session.username,
      stage: session.stage,
      factorMethod: session.factorMethod,
      pendingTotpSecret: session.pendingTotpSecret,
      createdAt: toDate(session.createdAt),
      updatedAt: toDate(session.updatedAt),
      expiresAt: toDate(session.expiresAt)
    },
    update: {
      userId: session.userId,
      username: session.username,
      stage: session.stage,
      factorMethod: session.factorMethod,
      pendingTotpSecret: session.pendingTotpSecret,
      createdAt: toDate(session.createdAt),
      updatedAt: toDate(session.updatedAt),
      expiresAt: toDate(session.expiresAt)
    }
  });
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
  const session = await prisma.authSession.findUnique({
    where: {
      id: sessionId
    }
  });

  return session ? toSessionRecord(session) : null;
}

export async function deleteSession(sessionId: string) {
  await prisma.authSession.deleteMany({
    where: {
      id: sessionId
    }
  });
}

export async function pruneExpiredSessions() {
  await prisma.authSession.deleteMany({
    where: {
      expiresAt: {
        lte: new Date()
      }
    }
  });
}
