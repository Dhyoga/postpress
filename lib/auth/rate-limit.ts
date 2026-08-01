const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

interface Bucket {
  count: number;
  windowStart: number;
}

/** Limiter dalam memori per-proses. Cukup untuk deployment single-instance;
 * kalau app dijalankan multi-instance, pindahkan ke tabel/Redis bersama. */
const attempts = new Map<string, Bucket>();

export function isLoginRateLimited(username: string): boolean {
  const bucket = attempts.get(username);
  if (!bucket) return false;
  if (Date.now() - bucket.windowStart > WINDOW_MS) {
    attempts.delete(username);
    return false;
  }
  return bucket.count >= MAX_ATTEMPTS;
}

export function recordLoginAttempt(username: string): void {
  const now = Date.now();
  const bucket = attempts.get(username);
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    attempts.set(username, { count: 1, windowStart: now });
    return;
  }
  bucket.count += 1;
}

export function clearLoginAttempts(username: string): void {
  attempts.delete(username);
}
