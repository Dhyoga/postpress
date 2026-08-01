import { and, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/lib/db/index";
import { posts } from "@/lib/db/schema";
import { IN_FLIGHT_STATUSES } from "@/lib/posts/state-machine";
import { notifyJobFailure } from "./notify";

const STUCK_AFTER_MINUTES = 10;

/**
 * `sweep:stuck` (design.md §10, tiap 15 menit) — job `generating`/`publishing`
 * yang mati di tengah jalan (proses crash tanpa sempat update status) akan
 * diam selamanya kalau tidak ada yang menandainya. `FOR UPDATE SKIP LOCKED`
 * supaya kalau sweeper kebetulan jalan dobel (dua invocation cron tumpang
 * tindih), keduanya tidak berebut baris yang sama.
 */
export async function sweepStuckPosts(): Promise<{ swept: string[] }> {
  const cutoff = new Date(Date.now() - STUCK_AFTER_MINUTES * 60_000);

  const swept = await db.transaction(async (tx) => {
    const stuck = await tx
      .select({ id: posts.id, status: posts.status })
      .from(posts)
      .where(and(inArray(posts.status, IN_FLIGHT_STATUSES), lt(posts.updatedAt, cutoff)))
      .for("update", { skipLocked: true });

    for (const row of stuck) {
      await tx
        .update(posts)
        .set({
          status: "failed",
          errorMessage: `Proses macet di status "${row.status}" lebih dari ${STUCK_AFTER_MINUTES} menit dan dihentikan otomatis. Coba generate/publish ulang.`,
          updatedAt: new Date(),
        })
        .where(eq(posts.id, row.id));
    }

    return stuck.map((r) => r.id);
  });

  if (swept.length > 0) {
    await notifyJobFailure("sweep:stuck", `${swept.length} post ditandai gagal karena macet: ${swept.join(", ")}`);
  }

  return { swept };
}
