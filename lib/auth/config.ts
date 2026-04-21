import "server-only";

const DEFAULT_SESSION_TTL_HOURS = 12;
const DEFAULT_PREAUTH_TTL_MINUTES = 10;
const DEFAULT_TOTP_ISSUER = "vvviruz Command Center";

function readRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required for admin auth.`);
  }

  return value;
}

function readPositiveNumber(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getAuthSecret() {
  const secret = readRequiredEnv("AUTH_SECRET");

  if (secret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters long.");
  }

  return secret;
}

export function getAdminUsername() {
  return readRequiredEnv("ADMIN_USERNAME");
}

export function getAdminPasswordHash() {
  return readRequiredEnv("ADMIN_PASSWORD_HASH");
}

export function getSessionTtlMs() {
  return readPositiveNumber(process.env.ADMIN_SESSION_TTL_HOURS, DEFAULT_SESSION_TTL_HOURS) *
    60 *
    60 *
    1000;
}

export function getPreauthTtlMs() {
  return readPositiveNumber(
    process.env.ADMIN_PREAUTH_TTL_MINUTES,
    DEFAULT_PREAUTH_TTL_MINUTES
  ) *
    60 *
    1000;
}

export function getTotpIssuer() {
  return process.env.ADMIN_TOTP_ISSUER?.trim() || DEFAULT_TOTP_ISSUER;
}
