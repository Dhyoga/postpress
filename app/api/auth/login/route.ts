export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { loginUser, RateLimitedError } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body request tidak valid" }, { status: 400 });
  }

  const { username, password } = body as { username?: string; password?: string };
  if (!username || !password) {
    return NextResponse.json({ error: "Username dan password wajib diisi" }, { status: 400 });
  }

  try {
    const user = await loginUser(username, password, req.headers.get("user-agent") || undefined);
    return NextResponse.json({ user }, { status: 200 });
  } catch (err) {
    if (err instanceof RateLimitedError) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit." },
        { status: 429 },
      );
    }
    return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
  }
}
