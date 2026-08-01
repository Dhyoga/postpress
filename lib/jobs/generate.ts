import { getPost, replaceSlides, updatePost } from "@/lib/db/queries";
import { generateCopy, CopywriterFailedError, slideSkeleton } from "@/lib/llm/copywriter";
import { renderJpeg } from "@/lib/render/render";
import { uploadSlideJpeg, slideObjectKey } from "@/lib/storage/r2";
import type { Theme } from "@/lib/llm/schemas/plan";
import type { Copy } from "@/lib/llm/schemas/copy";
import type { PostType, TemplateId } from "@/lib/types";

/**
 * topik -> copy -> render -> JPEG di R2 (Fase 3, roadmap.md). Dipanggil baik
 * dari tombol "Generate sekarang" (Fase 5) maupun job `generate:daily` (Fase 5)
 * — satu jalur untuk keduanya, sama seperti aturan Excel/manual di Persona.
 */
export async function generatePostContent(postId: string, angle?: string): Promise<void> {
  const post = await getPost(postId);
  if (!post) throw new Error(`Post ${postId} tidak ditemukan`);

  await updatePost(postId, { status: "generating" });

  const theme: Theme = {
    date: (post.scheduledFor ?? post.createdAt).toISOString().slice(0, 10),
    topic: post.topic,
    angle: angle ?? post.topic,
    type: post.type as PostType,
    template: post.template as TemplateId,
  };

  let copy: Copy;
  try {
    copy = await generateCopy(post.accountId, theme);
  } catch (err) {
    const message = err instanceof CopywriterFailedError ? err.message : "Gagal membuat konten. Coba generate ulang.";
    await updatePost(postId, { status: "failed", errorMessage: message });
    return;
  }

  const skeleton = slideSkeleton(theme);
  const slideRows = [];
  for (let i = 0; i < copy.slides.length; i += 1) {
    const slide = copy.slides[i];
    const { kind: _kind, ...content } = slide;
    const jpeg = await renderJpeg(skeleton[i], content);
    const imageUrl = await uploadSlideJpeg(slideObjectKey(postId, i + 1), jpeg);
    slideRows.push({ postId, position: i + 1, kind: slide.kind, content, imageUrl });
  }

  await replaceSlides(postId, slideRows);
  await updatePost(postId, {
    caption: copy.caption,
    hashtags: copy.hashtags,
    status: "needs_review",
    errorMessage: null,
  });
}
