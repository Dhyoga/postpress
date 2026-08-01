import { cookies } from "next/headers";
import { getSessionById, deleteSessionById } from "@/lib/db/queries";
import { SESSION_COOKIE } from "@/lib/auth/constants";

export { SESSION_COOKIE };

export interface SessionUser {
  id: string;
  username: string;
  role: string;
}

/** Satu-satunya tempat yang membaca cookie sesi, mengecek relasi user, dan
 * mencabut sesi kedaluwarsa. Dipakai oleh lib/auth/index.ts, middleware.ts,
 * dan route handler yang butuh user saat ini. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const session = await getSessionById(sessionId);
  if (!session || session.expiresAt < new Date()) {
    if (session) await deleteSessionById(sessionId);
    return null;
  }
  return { id: session.user.id, username: session.user.username, role: session.user.role };
}

/** Dipakai oleh route handler /api/auth/session. */
export async function getCurrentUserFromRequest(): Promise<SessionUser | null> {
  return getSessionUser();
}
