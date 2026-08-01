export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { deletePost, getPost, updatePost } from "@/lib/db/queries";
import { assertTransition, isDeletable } from "@/lib/posts/state-machine";
import type { PostStatus } from "@/lib/types";

const STATUSES = [
  "draft",
  "generating",
  "needs_review",
  "approved",
  "rejected",
  "publishing",
  "published",
  "failed",
] as const;

const PatchPostSchema = z.object({
  status: z.enum(STATUSES).optional(),
  caption: z.string().trim().max(2200).optional(),
  hashtags: z.array(z.string().trim().min(1).max(50)).max(30).optional(),
  scheduledFor: z.string().datetime().nullish(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }
  const { id } = await params;
  const post = await getPost(id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ post });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }

  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = PatchPostSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data pembaruan post tidak valid", issues: parsed.error.issues }, { status: 400 });
  }

  const existing = await getPost(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.status) {
    try {
      assertTransition(existing.status as PostStatus, parsed.data.status);
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Transisi status tidak valid" }, { status: 409 });
    }
  }

  const { scheduledFor, ...rest } = parsed.data;
  const [post] = await updatePost(id, {
    ...rest,
    ...(scheduledFor !== undefined ? { scheduledFor: scheduledFor ? new Date(scheduledFor) : null } : {}),
  });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ post });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getPost(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isDeletable(existing.status as PostStatus)) {
    return NextResponse.json(
      { error: "Hanya draf atau post yang ditolak yang bisa dihapus" },
      { status: 409 },
    );
  }

  await deletePost(id);
  return NextResponse.json({ ok: true });
}
