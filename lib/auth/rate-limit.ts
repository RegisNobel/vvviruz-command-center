import "server-only";

type AttemptState = {
  count: number;
  blockedUntil: number;
  lastAttemptAt: number;
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const BASE_BLOCK_MS = 5 * 60 * 1000;
const attempts = new Map<string, AttemptState>();

function getAttemptState(key: string) {
  const now = Date.now();
  const current = attempts.get(key);

  if (!current) {
    return null;
  }

  if (current.lastAttemptAt + WINDOW_MS < now && current.blockedUntil < now) {
    attempts.delete(key);

    return null;
  }

  return current;
}

export function getThrottleState(key: string) {
  const current = getAttemptState(key);

  if (!current) {
    return {blocked: false, retryAfterMs: 0};
  }

  const now = Date.now();

  if (current.blockedUntil > now) {
    return {blocked: true, retryAfterMs: current.blockedUntil - now};
  }

  return {blocked: false, retryAfterMs: 0};
}

export function recordFailure(key: string) {
  const now = Date.now();
  const current = getAttemptState(key) ?? {
    count: 0,
    blockedUntil: 0,
    lastAttemptAt: now
  };

  current.count += 1;
  current.lastAttemptAt = now;

  if (current.count >= MAX_ATTEMPTS) {
    const multiplier = Math.max(1, current.count - MAX_ATTEMPTS + 1);
    current.blockedUntil = now + BASE_BLOCK_MS * multiplier;
  }

  attempts.set(key, current);
}

export function clearFailures(key: string) {
  attempts.delete(key);
}
