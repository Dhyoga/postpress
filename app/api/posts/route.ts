export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { listPosts, createPost, getOrCreateDefaultAccount, logPostEvent } from "@/lib/db/queries";
import { TEMPLATE_IDS as REGISTRY_TEMPLATE_IDS } from "@/lib/render/registry";
import { toPostView } from "@/lib/posts/view";

const TEMPLATE_IDS = REGISTRY_TEMPLATE_IDS as [string, ...string[]];

const CreatePostSchema = z.object({
  accountId: z.string().uuid().optional(),
  planId: z.string().uuid().nullish(),
  type: z.enum(["single", "carousel"]),
  template: z.enum(TEMPLATE_IDS),
  topic: z.string().trim().min(1).max(300),
  scheduledFor: z.string().datetime().nullish(),
});

export async function GET(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId") || undefined;
  const status = searchParams.get("status") || undefined;
  const limit = Number(searchParams.get("limit") || 50);
  const rows = await listPosts({ accountId, status, limit });
  return NextResponse.json({ posts: rows.map(toPostView) });
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = CreatePostSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data post tidak valid", issues: parsed.error.issues }, { status: 400 });
  }

  const { scheduledFor, accountId, ...rest } = parsed.data;
  const account = accountId ? { id: accountId } : await getOrCreateDefaultAccount();
  const row = await createPost({
    ...rest,
    accountId: account.id,
    status: "draft",
    scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
  });
  await logPostEvent(row[0].id, "Masuk ke antrean sebagai draf");
  return NextResponse.json({ post: row[0] }, { status: 201 });
}
