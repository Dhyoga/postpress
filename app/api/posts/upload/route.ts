export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import {
  createPost,
  deletePost,
  getOrCreateDefaultAccount,
  getPost,
  logPostEvent,
  replaceSlides,
} from "@/lib/db/queries";
import { toPostView } from "@/lib/posts/view";
import { ManualUploadValidationError, MAX_IMAGES, validateAndNormalizeImage } from "@/lib/posts/manual-upload";
import { slideObjectKey, uploadSlideJpeg } from "@/lib/storage/r2";
import type { PostType } from "@/lib/types";

const CreateManualPostSchema = z.object({
  accountId: z.string().uuid().optional(),
  planId: z.string().uuid().nullish(),
  caption: z.string().trim().max(2200).optional().default(""),
  hashtags: z.array(z.string().trim().min(1).max(50)).max(30).optional().default([]),
  scheduledFor: z.string().datetime().nullish(),
});

function fallbackTopic(caption: string): string {
  const trimmed = caption.trim();
  return trimmed ? trimmed.slice(0, 300) : "Unggahan manual";
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Data upload tidak valid" }, { status: 400 });
  }

  const files = form.getAll("images").filter((v): v is File => v instanceof File && v.size > 0);
  if (files.length === 0) {
    return NextResponse.json({ error: "Unggah minimal satu gambar" }, { status: 400 });
  }
  if (files.length > MAX_IMAGES) {
    return NextResponse.json({ error: `Maksimal ${MAX_IMAGES} gambar per post` }, { status: 400 });
  }

  let hashtags: string[] = [];
  const hashtagsRaw = form.get("hashtags");
  if (typeof hashtagsRaw === "string" && hashtagsRaw.length > 0) {
    try {
      const parsed = JSON.parse(hashtagsRaw);
      if (Array.isArray(parsed)) hashtags = parsed;
    } catch {
      return NextResponse.json({ error: "Format hashtag tidak valid" }, { status: 400 });
    }
  }

  const parsed = CreateManualPostSchema.safeParse({
    accountId: form.get("accountId") || undefined,
    planId: form.get("planId") || undefined,
    caption: form.get("caption") ?? "",
    hashtags,
    scheduledFor: form.get("scheduledFor") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Data post tidak valid", issues: parsed.error.issues }, { status: 400 });
  }

  // Validasi & normalisasi SEMUA gambar dulu, sebelum menyentuh DB/R2 sama
  // sekali (design.md §Risks) — kalau satu gagal, tidak ada post/slide yang
  // tercipta setengah jalan.
  const normalized: Buffer[] = [];
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      normalized.push(await validateAndNormalizeImage(file.name || `gambar ke-${i + 1}`, buffer));
    } catch (err) {
      const message = err instanceof ManualUploadValidationError ? err.message : "Gagal memvalidasi gambar";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const { scheduledFor, accountId, planId, caption, hashtags: tags } = parsed.data;
  const account = accountId ? { id: accountId } : await getOrCreateDefaultAccount();
  const type: PostType = normalized.length > 1 ? "carousel" : "single";

  const [post] = await createPost({
    accountId: account.id,
    planId: planId ?? null,
    type,
    template: "manual",
    topic: fallbackTopic(caption),
    caption: caption || null,
    hashtags: tags,
    status: "needs_review",
    scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
  });

  try {
    const slideRows = await Promise.all(
      normalized.map(async (jpeg, i) => {
        const position = i + 1;
        const imageUrl = await uploadSlideJpeg(slideObjectKey(post.id, position), jpeg);
        return { postId: post.id, position, kind: "upload" as const, content: {}, imageUrl };
      }),
    );
    await replaceSlides(post.id, slideRows);
  } catch (err) {
    await deletePost(post.id);
    const message = err instanceof Error ? err.message : "Gagal mengunggah gambar";
    return NextResponse.json({ error: `Gagal menyimpan gambar: ${message}` }, { status: 502 });
  }

  await logPostEvent(post.id, "Diunggah manual, menunggu review");
  const fresh = await getPost(post.id);
  if (!fresh) return NextResponse.json({ error: "Post tidak ditemukan setelah dibuat" }, { status: 500 });
  return NextResponse.json({ post: toPostView(fresh) }, { status: 201 });
}
