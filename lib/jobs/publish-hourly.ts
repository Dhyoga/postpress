import { and, eq, lte, or } from "drizzle-orm";
import { db } from "@/lib/db/index";
import { posts } from "@/lib/db/schema";
import { getLastPublishAttempt } from "@/lib/db/queries";
import { attemptPublish } from "@/lib/instagram/publish";
import { nextRetryAt } from "@/lib/instagram/retry";
import { notifyJobFailure } from "./notify";

interface ClaimedPost {
  id: string;
  attempt: number;
}

/**
 * Klaim baris `approved` yang jadwalnya sudah lewat, plus `failed` yang masih
 * di jendela retry (1/5/25 menit — lihat lib/instagram/retry.ts), sambil
 * mengunci baris (`FOR UPDATE SKIP LOCKED`) supaya dua invocation
 * `publish:hourly` yang tumpang tindih tidak pernah mem-publish post yang
 * sama dua kali (design.md §10).
 */
async function claimDuePosts(limit = 20): Promise<ClaimedPost[]> {
  return db.transaction(async (tx) => {
    const candidates = await tx
      .select({ id: posts.id, status: posts.status })
      .from(posts)
      .where(or(and(eq(posts.status, "approved"), lte(posts.scheduledFor, new Date())), eq(posts.status, "failed")))
      .limit(limit)
      .for("update", { skipLocked: true });

    const claimed: ClaimedPost[] = [];
    for (const row of candidates) {
      let attempt = 1;
      if (row.status === "failed") {
        const last = await getLastPublishAttempt(row.id);
        if (!last) continue; // gagal sebelum sempat coba publish sama sekali (mis. render gagal) — bukan urusan job ini
        const retryAt = nextRetryAt(last.attempt, last.createdAt);
        if (!retryAt || retryAt > new Date()) continue; // belum waktunya, atau jatah retry sudah habis
        attempt = last.attempt + 1;
      }

      await tx.update(posts).set({ status: "publishing", updatedAt: new Date() }).where(eq(posts.id, row.id));
      claimed.push({ id: row.id, attempt });
    }

    return claimed;
  });
}

export interface PublishHourlyResult {
  postId: string;
  ok: boolean;
  retryable?: boolean;
  error?: string;
}

/** `publish:hourly` (design.md §10) — publish semua post yang jadwalnya sudah
 * lewat, plus retry post `failed` yang masih boleh dicoba lagi. */
export async function runPublishHourly(): Promise<PublishHourlyResult[]> {
  const claimed = await claimDuePosts();
  const results: PublishHourlyResult[] = [];

  for (const { id, attempt } of claimed) {
    const result = await attemptPublish(id, attempt);
    results.push({ postId: id, ok: result.ok, retryable: result.retryable, error: result.error });
    if (!result.ok) {
      await notifyJobFailure(
        "publish:hourly",
        `Post ${id} gagal publish (percobaan ${attempt}, retryable: ${result.retryable}): ${result.error}`,
      );
    }
  }

  return results;
}
