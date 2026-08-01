import type { PostStatus } from "@/lib/mock/types";

/** Status yang masih dianggap "belum tayang" — ditampilkan di rail badge & Antrean. */
export const QUEUE_STATUSES: PostStatus[] = ["needs_review", "approved", "draft", "generating"];

export const STATUS_LABEL: Record<PostStatus, string> = {
  draft: "Draf",
  generating: "Sedang dibuat",
  needs_review: "Menunggu review",
  approved: "Disetujui",
  rejected: "Ditolak",
  publishing: "Sedang terbit",
  published: "Terbit",
  failed: "Gagal",
};

export const STATUS_CHIP_CLASS: Record<PostStatus, string> = {
  draft: "chip--draft",
  generating: "chip--generating",
  needs_review: "chip--review",
  approved: "chip--approved",
  rejected: "chip--rejected",
  publishing: "chip--publishing",
  published: "chip--live",
  failed: "chip--failed",
};
