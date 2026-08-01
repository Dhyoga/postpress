import { GraphApiError } from "./errors";

/** design.md §8.6 — exponential backoff, maksimal 3 percobaan: 1, 5, 25 menit. */
export const RETRY_BACKOFF_MINUTES = [1, 5, 25];

/** Error autentikasi (kode 190) tidak pernah di-retry — percuma dan bisa
 * memperburuk status akun (design.md §8.6). Error lain (network, 5xx, kuota)
 * boleh dicoba lagi selama masih di bawah batas percobaan. */
export function isRetryableError(err: unknown): boolean {
  if (err instanceof GraphApiError) return !err.isAuthError;
  return true;
}

/** `attempt` = percobaan yang baru saja gagal (1-indexed). Mengembalikan
 * kapan percobaan berikutnya boleh dijalankan, atau `null` kalau sudah
 * melewati batas 3 percobaan. */
export function nextRetryAt(attempt: number, from: Date = new Date()): Date | null {
  const minutes = RETRY_BACKOFF_MINUTES[attempt - 1];
  if (minutes === undefined) return null;
  return new Date(from.getTime() + minutes * 60_000);
}

export function hasRetriesLeft(attempt: number): boolean {
  return attempt < RETRY_BACKOFF_MINUTES.length;
}
