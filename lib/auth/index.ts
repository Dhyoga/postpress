import { cookies } from "next/headers";
import { createSession, getUserByUsername, updateUserLastLogin, deleteSessionById, createUser } from "@/lib/db/queries";
import { compare, hash } from "bcrypt";
import { z } from "zod";
import { SESSION_COOKIE, getSessionUser, type SessionUser } from "@/lib/auth/session";
import { isLoginRateLimited, recordLoginAttempt, clearLoginAttempts } from "@/lib/auth/rate-limit";

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// Hash bcrypt valid tapi tidak cocok dengan password apa pun — dipakai supaya
// bcrypt.compare tetap dijalankan (dan makan waktu yang sama) saat username tidak ditemukan.
const DUMMY_HASH = "$2b$12$maBG.V7kr4JK0QOqE94QeuERYdLdsq.V6xTzEP.BwV6Rj3utD4/Um";

export async function getCurrentUser(): Promise<SessionUser | null> {
  return getSessionUser();
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export class RateLimitedError extends Error {
  constructor() {
    super("RATE_LIMITED");
  }
}

export async function loginUser(username: string, password: string, userAgent?: string) {
  const parsed = LoginSchema.safeParse({ username, password });
  if (!parsed.success) throw new Error("INVALID_CREDENTIALS");
  const { username: safeUsername, password: safePassword } = parsed.data;

  if (isLoginRateLimited(safeUsername)) {
    throw new RateLimitedError();
  }

  const user = await getUserByUsername(safeUsername);
  // Selalu jalankan bcrypt.compare, bahkan kalau user tidak ada, supaya waktu respons
  // tidak membocorkan username mana yang valid (timing side-channel).
  const ok = await compare(safePassword, user?.passwordHash ?? DUMMY_HASH);
  if (!ok || !user) {
    recordLoginAttempt(safeUsername);
    throw new Error("INVALID_CREDENTIALS");
  }
  clearLoginAttempts(safeUsername);

  await updateUserLastLogin(user.id);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [session] = await createSession({ userId: user.id, expiresAt, userAgent });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
  return { id: user.id, username: user.username, role: user.role };
}

export async function logoutUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) await deleteSessionById(sessionId);
  cookieStore.delete(SESSION_COOKIE);
  return true;
}

export async function hashPassword(password: string) {
  return hash(password, 12);
}

export async function createUserAccount(username: string, password: string) {
  const passwordHash = await hashPassword(password);
  return createUser({ username, passwordHash });
}
