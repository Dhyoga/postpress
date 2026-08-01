import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

// Middleware jalan di Edge runtime, yang tidak mendukung driver Postgres
// (butuh net/tls socket) — jadi di sini hanya gerbang cepat berbasis keberadaan
// cookie. Validasi sesi sungguhan (kedaluwarsa, dicabut) tetap dilakukan lewat
// requireUser()/getSessionUser() di layout dashboard dan tiap route handler,
// yang jalan di Node runtime dan bisa query DB.
//
// /api/auth/* dipakai untuk login/logout/cek sesi itu sendiri, jadi tidak boleh
// mensyaratkan cookie. /api/cron/* dilindungi CRON_SECRET, bukan sesi.
const PUBLIC_API_PREFIXES = ["/api/auth/", "/api/cron/"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const hasSessionCookie = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (hasSessionCookie) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
