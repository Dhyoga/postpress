import type { NextRequest } from "next/server";

/** Endpoint cron dilindungi header rahasia, bukan sesi (design.md §9, agents.md).
 * Middleware.ts sudah membiarkan `/api/cron/*` lewat tanpa cookie sesi — jadi
 * tiap route handler di sini WAJIB memanggil ini sendiri. */
export function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}
