import "server-only";

import {cookies} from "next/headers";

import {getPreauthTtlMs, getSessionTtlMs} from "@/lib/auth/config";
import {signValue} from "@/lib/auth/crypto";
import {createSession, deleteSession, pruneExpiredSessions, readSession, writeSession} from "@/lib/auth/storage";
import type {AuthSessionRecord, AuthSessionStage, SessionCookiePayload} from "@/lib/auth/types";

export const ADMIN_SESSION_COOKIE = "vvv_admin_session";

type CookieOptions = {
  expires: Date;
};

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function parseSessionCookie(value: string | undefined | null) {
  if (!value) {
    return null;
  }

  const [encodedPayload, signature] = value.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  if (signValue(encodedPayload) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as SessionCookiePayload;

    if (
      payload.v !== 1 ||
      !payload.sid ||
      !payload.stage ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    if (payload.exp <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function createSessionCookieValue(payload: SessionCookiePayload) {
  const encodedPayload = toBase64Url(JSON.stringify(payload));

  return `${encodedPayload}.${signValue(encodedPayload)}`;
}

function buildCookieOptions(expiresAt: string): CookieOptions {
  return {
    expires: new Date(expiresAt)
  };
}

export async function createAuthSession(values: {
  userId: string;
  username: string;
  stage: AuthSessionStage;
  factorMethod: AuthSessionRecord["factorMethod"];
  pendingTotpSecret?: string | null;
}) {
  await pruneExpiredSessions();

  const ttlMs =
    values.stage === "authenticated" ? getSessionTtlMs() : getPreauthTtlMs();
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  const session = await createSession({
    userId: values.userId,
    username: values.username,
    stage: values.stage,
    factorMethod: values.factorMethod,
    pendingTotpSecret: values.pendingTotpSecret ?? null,
    expiresAt
  });

  return {
    session,
    cookieValue: createSessionCookieValue({
      sid: session.id,
      stage: session.stage,
      exp: Date.parse(session.expiresAt),
      v: 1
    }),
    cookieOptions: buildCookieOptions(session.expiresAt)
  };
}

export async function readSessionFromCookieValue(cookieValue: string | undefined | null) {
  await pruneExpiredSessions();
  const payload = parseSessionCookie(cookieValue);

  if (!payload) {
    return null;
  }

  const session = await readSession(payload.sid);

  if (!session) {
    return null;
  }

  const expiresAt = Date.parse(session.expiresAt);

  if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
    await deleteSession(session.id);

    return null;
  }

  if (session.stage !== payload.stage || expiresAt !== payload.exp) {
    return null;
  }

  return session;
}

export async function readCurrentSession() {
  const cookieStore = await cookies();

  return readSessionFromCookieValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value ?? null);
}

export async function rotateSession(
  currentSessionId: string,
  values: {
    userId: string;
    username: string;
    stage: AuthSessionStage;
    factorMethod: AuthSessionRecord["factorMethod"];
    pendingTotpSecret?: string | null;
  }
) {
  await deleteSession(currentSessionId);

  return createAuthSession(values);
}

export async function updatePendingTotpSecret(session: AuthSessionRecord, pendingTotpSecret: string) {
  const updatedSession: AuthSessionRecord = {
    ...session,
    pendingTotpSecret,
    updatedAt: new Date().toISOString()
  };

  await writeSession(updatedSession);

  return updatedSession;
}

export async function invalidateSession(cookieValue: string | undefined | null) {
  const payload = parseSessionCookie(cookieValue);

  if (payload) {
    await deleteSession(payload.sid);
  }
}
