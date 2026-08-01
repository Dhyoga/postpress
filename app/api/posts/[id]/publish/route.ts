export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getPost } from "@/lib/db/queries";
import { attemptPublish, PublishBlockedError } from "@/lib/instagram/publish";

/** Alur "Publish sekarang" — satu jalur dengan job `publish:hourly`
 * (attemptPublish, lihat lib/instagram/publish.ts), cuma dipicu manual tanpa
 * menunggu scheduledFor/cron. Kegagalan publish sungguhan (mis. Graph API
 * error) sudah ditangani & disimpan sebagai status "failed" oleh
 * attemptPublish sendiri — di sini cuma jaga-jaga status awal & guard error. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getPost(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "approved" && existing.status !== "failed") {
    return NextResponse.json(
      { error: "Hanya post berstatus disetujui (atau gagal, untuk dicoba lagi) yang bisa dipublish" },
      { status: 409 },
    );
  }

  let result;
  try {
    result = await attemptPublish(id, 1);
  } catch (err) {
    const message = err instanceof PublishBlockedError ? err.message : "Gagal menjalankan proses publish";
    return NextResponse.json({ error: message, ok: false }, { status: 409 });
  }

  // attemptPublish menangkap kegagalan publish sungguhan sendiri (mis. Graph
  // API menolak) dan tidak throw — cuma balikin { ok:false }. Kalau di sini
  // selalu balas 200 tanpa cek `result.ok`, caller (PostsProvider.publishNow)
  // tidak akan pernah tahu publish-nya sebenarnya gagal.
  const post = await getPost(id);
  return NextResponse.json({ post, ok: result.ok, error: result.error });
}
