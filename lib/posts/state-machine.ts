import type { PostStatus } from "@/lib/types";

/**
 * Transisi status post yang sah. `draft` adalah satu-satunya status yang boleh
 * diregenerasi maupun dihapus; `published` adalah status akhir (tidak ada jalan balik).
 * Dipakai oleh PATCH /api/posts/[id] dan oleh job (generate/publish) supaya
 * satu tempat ini jadi sumber kebenaran alih-alih dicek ulang di tiap caller.
 */
export const POST_TRANSITIONS: Record<PostStatus, PostStatus[]> = {
  draft: ["generating", "needs_review"],
  generating: ["needs_review", "failed"],
  needs_review: ["approved", "draft", "rejected"],
  approved: ["needs_review", "publishing"],
  rejected: ["draft"],
  publishing: ["published", "failed"],
  published: [],
  failed: ["draft", "publishing"],
};

export function canTransition(from: PostStatus, to: PostStatus): boolean {
  if (from === to) return true;
  return POST_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: PostStatus, to: PostStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Tidak bisa mengubah status dari "${from}" ke "${to}"`);
  }
}

/** Status yang menandakan post sedang "berjalan" — dipakai sweeper Fase 5 untuk
 * mendeteksi job yang macet (mis. proses generate/publish crash tanpa update status). */
export const IN_FLIGHT_STATUSES: PostStatus[] = ["generating", "publishing"];

/** Status yang boleh dihapus lewat DELETE /api/posts/[id] — hanya draft yang
 * belum pernah masuk antrean review, supaya tidak ada riwayat publish yang hilang. */
export function isDeletable(status: PostStatus): boolean {
  return status === "draft" || status === "rejected";
}
