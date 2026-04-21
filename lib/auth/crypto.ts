import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual
} from "node:crypto";
import {promisify} from "node:util";

import {getAuthSecret} from "@/lib/auth/config";

const scrypt = promisify(scryptCallback);
const PASSWORD_HASH_PREFIX = "scrypt";
const AES_ALGORITHM = "aes-256-gcm";

function deriveScopedKey(scope: string) {
  return createHash("sha256")
    .update(`${getAuthSecret()}:${scope}`, "utf8")
    .digest();
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;

  return `${PASSWORD_HASH_PREFIX}$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [prefix, salt, expectedHex] = storedHash.split("$");

  if (prefix !== PASSWORD_HASH_PREFIX || !salt || !expectedHex) {
    return false;
  }

  const expected = Buffer.from(expectedHex, "hex");
  const derivedKey = (await scrypt(password, salt, expected.length)) as Buffer;

  if (derivedKey.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, expected);
}

export function signValue(value: string) {
  return createHmac("sha256", deriveScopedKey("session-cookie"))
    .update(value, "utf8")
    .digest("base64url");
}

export function encryptSecret(plaintext: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(AES_ALGORITHM, deriveScopedKey("totp-secret"), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return `enc$${iv.toString("base64url")}$${tag.toString("base64url")}$${ciphertext.toString(
    "base64url"
  )}`;
}

export function decryptSecret(payload: string) {
  const [prefix, ivEncoded, tagEncoded, ciphertextEncoded] = payload.split("$");

  if (prefix !== "enc" || !ivEncoded || !tagEncoded || !ciphertextEncoded) {
    throw new Error("Invalid encrypted secret.");
  }

  const decipher = createDecipheriv(
    AES_ALGORITHM,
    deriveScopedKey("totp-secret"),
    Buffer.from(ivEncoded, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, "base64url")),
    decipher.final()
  ]).toString("utf8");
}
