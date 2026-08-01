export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db/index";
import { eq, sql } from "drizzle-orm";
import { posts } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }

  const total = await db.select({ count: sql<number>`count(*)` }).from(posts);
  const approved = await db.select({ count: sql<number>`count(*)` }).from(posts).where(eq(posts.status, "approved"));
  const published = await db.select({ count: sql<number>`count(*)` }).from(posts).where(eq(posts.status, "published"));

  const stats = [
    { label: "Total post", value: String(total[0]?.count ?? 0), meta: "Semua status" },
    { label: "Siap publish", value: String(approved[0]?.count ?? 0), meta: "Disetujui" },
    { label: "Terbit", value: String(published[0]?.count ?? 0), meta: "Berhasil" },
  ];

  return NextResponse.json({ stats });
}
