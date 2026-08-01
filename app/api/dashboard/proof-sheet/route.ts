export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db/index";
import { eq, desc, sql } from "drizzle-orm";
import { posts } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import type { ProofSlideContent } from "@/lib/mock/proof-sheet";

export async function GET() {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }

  const totalPosts = await db.select({ count: sql<number>`count(*)` }).from(posts);
  const approved = await db.select({ count: sql<number>`count(*)` }).from(posts).where(eq(posts.status, "approved"));
  const failed = await db.select({ count: sql<number>`count(*)` }).from(posts).where(eq(posts.status, "failed"));

  const stats = [
    { label: "Post bulan ini", value: String(totalPosts[0]?.count ?? 0), meta: "Semua akun" },
    { label: "Menunggu approval", value: String(approved[0]?.count ?? 0), meta: "Siap publish" },
    { label: "Gagal terbit", value: String(failed[0]?.count ?? 0), meta: "Perlu perhatian" },
  ];

  // Proof sheet menampilkan post yang PALING butuh perhatian manusia dulu:
  // needs_review (belum diputuskan) sebelum approved (sudah oke, tinggal jadwal).
  const featured =
    (await db.query.posts.findFirst({
      where: eq(posts.status, "needs_review"),
      orderBy: [desc(posts.createdAt)],
      with: { slides: true },
    })) ??
    (await db.query.posts.findFirst({
      where: eq(posts.status, "approved"),
      orderBy: [desc(posts.createdAt)],
      with: { slides: true },
    }));

  let proofSlides: ProofSlideContent[] = [];
  if (featured?.slides?.length) {
    proofSlides = featured.slides
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((s) => {
        const content = (s.content as Record<string, string>) ?? {};
        return {
          kind: s.kind as ProofSlideContent["kind"],
          kicker: content.eyebrow ?? content.index ?? "",
          heading: content.title ?? content.heading ?? "",
          body: content.subtitle ?? content.body ?? "",
          imageUrl: s.imageUrl,
        };
      });
  }

  const payload = {
    stats,
    post: featured
      ? {
          id: featured.id,
          topic: featured.topic,
          status: featured.status,
          template: featured.template,
          date: featured.scheduledFor ? new Date(featured.scheduledFor).toISOString().slice(0, 10) : null,
          time: featured.scheduledFor ? new Date(featured.scheduledFor).toISOString().slice(11, 16) : null,
          caption: featured.caption,
          tags: featured.hashtags?.join(" ") ?? "",
          type: featured.type,
        }
      : null,
    slides: proofSlides,
  };

  return NextResponse.json(payload);
}
