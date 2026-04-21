import "server-only";

import {createHmac, randomBytes, timingSafeEqual} from "node:crypto";

import {getTotpIssuer} from "@/lib/auth/config";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;

function encodeBase32(bytes: Uint8Array) {
  let output = "";
  let buffer = 0;
  let bits = 0;

  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(buffer << (5 - bits)) & 31];
  }

  return output;
}

function decodeBase32(value: string) {
  const normalized = value.replace(/\s+/g, "").toUpperCase();
  let buffer = 0;
  let bits = 0;
  const output: number[] = [];

  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);

    if (index === -1) {
      throw new Error("Invalid base32 secret.");
    }

    buffer = (buffer << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((buffer >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

function normalizeCode(code: string) {
  return code.replace(/\s+/g, "").replace(/-/g, "");
}

function generateTotpCode(secret: string, counter: number) {
  const key = decodeBase32(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac("sha1", key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binaryCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (binaryCode % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, "0");
}

export function generateTotpSecret() {
  return encodeBase32(randomBytes(20));
}

export function createTotpEnrollment(secret: string, username: string) {
  const issuer = getTotpIssuer();
  const label = encodeURIComponent(`${issuer}:${username}`);
  const otpauthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(
    issuer
  )}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SECONDS}`;

  return {
    issuer,
    secret,
    otpauthUrl
  };
}

export function verifyTotpCode(secret: string, code: string, now = Date.now()) {
  const normalizedCode = normalizeCode(code);

  if (!/^\d{6}$/.test(normalizedCode)) {
    return false;
  }

  const currentCounter = Math.floor(now / 1000 / TOTP_PERIOD_SECONDS);

  for (let windowOffset = -1; windowOffset <= 1; windowOffset += 1) {
    const expectedCode = generateTotpCode(secret, currentCounter + windowOffset);

    if (
      timingSafeEqual(Buffer.from(normalizedCode), Buffer.from(expectedCode))
    ) {
      return true;
    }
  }

  return false;
}
