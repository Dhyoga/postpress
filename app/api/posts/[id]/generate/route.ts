export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getPost } from "@/lib/db/queries";
import { generatePostContent } from "@/lib/jobs/generate";

/** Alur "Generate sekarang" (Fase 3 + tombol regenerate Fase 5) — satu jalur
 * dipakai baik dari tombol manual maupun (nanti) job `generate:daily`. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getPost(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "publishing" || existing.status === "published") {
    return NextResponse.json({ error: "Post ini sudah terbit atau sedang terbit, tidak bisa digenerate ulang" }, { status: 409 });
  }

  try {
    await generatePostContent(id);
  } catch {
    return NextResponse.json({ error: "Gagal menjalankan proses generate" }, { status: 500 });
  }

  const post = await getPost(id);
  return NextResponse.json({ post });
}
