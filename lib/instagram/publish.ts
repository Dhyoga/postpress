import { GraphClient, type GraphResult } from "./client";
import { GraphApiError } from "./errors";
import { decryptToken } from "./token-crypto";
import { isRetryableError } from "./retry";
import { getPost, getIgAccount, createPublishLog, updatePost } from "@/lib/db/queries";

export class PublishBlockedError extends Error {}

export interface PublishAttemptResult {
  ok: boolean;
  retryable: boolean;
  error?: string;
  mediaId?: string;
}

interface PublishDeps {
  /** Injeksi klien untuk `publish:dry-run` (Fase 4) dan unit test — supaya
   * tidak pernah memanggil Meta sungguhan di luar publish produksi. */
  client?: GraphClient;
}

async function logPhase(
  postId: string,
  attempt: number,
  phase: "container" | "carousel" | "publish",
  request: Record<string, unknown>,
  result: { ok: true; data: GraphResult<unknown> } | { ok: false; error: unknown },
) {
  await createPublishLog({
    postId,
    attempt,
    phase,
    request,
    response: result.ok ? (result.data.data as Record<string, unknown>) : { error: result.ok ? undefined : String(result.error) },
    ok: result.ok,
  });
}

async function publishSingle(
  client: GraphClient,
  igUserId: string,
  post: { id: string; caption: string | null },
  slide: { imageUrl: string | null },
  attempt: number,
): Promise<string> {
  if (!slide.imageUrl) throw new Error("Slide belum punya URL gambar — render belum selesai");

  let container: GraphResult<{ id: string }>;
  try {
    container = await client.createMediaContainer(igUserId, slide.imageUrl, post.caption ?? undefined);
    await logPhase(post.id, attempt, "container", { imageUrl: slide.imageUrl }, { ok: true, data: container });
  } catch (err) {
    await logPhase(post.id, attempt, "container", { imageUrl: slide.imageUrl }, { ok: false, error: err });
    throw err;
  }

  try {
    const published = await client.publishMedia(igUserId, container.data.id);
    await logPhase(post.id, attempt, "publish", { creationId: container.data.id }, { ok: true, data: published });
    return published.data.id;
  } catch (err) {
    await logPhase(post.id, attempt, "publish", { creationId: container.data.id }, { ok: false, error: err });
    throw err;
  }
}

async function publishCarousel(
  client: GraphClient,
  igUserId: string,
  post: { id: string; caption: string | null },
  slides: Array<{ imageUrl: string | null }>,
  attempt: number,
): Promise<string> {
  const childrenIds: string[] = [];
  for (const slide of slides) {
    if (!slide.imageUrl) throw new Error("Ada slide yang belum punya URL gambar — render belum selesai");
    try {
      const child = await client.createCarouselItem(igUserId, slide.imageUrl);
      await logPhase(post.id, attempt, "container", { imageUrl: slide.imageUrl }, { ok: true, data: child });
      childrenIds.push(child.data.id);
    } catch (err) {
      await logPhase(post.id, attempt, "container", { imageUrl: slide.imageUrl }, { ok: false, error: err });
      throw err;
    }
  }

  let parent: GraphResult<{ id: string }>;
  try {
    parent = await client.createCarouselContainer(igUserId, childrenIds, post.caption ?? undefined);
    await logPhase(post.id, attempt, "carousel", { childrenIds }, { ok: true, data: parent });
  } catch (err) {
    await logPhase(post.id, attempt, "carousel", { childrenIds }, { ok: false, error: err });
    throw err;
  }

  try {
    const published = await client.publishMedia(igUserId, parent.data.id);
    await logPhase(post.id, attempt, "publish", { creationId: parent.data.id }, { ok: true, data: published });
    return published.data.id;
  } catch (err) {
    await logPhase(post.id, attempt, "publish", { creationId: parent.data.id }, { ok: false, error: err });
    throw err;
  }
}

/** design.md §8.4 — baca kuota langsung dari Graph API sebelum publish,
 * jangan percaya angka yang beredar di internet. */
async function checkPublishingLimit(client: GraphClient, igUserId: string, postId: string, attempt: number): Promise<void> {
  const result = await client.getContentPublishingLimit(igUserId);
  await logPhase(postId, attempt, "publish", { check: "content_publishing_limit" }, { ok: true, data: result });
  const usage = result.data.data[0];
  if (usage && usage.quota_usage >= usage.config.quota_total) {
    throw new PublishBlockedError("Kuota publish harian akun ini sudah habis. Coba lagi setelah kuota reset.");
  }
}

/**
 * Menjalankan SATU percobaan publish (single atau carousel) untuk sebuah post
 * `approved`. Penjadwalan retry (1/5/25 menit, kecuali error auth) adalah
 * tanggung jawab pemanggil (cron `publish:hourly`, Fase 5) — fungsi ini cuma
 * melapor apakah percobaan ini boleh diulang lagi nanti.
 */
export async function attemptPublish(postId: string, attempt: number, deps: PublishDeps = {}): Promise<PublishAttemptResult> {
  const post = await getPost(postId);
  if (!post) throw new Error(`Post ${postId} tidak ditemukan`);
  // "publishing" diterima juga karena `publish:hourly` (Fase 5) mengunci dan
  // meng-klaim baris (pindah ke "publishing") di transaksi terpisah sebelum
  // memanggil fungsi ini, supaya klaim antar-invocation cron tidak balapan.
  if (post.status !== "approved" && post.status !== "failed" && post.status !== "publishing") {
    throw new PublishBlockedError("Hanya post berstatus approved (atau failed yang di-retry) yang boleh dipublish");
  }
  if (!post.slides.length) {
    throw new PublishBlockedError("Post belum punya slide yang dirender");
  }

  const account = await getIgAccount(post.accountId);
  if (!account) throw new Error("Akun IG untuk post ini tidak ditemukan");

  await updatePost(postId, { status: "publishing" });
  const sortedSlides = [...post.slides].sort((a, b) => a.position - b.position);

  try {
    // Sengaja di dalam try: token rusak/salah format atau
    // TOKEN_ENCRYPTION_KEY salah harus jatuh ke "failed" seperti kegagalan
    // publish lain, bukan melempar tak tertangani dan meninggalkan post
    // macet selamanya di status "publishing".
    const client = deps.client ?? new GraphClient(decryptToken(account.tokenEncrypted));
    await checkPublishingLimit(client, account.igUserId, postId, attempt);

    const mediaId =
      post.type === "carousel"
        ? await publishCarousel(client, account.igUserId, post, sortedSlides, attempt)
        : await publishSingle(client, account.igUserId, post, sortedSlides[0], attempt);

    await updatePost(postId, { status: "published", publishedAt: new Date(), igMediaId: mediaId, errorMessage: null });
    return { ok: true, retryable: false, mediaId };
  } catch (err) {
    const message =
      err instanceof GraphApiError || err instanceof PublishBlockedError ? err.message : "Gagal publish ke Instagram.";
    const retryable = isRetryableError(err);
    await updatePost(postId, { status: "failed", errorMessage: message });
    return { ok: false, retryable, error: message };
  }
}
